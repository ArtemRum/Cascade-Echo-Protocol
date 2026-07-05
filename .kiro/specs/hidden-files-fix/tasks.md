# Implementation Plan

- [ ] 1. Write bug condition exploration test
  - **Property 1: Bug Condition** - Hidden Files Path Normalization Failure
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate the bug exists
  - **Scoped PBT Approach**: For deterministic bugs, scope the property to the concrete failing case(s) to ensure reproducibility
  - Test path normalization for hidden files with `..`, `.`, and `//` as described in Bug Condition specification
  - Test cases to cover: `/usr/lib/../lib/.bloomd`, `/usr/lib//./.bloomd`, `../lib/.bloomd` from `/usr/bin`, etc.
  - Test assertions should match the Expected Behavior Properties from design
  - Run test on UNFIXED code
  - **EXPECTED OUTCOME**: Test FAILS (this is correct - it proves the bug exists)
  - Document counterexamples found to understand root cause
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 1.1, 1.4, 1.5, 2.1, 2.4, 2.5_

- [ ] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Regular File Behavior Preservation
  - **IMPORTANT**: Follow observation-first methodology
  - Observe behavior on UNFIXED code for non-buggy inputs (regular files, correct paths)
  - Write property-based tests capturing observed behavior patterns from Preservation Requirements
  - Test cases: Regular files with correctly formatted paths, absolute paths without issues, command completion, tab completion for non-hidden files
  - Property-based testing generates many test cases for stronger guarantees
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (this confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

- [ ] 3. Write bug condition exploration test for tab completion
  - **Property 1: Bug Condition** - Hidden Files Tab Completion Failure
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - Test tab completion for hidden files as described in Bug Condition specification
  - Test that typing `.bl` and pressing tab should suggest `.bloomd` (if exists)
  - Test that input starting with `.` should complete to hidden files
  - Test assertions should match the Expected Behavior Properties from design
  - Run test on UNFIXED code
  - **EXPECTED OUTCOME**: Test FAILS (this proves the bug exists)
  - Document counterexamples found (e.g., no suggestions for hidden files)
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 1.2, 2.2, 2.6_

- [ ] 4. Write bug condition exploration test for CWD file path edge cases
  - **Property 1: Bug Condition** - CWD File Path Resolution Failure
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - Test CWD as file path resolution as described in Bug Condition specification
  - Test cases: When cwd is `/usr/lib/.bloomd`, `..` should resolve to `/usr/lib`
  - Test that `.` resolves to parent directory when cwd is a file
  - Test assertions should match the Expected Behavior Properties from design
  - Run test on UNFIXED code
  - **EXPECTED OUTCOME**: Test FAILS (this proves the bug exists)
  - Document counterexamples found (e.g., incorrect path resolution)
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 1.6, 2.6_

- [ ] 5. Fix for hidden files path resolution bug

  - [ ] 5.1 Implement path normalization utility function
    - Create `_normalizePath` helper function in `js/terminal/CommandParser.js`
    - Handle `..`, `.`, and `//` normalization as specified in design
    - Process path components, collapsing `.` and resolving `..` to parent directories
    - Handle multiple consecutive slashes by collapsing to single slashes
    - Handle edge cases: root path `/`, empty paths, trailing slashes
    - _Bug_Condition: isBugCondition(input) where input.pathContainsHiddenFile AND input.needsPathNormalization_
    - _Expected_Behavior: Normalized path identical to regular file normalization_
    - _Preservation: Regular file paths must normalize identically_
    - _Requirements: 2.1, 2.4, 2.5, 3.2_

  - [ ] 5.2 Update _resolvePath method with proper normalization
    - Modify `_resolvePath` method in `js/terminal/CommandParser.js` to use new normalization
    - Handle absolute paths, relative paths, and special directories (`..`, `.`)
    - Ensure proper CWD handling for relative paths
    - Add defensive check for CWD as file path edge case
    - _Bug_Condition: isBugCondition(input) where input.pathContainsHiddenFile AND input.needsPathNormalization_
    - _Expected_Behavior: Correct path resolution for all path formats_
    - _Preservation: Existing path resolution for regular files unchanged_
    - _Requirements: 2.1, 2.4, 2.5, 2.6, 3.2, 3.3_

  - [ ] 5.3 Implement tab completion for hidden files
    - Extend `autocomplete` method in `js/terminal/CommandParser.js` to handle file path completion
    - Add `_completeFilePath` helper method for file system queries
    - Query VirtualFS for matching files (including hidden when appropriate)
    - Show hidden files only when input starts with `.`
    - _Bug_Condition: isBugCondition(input) where input.operation = "tabCompletion" AND input.pathContainsHiddenFile_
    - _Expected_Behavior: Tab completion for hidden files when input starts with '.'_
    - _Preservation: Tab completion for non-hidden files unchanged_
    - _Requirements: 2.2, 3.6_

  - [ ] 5.4 Add CWD validation and defensive handling
    - Prevent CWD from being set to file paths in `_cd` method or handle gracefully
    - Add defensive logic when CWD is incorrectly a file path
    - Ensure `.` and `..` resolve correctly relative to parent directory when CWD is file
    - _Bug_Condition: isBugCondition(input) where input.cwdIsFile AND (input.target = "." OR input.target = "..")_
    - _Expected_Behavior: Correct resolution of . and .. when CWD is file path_
    - _Preservation: Normal CWD directory operations unchanged_
    - _Requirements: 2.6, 3.2_

  - [ ] 5.5 Verify bug condition exploration test now passes (path normalization)
    - **Property 1: Expected Behavior** - Hidden Files Path Normalization
    - **IMPORTANT**: Re-run the SAME test from task 1 - do NOT write a new test
    - The test from task 1 encodes the expected behavior
    - When this test passes, it confirms the expected behavior is satisfied
    - Run bug condition exploration test from step 1
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed for path normalization)
    - _Requirements: Expected Behavior Properties from design_

  - [ ] 5.6 Verify bug condition exploration test now passes (tab completion)
    - **Property 1: Expected Behavior** - Hidden Files Tab Completion
    - **IMPORTANT**: Re-run the SAME test from task 3 - do NOT write a new test
    - The test from task 3 encodes the expected behavior
    - When this test passes, it confirms tab completion works for hidden files
    - Run bug condition exploration test from step 3
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed for tab completion)
    - _Requirements: Expected Behavior Properties from design_

  - [ ] 5.7 Verify bug condition exploration test now passes (CWD file path)
    - **Property 1: Expected Behavior** - CWD File Path Resolution
    - **IMPORTANT**: Re-run the SAME test from task 4 - do NOT write a new test
    - The test from task 4 encodes the expected behavior
    - When this test passes, it confirms CWD file path resolution works correctly
    - Run bug condition exploration test from step 4
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed for CWD edge cases)
    - _Requirements: Expected Behavior Properties from design_

  - [ ] 5.8 Verify preservation tests still pass
    - **Property 2: Preservation** - Regular File Behavior
    - **IMPORTANT**: Re-run the SAME tests from task 2 - do NOT write new tests
    - Run preservation property tests from step 2
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - Confirm all preservation tests still pass after fix (no regressions)

