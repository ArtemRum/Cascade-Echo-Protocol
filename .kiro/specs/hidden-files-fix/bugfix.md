# Bugfix Requirements Document

## Introduction

The Cascade: Echo Protocol game has a bug where hidden files (starting with '.') in the virtual filesystem cannot be properly deleted or interacted with. This affects critical gameplay elements since virus files like `.bloomd`, `.bloom_watchdog`, etc. are hidden files. Users report: "скрытые файлы во внутренней файловой системе не удаляюются, с ними вообще не получается взаимодейтсовать" (hidden files in the internal filesystem are not deleted, you can't interact with them at all). The bug impacts commands like `rm`, `cat`, `find`, etc. and prevents players from properly detecting and removing virus files.

## Bug Analysis

### Current Behavior (Defect)

[What currently happens when the bug is triggered]

1.1 WHEN a user tries to access a hidden file with a relative path containing `..` or `.` THEN the system fails to resolve the path correctly (e.g., `/usr/lib/../lib/.bloomd` doesn't normalize to `/usr/lib/.bloomd`)
1.2 WHEN a user tries to use tab completion for a hidden file THEN the system provides no completion suggestions for hidden files
1.3 WHEN a user runs `ls` without the `-a` flag THEN the system doesn't show hidden files, making them invisible even though they exist
1.4 WHEN a user tries to use commands like `rm`, `cat`, `find`, etc. with hidden files AND the path contains multiple slashes THEN the system may fail to locate the file (e.g., `/usr/lib//.bloomd`)
1.5 WHEN a user tries to use relative paths like `../lib/.bloomd` THEN the system doesn't properly resolve the relative path to an absolute path
1.6 WHEN the current working directory is incorrectly set to a file path (e.g., `/usr/lib/.bloomd`) THEN the system incorrectly resolves `.` to the file path instead of its parent directory

### Expected Behavior (Correct)

[What should happen instead]

2.1 WHEN a user tries to access a hidden file with any valid path (absolute, relative, with `..`, `.`, or multiple slashes) THEN the system SHALL correctly resolve and normalize the path to locate the file
2.2 WHEN a user types part of a hidden filename and presses tab THEN the system SHALL provide tab completion for hidden files matching the input
2.3 WHEN a user runs `ls` without the `-a` flag THEN the system SHALL show a hint that hidden files exist (optional) but continue to filter them out
2.4 WHEN a user tries to use commands like `rm`, `cat`, `find`, etc. with hidden files THEN the system SHALL handle them identically to regular files
2.5 WHEN a user uses commands with hidden files in any path format THEN the system SHALL resolve the path through proper normalization
2.6 WHEN the current working directory would be set to a file path THEN the system SHALL either prevent this or handle `.` and `..` resolution appropriately (e.g., `.` resolves to parent directory of the file)

### Unchanged Behavior (Regression Prevention)

[Existing behavior that must be preserved]

3.1 WHEN a user runs `ls` with the `-a` flag THEN the system SHALL CONTINUE TO show all files including hidden ones with proper `hidden: true` flag
3.2 WHEN a user accesses regular (non-hidden) files THEN the system SHALL CONTINUE TO work correctly with all existing commands
3.3 WHEN a user uses commands with correctly formatted absolute paths THEN the system SHALL CONTINUE TO work as currently implemented
3.4 WHEN the VirtualFS core methods (`exists`, `readFile`, `rm`, etc.) are called with valid paths THEN they SHALL CONTINUE TO work correctly (they already handle hidden files properly)
3.5 WHEN a user interacts with virus gameplay files (`.bloomd`, `.bloom_watchdog`, etc.) through game mechanics THEN the system SHALL CONTINUE TO trigger appropriate game events and responses
3.6 WHEN a user's tab completion input doesn't start with a dot THEN the system SHALL CONTINUE TO only suggest non-hidden files (backwards compatibility)


## Bug Condition Derivation

From the requirements above, we can derive the bug condition:

**Bug Condition Function** - Identifies inputs that trigger the bug:
```pascal
FUNCTION isBugCondition(X)
  INPUT: X of type PathOperation (contains path string and operation type)
  OUTPUT: boolean
  
  // Returns true when:
  // 1. Path contains a hidden file AND needs normalization (has .., ., //)
  // 2. Operation is tab completion on hidden files
  // 3. Current working directory is incorrectly a file path
  RETURN (X.pathContainsHiddenFile AND X.needsPathNormalization) 
         OR (X.operation = "tabCompletion" AND X.pathContainsHiddenFile)
         OR (X.cwdIsFile AND (X.target = "." OR X.target = ".."))
END FUNCTION
```

**Property Specification** - Defines correct behavior for buggy inputs:
```pascal
// Property: Fix Checking - Path Resolution for Hidden Files
FOR ALL X WHERE isBugCondition(X) AND X.needsPathNormalization DO
  result ← resolvePath'(X.path)
  normalized ← normalizePath(X.path)  // Remove .., ., //, etc.
  ASSERT result = normalized
END FOR

// Property: Fix Checking - Tab Completion for Hidden Files  
FOR ALL X WHERE isBugCondition(X) AND X.operation = "tabCompletion" DO
  completions ← autocomplete'(X.input)
  // Should complete hidden files when user types the dot
  ASSERT (X.input startsWith ".") ⇒ (completions includes hidden files)
END FOR

// Property: Fix Checking - CWD as File Path
FOR ALL X WHERE isBugCondition(X) AND X.cwdIsFile DO
  IF X.target = "." THEN
    ASSERT resolvePath'(X.target) = parentDirectory(X.cwd)
  END IF
  IF X.target = ".." THEN
    ASSERT resolvePath'(X.target) = parentDirectory(parentDirectory(X.cwd))
  END IF
END FOR
```

**Key Definitions:**
- **F**: The original (unfixed) function - the code as it exists before the fix
- **F'**: The fixed function - the code after applying the fix

**Preservation Goal** - Ensures non-buggy inputs continue to work:
```pascal
// Property: Preservation Checking
FOR ALL X WHERE NOT isBugCondition(X) DO
  // For non-hidden files or already correctly handled operations
  ASSERT F(X) = F'(X)
END FOR
```

This ensures that:
1. For all non-buggy inputs, the fixed code behaves identically to the original
2. Hidden files work identically to regular files after the fix
3. Existing functionality for non-hidden files is preserved