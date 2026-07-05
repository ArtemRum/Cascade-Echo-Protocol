# Hidden Files Bugfix Design

## Overview

The Cascade: Echo Protocol game has a bug where hidden files (starting with '.') cannot be properly deleted or interacted with. This bug affects critical gameplay elements since virus files like `.bloomd`, `.bloom_watchdog`, etc. are hidden files. The bug impacts commands like `rm`, `cat`, `find`, etc. and prevents players from properly detecting and removing virus files. The fix requires addressing path normalization for hidden files, tab completion for hidden files, edge cases with current working directory, and maintaining backwards compatibility for regular files.

## Glossary

- **Bug_Condition (C)**: The condition that triggers the bug - when path resolution, tab completion, or CWD handling fails for hidden files
- **Property (P)**: The desired behavior when hidden files are accessed - they should work identically to regular files
- **Preservation**: Existing behavior for regular (non-hidden) files must remain unchanged by the fix
- **CommandParser._resolvePath**: The function in `js/terminal/CommandParser.js` that resolves relative paths to absolute paths
- **VirtualFS._resolve**: The function in `js/filesystem/VirtualFS.js` that resolves absolute paths within the virtual filesystem
- **current working directory (cwd)**: The current directory context for path resolution
- **path normalization**: The process of resolving `..`, `.`, `//`, and other path components to canonical form

## Bug Details

### Bug Condition

The bug manifests when a user tries to access hidden files with paths that need normalization (containing `..`, `.`, `//`), uses tab completion for hidden files, or when the current working directory is incorrectly a file path. The `CommandParser._resolvePath` function lacks proper path normalization and doesn't handle edge cases correctly for hidden files.

**Formal Specification:**
```
FUNCTION isBugCondition(input)
  INPUT: input of type PathOperation (contains path string, operation type, cwd)
  OUTPUT: boolean
  
  RETURN (input.pathContainsHiddenFile AND input.needsPathNormalization(input.path))
         OR (input.operation = "tabCompletion" AND input.pathContainsHiddenFile)
         OR (input.cwdIsFile AND (input.target = "." OR input.target = ".."))
END FUNCTION
```

### Examples

1. **Path with `..` normalization**: `/usr/lib/../lib/.bloomd` doesn't normalize to `/usr/lib/.bloomd`
   - Expected: Should resolve to `/usr/lib/.bloomd`
   - Actual: Returns `/usr/lib/../lib/.bloomd` (incorrect)

2. **Path with `.` and multiple slashes**: `/usr/lib//./.bloomd` doesn't normalize to `/usr/lib/.bloomd`
   - Expected: Should resolve to `/usr/lib/.bloomd`
   - Actual: Returns `/usr/lib//./.bloomd` (incorrect)

3. **Tab completion for hidden files**: Typing `.bl` and pressing tab doesn't complete to `.bloomd`
   - Expected: Should suggest `.bloomd` as completion
   - Actual: No completion suggestions for hidden files

4. **CWD as file path**: When cwd is `/usr/lib/.bloomd`, `..` doesn't resolve to `/usr/lib`
   - Expected: `..` should resolve to parent directory `/usr/lib`
   - Actual: Incorrect path resolution

