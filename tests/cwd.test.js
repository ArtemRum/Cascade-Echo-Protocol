import { describe, it, expect } from 'vitest';
import { createInstances, loadSource } from './setup.js';

function createMockParseGame() {
  const inst = createInstances();
  const src = loadSource();
  const CommandParserClass = new Function(src.CommandParser + '; return CommandParser;')();

  const game = inst.game;
  game.auth.currentUser = 'admin';
  const fs = game.filesystems['dmz-03'];

  // Create test files
  fs.writeFile('/usr/lib/.bloomd', 'virus');
  fs.mkdir('/usr/lib');
  fs.mkdir('/usr/bin');
  fs.writeFile('/usr/bin/ls', 'binary');
  fs.writeFile('/usr/bin/cat', 'binary');

  // Mock tabManager
  const mockPanel = {
    cwd: '/usr/bin',
    currentFS: fs,
    connectedNode: 'dmz-03',
    terminal: { clear() {} },
    commandHistory: [],
  };

  game.tabManager = {
    getActivePanel() { return mockPanel; },
  };
  game.getFSForNode = (name) => game.filesystems[name] || null;

  const cp = new CommandParserClass(game);
  return { cp, game, fs, mockPanel, ...inst };
}

describe('CWD File Path Edge Cases', () => {
  // These tests should FAIL with current implementation
  it('should fail: CWD as file path - .. should resolve to parent directory', () => {
    const { cp, mockPanel, fs } = createMockParseGame();
    
    // Simulate CWD being set to a file (edge case)
    // In real system, CWD shouldn't be a file, but we need to handle it defensively
    mockPanel.cwd = '/usr/lib/.bloomd';
    
    // Test case: .. from file CWD should resolve to /usr/lib
    const result = cp._resolvePath('..', mockPanel);
    console.log('Test result for .. from file CWD /usr/lib/.bloomd:', result);
    
    // Should resolve to /usr/lib
    expect(result).toBe('/usr/lib');
  });

  it('should fail: CWD as file path - . should resolve to parent directory', () => {
    const { cp, mockPanel, fs } = createMockParseGame();
    
    // Simulate CWD being set to a file
    mockPanel.cwd = '/usr/lib/.bloomd';
    
    // Test case: . from file CWD should resolve to /usr/lib (parent)
    const result = cp._resolvePath('.', mockPanel);
    console.log('Test result for . from file CWD /usr/lib/.bloomd:', result);
    
    // Should resolve to /usr/lib (parent directory, not the file itself)
    expect(result).toBe('/usr/lib');
  });

  it('should fail: CWD validation prevents setting CWD to file path', () => {
    const { cp, mockPanel, fs } = createMockParseGame();
    
    // Test case: cd to a file should fail
    const originalCWD = mockPanel.cwd;
    
    // Try to change CWD to a file
    const result = cp.parse('cd /usr/lib/.bloomd');
    console.log('Result of cd to file:', result);
    
    // Should show error message
    expect(result).toContain('No such directory');
    expect(mockPanel.cwd).toBe(originalCWD); // CWD shouldn't change
  });

  it('should fail: relative path from file CWD', () => {
    const { cp, mockPanel, fs } = createMockParseGame();
    
    // Simulate CWD being set to a file
    mockPanel.cwd = '/usr/lib/.bloomd';
    
    // Test case: relative path from file CWD
    const result = cp._resolvePath('ls', mockPanel);
    console.log('Test result for "ls" from file CWD /usr/lib/.bloomd:', result);
    
    // Should resolve to /usr/lib/ls (parent directory + relative path)
    expect(result).toBe('/usr/lib/ls');
  });

  it('should fail: complex relative path from file CWD', () => {
    const { cp, mockPanel, fs } = createMockParseGame();
    
    // Simulate CWD being set to a file
    mockPanel.cwd = '/usr/lib/.bloomd';
    
    // Test case: complex relative path with ..
    const result = cp._resolvePath('../bin/ls', mockPanel);
    console.log('Test result for "../bin/ls" from file CWD /usr/lib/.bloomd:', result);
    
    // Should resolve to /usr/bin/ls
    expect(result).toBe('/usr/bin/ls');
  });

  it('should fail: absolute path from file CWD', () => {
    const { cp, mockPanel, fs } = createMockParseGame();
    
    // Simulate CWD being set to a file
    mockPanel.cwd = '/usr/lib/.bloomd';
    
    // Test case: absolute path should work regardless of CWD
    const result = cp._resolvePath('/usr/bin/ls', mockPanel);
    console.log('Test result for "/usr/bin/ls" from file CWD /usr/lib/.bloomd:', result);
    
    // Should resolve to /usr/bin/ls (absolute path)
    expect(result).toBe('/usr/bin/ls');
  });
});