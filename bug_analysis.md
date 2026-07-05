# Bug Analysis: Hidden File Interactions

## Problem Description
Hidden files (starting with `.`) in the virtual filesystem cannot be deleted or interacted with properly.

## Root Cause Analysis

### 1. **Path Resolution Issue in `_resolvePath`**
The `_resolvePath` method in `CommandParser.js` doesn't properly normalize paths:
- `/usr/lib/../lib/.bloomd` doesn't normalize to `/usr/lib/.bloomd`
- Paths with trailing slashes produce double slashes: `/usr/lib//.bloomd`
- Paths with `.` produce incorrect paths: `/usr/lib/./.bloomd`

### 2. **Display vs Reality Mismatch**
The `ls` command filters out hidden files by default (no `-a` flag), but the files still exist in the filesystem. Users might not see the files they need to interact with.

### 3. **Tab Completion Issue**
The `autocomplete` method only completes command names, not file paths. Users can't use tab completion to complete hidden filenames.

### 4. **Potential Edge Cases**
- What happens when cwd is incorrectly set to a file path?
- How does `find` handle hidden files?
- Are there permission issues with hidden files?

## Code Issues Found

### Issue 1: Path Normalization
**File**: `js/terminal/CommandParser.js`, method `_resolvePath`
**Problem**: Doesn't normalize paths with `..` or `.` or multiple slashes.

### Issue 2: Display Filtering
**File**: `js/terminal/CommandParser.js`, method `_ls`
**Behavior**: Filters hidden files unless `-a` flag is used, which might confuse users.

### Issue 3: No Path Autocomplete
**File**: `js/terminal/CommandParser.js`, method `autocomplete`
**Problem**: Only completes command names, not file paths.

## Testing Results

### VirtualFS Core Methods Work Correctly
- `fs.rm('/usr/lib/.bloomd')` → `true` (deletes hidden file)
- `fs.exists('/usr/lib/.bloomd')` → `true` (correctly detects)
- `fs.readFile('/usr/lib/.bloomd')` → content (correctly reads)
- `fs.ls('/usr/lib')` → includes `.bloomd` with `hidden: true`

### CommandParser Issues
1. Path resolution doesn't normalize: `../lib/.bloomd` → `/usr/lib/../lib/.bloomd`
2. No tab completion for hidden files

## Potential User Experience Issues

1. **User can't see hidden files** → uses `ls` without `-a`, doesn't see `.bloomd`
2. **User knows filename** → types `rm .bloomd` → works (if path resolution is correct)
3. **User tries tab completion** → doesn't work for hidden files
4. **User uses relative paths** → might fail due to path normalization issues

## Recommendations for Fix

### 1. Fix `_resolvePath` Method
Add path normalization:
```javascript
_resolvePath(target, p) {
    if (!target) return p ? p.cwd : '/';
    if (target.startsWith('/')) return this._normalizePath(target);
    if (target === '..') {
        const parts = (p ? p.cwd : '/').replace(/\/$/, '').split('/').filter(Boolean);
        parts.pop();
        return '/' + parts.join('/');
    }
    if (target === '.') return p ? p.cwd : '/';
    const cwd = p ? p.cwd : '/';
    const fullPath = (cwd === '/' ? '' : cwd) + '/' + target;
    return this._normalizePath(fullPath);
}

_normalizePath(path) {
    // Remove double slashes, normalize . and ..
    const parts = path.split('/').filter(p => p !== '.');
    const result = [];
    for (const part of parts) {
        if (part === '..') {
            result.pop();
        } else if (part) {
            result.push(part);
        }
    }
    return '/' + result.join('/');
}
```

### 2. Improve User Feedback
- Add hint in `ls` output when hidden files exist but aren't shown
- Improve `man ls` documentation about `-a` flag

### 3. Add Path Autocomplete
- Implement tab completion for file paths, including hidden files
- Filter hidden files in autocomplete based on context

### 4. Add Integration Tests
- Test hidden file operations through CommandParser
- Test path normalization edge cases