5. **Relative paths**: `../lib/.bloomd` from `/usr/bin` doesn't resolve to `/usr/lib/.bloomd`
   - Expected: Should resolve to `/usr/lib/.bloomd`
   - Actual: Returns `/usr/bin/../lib/.bloomd` (doesn't normalize)

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- Regular (non-hidden) files must continue to work correctly with all existing commands
- `ls` without `-a` flag must continue to filter out hidden files
- Tab completion for non-hidden files must continue to work as before
- Absolute paths without normalization issues must continue to work correctly
- VirtualFS core methods (`exists`, `readFile`, `rm`, etc.) must continue to work correctly (they already handle hidden files properly)
- Virus gameplay interactions must continue to trigger appropriate game events and responses

**Scope:**
All inputs that do NOT involve hidden files with path normalization requirements, tab completion for hidden files, or CWD file path edge cases should be completely unaffected by this fix. This includes:
- Regular files with correctly formatted paths
- Commands that don't involve hidden files
- Tab completion for non-hidden files
- Normal CWD (directory) operations

## Hypothesized Root Cause

Based on the bug description and code analysis, the most likely issues are:

1. **Incomplete Path Normalization in CommandParser._resolvePath**: The current implementation only handles `..` and `.` as complete path components, not when they appear within longer paths
   - It doesn't process sequences like `/usr/lib/../lib/.bloomd`
   - It doesn't collapse multiple slashes like `//`
   - It doesn't handle `.` within paths like `/usr/./lib/.bloomd`

2. **Missing Tab Completion Logic for Hidden Files**: The `autocomplete` method doesn't consider hidden files when providing suggestions
   - It only completes command names, not file paths
   - Even if it did complete file paths, it would filter out hidden files

3. **CWD Edge Case Handling**: The `_resolvePath` method assumes cwd is always a directory
   - When cwd is incorrectly set to a file path, `..` and `.` resolution fails
   - This is a defensive fix - ideally cwd should never be a file, but we need to handle it

4. **Lack of Path Normalization Utility**: No centralized utility function for path normalization
   - Each command handler resolves paths independently
   - Inconsistent handling across different commands

## Correctness Properties

Property 1: Bug Condition - Path Normalization for Hidden Files

_For any_ input path containing a hidden file (starting with '.') that needs path normalization (contains `..`, `.`, or `//`), the fixed `CommandParser._resolvePath` function SHALL return the correctly normalized absolute path, identical to what would be produced for a regular file in the same location.

**Validates: Requirements 2.1, 2.4, 2.5**

Property 2: Bug Condition - Tab Completion for Hidden Files

_For any_ tab completion operation where the user input starts with a dot ('.'), the fixed `CommandParser.autocomplete` function SHALL suggest hidden files matching the input pattern, identical to how regular files are suggested when input doesn't start with a dot.

**Validates: Requirements 2.2**

Property 3: Bug Condition - CWD as File Path Resolution

_For any_ operation where the current working directory is incorrectly a file path and the target is `..` or `.`, the fixed `CommandParser._resolvePath` function SHALL resolve these special directories relative to the file's parent directory, not the file itself.

**Validates: Requirements 2.6**

Property 4: Preservation - Regular File Behavior

_For any_ input that does NOT involve hidden files with path normalization requirements, the fixed code SHALL produce exactly the same behavior as the original code, preserving all existing functionality for regular files and non-problematic operations.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6**

## Fix Implementation

### Changes Required

**File**: `js/terminal/CommandParser.js`

**Function**: `_resolvePath`

**Specific Changes**:
1. **Add Path Normalization Utility**: Create a new `_normalizePath` helper function that handles `..`, `.`, `//` normalization
   - Implementation: Process path components, collapsing `.` and resolving `..` to parent directories
   - Handle multiple consecutive slashes by collapsing them to single slashes
   - Handle empty path components appropriately

2. **Update _resolvePath Method**: Replace current simple logic with comprehensive path resolution
   - Split path into components
   - Process each component, handling `..` and `.` correctly
   - Ensure absolute paths are handled correctly
   - Handle edge case where cwd is a file path

3. **Add Tab Completion for Files**: Extend `autocomplete` method to handle file path completion
   - When completing file paths, check if input starts with `.`
   - Query VirtualFS for matching files (including hidden when appropriate)
   - Return matching suggestions

4. **Add CWD Validation**: Add defensive check to ensure cwd is always a directory
   - When cwd would be set to a file, automatically set to parent directory
   - Or prevent setting cwd to non-directory in `_cd` method

**File**: `js/terminal/TabManager.js` or related completion logic

**Function**: File path completion (may need new method)

**Specific Changes**:
1. **Add File Path Completion**: Implement logic to query filesystem for matching files
   - Check current directory for files matching partial input
   - Include hidden files when input starts with `.`
   - Exclude hidden files when input doesn't start with `.`

### Implementation Details

**New Helper Function in CommandParser.js:**
```javascript
_normalizePath(path) {
  if (!path || path === '/' || path === '.') return path;
  
  // Collapse multiple slashes to single slash
  path = path.replace(/\/+/g, '/');
  
  // Remove trailing slash except for root
  if (path !== '/' && path.endsWith('/')) {
    path = path.slice(0, -1);
  }
  
  const parts = path.split('/').filter(part => part !== '');
  const stack = [];
  
  for (const part of parts) {
    if (part === '.') {
      // Current directory - skip
      continue;
    } else if (part === '..') {
      // Parent directory
      if (stack.length > 0) {
        stack.pop();
      }
      // If stack is empty and we're going up from root, stay at root
    } else {
      // Normal directory or file
      stack.push(part);
    }
  }
  
  // Reconstruct path
  const result = '/' + stack.join('/');
  return result === '' ? '/' : result;
}
```

**Updated _resolvePath Method:**
```javascript
_resolvePath(target, p) {
  if (!target) return p ? p.cwd : '/';
  
  let path = target;
  const cwd = p ? p.cwd : '/';
  
  // Handle absolute paths
  if (path.startsWith('/')) {
    return this._normalizePath(path);
  }
  
  // Handle special directories
  if (path === '..') {
    if (cwd === '/') return '/';
    const normalizedCwd = this._normalizePath(cwd);
    const parent = normalizedCwd.substring(0, normalizedCwd.lastIndexOf('/'));
    return parent || '/';
  }
  
  if (path === '.') {
    return this._normalizePath(cwd);
  }
  
  // Handle relative paths
  const combined = cwd === '/' ? '/' + path : cwd + '/' + path;
  return this._normalizePath(combined);
}
```

**Enhanced autocomplete Method:**
```javascript
autocomplete(input) {
  if (!input) return input;
  
  const parts = input.trim().split(/\s+/);
  
  // Command completion (existing behavior)
  if (parts.length === 1) {
    const partial = parts[0].toLowerCase();
    const matches = Object.keys(this.commands).filter(c => c.startsWith(partial));
    if (matches.length === 1) return matches[0] + ' ';
    if (matches.length > 1) return matches.join('  ');
    return input;
  }
  
  // File path completion (new)
  const lastPart = parts[parts.length - 1];
  if (lastPart.includes('/') || lastPart.startsWith('.') || parts.length > 1) {
    // This is likely a file path argument
    return this._completeFilePath(input, parts);
  }
  
  return input;
}

_completeFilePath(input, parts) {
  const p = this.panel;
  if (!p || !p.currentFS) return input;
  
  const fs = p.currentFS;
  const lastPart = parts[parts.length - 1];
  
  // Extract directory and partial filename
  const lastSlashIndex = lastPart.lastIndexOf('/');
  let dirPath, partialName;
  
  if (lastSlashIndex >= 0) {
    dirPath = lastPart.substring(0, lastSlashIndex);
    partialName = lastPart.substring(lastSlashIndex + 1);
  } else {
    dirPath = p.cwd;
    partialName = lastPart;
  }
  
  // Resolve directory path
  const resolvedDir = this._resolvePath(dirPath, p);
  const entries = fs.ls(resolvedDir);
  if (!entries) return input;
  
  // Filter files based on partial name and hidden status
  const showHidden = partialName.startsWith('.');
  const matches = entries.filter(e => {
    if (!showHidden && e.hidden) return false;
    return e.name.startsWith(partialName);
  });
  
  if (matches.length === 0) return input;
  
  if (matches.length === 1) {
    // Single match - complete it
    const completedName = matches[0].name;
    const basePath = parts.slice(0, -1).join(' ');
    const newLastPart = lastSlashIndex >= 0 
      ? lastPart.substring(0, lastSlashIndex + 1) + completedName
      : completedName;
    
    // Add space if it's a file (not directory)
    const suffix = matches[0].type === 'dir' ? '/' : ' ';
    return basePath + ' ' + newLastPart + suffix;
  }
  
  // Multiple matches - show them
  const matchNames = matches.map(m => m.name);
  return input + '\n' + matchNames.join('  ');
}
```

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate the bug on unfixed code, then verify the fix works correctly and preserves existing behavior.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate the bug BEFORE implementing the fix. Confirm or refute the root cause analysis. If we refute, we will need to re-hypothesize.

**Test Plan**: Write tests that simulate various path resolution scenarios with hidden files. Run these tests on the UNFIXED code to observe failures and understand the root cause.

**Test Cases**:
1. **Path with `..` Test**: Test `/usr/lib/../lib/.bloomd` resolution (will fail on unfixed code)
2. **Path with `.` Test**: Test `/usr/./lib/.bloomd` resolution (will fail on unfixed code)
3. **Multiple Slashes Test**: Test `/usr/lib//.bloomd` resolution (will fail on unfixed code)
4. **Tab Completion Test**: Test typing `.bl` tab completion (will fail on unfixed code)
5. **CWD as File Test**: Test `..` resolution when cwd is `/usr/lib/.bloomd` (will fail on unfixed code)
6. **Relative Path Test**: Test `../lib/.bloomd` from `/usr/bin` (will fail on unfixed code)

**Expected Counterexamples**:
- Paths are not normalized (contain `..`, `.`, `//`)
- Tab completion returns no suggestions for hidden files
- CWD file path causes incorrect resolution
- Relative paths don't resolve correctly

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed function produces the expected behavior.

**Pseudocode:**
```
FOR ALL input WHERE isBugCondition(input) AND input.needsPathNormalization DO
  result := _resolvePath_fixed(input.path, input.cwd)
  normalized := _normalizePath(input.path, input.cwd)
  ASSERT result = normalized
END FOR

FOR ALL input WHERE isBugCondition(input) AND input.operation = "tabCompletion" DO
  completions := autocomplete_fixed(input.text)
  ASSERT (input.text startsWith ".") ⇒ (completions includes hidden files)
END FOR

FOR ALL input WHERE isBugCondition(input) AND input.cwdIsFile DO
  IF input.target = "." THEN
    ASSERT _resolvePath_fixed(".", input.cwd) = parentDirectory(input.cwd)
  END IF
  IF input.target = ".." THEN
    ASSERT _resolvePath_fixed("..", input.cwd) = parentDirectory(parentDirectory(input.cwd))
  END IF
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold, the fixed function produces the same result as the original function.

**Pseudocode:**
```
FOR ALL input WHERE NOT isBugCondition(input) DO
  ASSERT _resolvePath_original(input.path, input.cwd) = _resolvePath_fixed(input.path, input.cwd)
  ASSERT autocomplete_original(input.text) = autocomplete_fixed(input.text)
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many test cases automatically across the input domain
- It catches edge cases that manual unit tests might miss
- It provides strong guarantees that behavior is unchanged for all non-buggy inputs

**Test Plan**: Observe behavior on UNFIXED code first for regular files and non-problematic operations, then write property-based tests capturing that behavior.

**Test Cases**:
1. **Regular File Path Preservation**: Verify regular files continue to work correctly after fix
2. **Non-Hidden Tab Completion Preservation**: Verify tab completion for non-hidden files unchanged
3. **Absolute Path Preservation**: Verify absolute paths without normalization issues continue to work
4. **Command Completion Preservation**: Verify command name completion unchanged
5. **VirtualFS Method Preservation**: Verify VirtualFS methods unchanged for regular files

### Unit Tests

- Test path normalization with various edge cases
- Test tab completion for hidden and regular files
- Test CWD edge cases (file as cwd)
- Test relative path resolution
- Test command completion unchanged

### Property-Based Tests

- Generate random paths with hidden files and verify normalization works
- Generate random file structures and verify tab completion behavior
- Test that all non-hidden file operations continue to work across many scenarios
- Test path resolution invariant: normalize(normalize(path)) = normalize(path)

### Integration Tests

- Test full command flow with hidden files (`rm`, `cat`, `find`, etc.)
- Test virus file detection and removal gameplay
- Test switching between directories with hidden files
- Test visual feedback when commands succeed/fail with hidden files