- [ ] 6. Write unit tests for edge cases
  - Test path normalization with various edge cases
  - Test tab completion for different file types (hidden, regular, directories)
  - Test CWD edge cases thoroughly
  - Test relative path resolution from different directories
  - Test command completion unchanged
  - Test that all unit tests pass
  - _Requirements: Comprehensive test coverage for all fix components_

- [ ] 7. Write property-based tests for comprehensive validation
  - Generate random paths with hidden files and verify normalization works
  - Generate random file structures and verify tab completion behavior
  - Test that all non-hidden file operations continue to work across many scenarios
  - Test path resolution invariant: normalize(normalize(path)) = normalize(path)
  - Test idempotence property for path normalization
  - Run property-based tests to ensure strong guarantees
  - _Requirements: Property-based validation as specified in design_

- [ ] 8. Write integration tests for end-to-end validation
  - Test full command flow with hidden files (`rm`, `cat`, `find`, etc.)
  - Test virus file detection and removal gameplay
  - Test switching between directories with hidden files
  - Test visual feedback when commands succeed/fail with hidden files
  - Test that integration tests pass with the fix
  - _Requirements: End-to-end validation of bugfix_

- [ ] 9. Checkpoint - Ensure all tests pass
  - Run all tests: bug condition tests, preservation tests, unit tests, property-based tests, integration tests
  - Ensure all tests pass, ask the user if questions arise.
  - Verify that the bug is fixed and no regressions introduced
