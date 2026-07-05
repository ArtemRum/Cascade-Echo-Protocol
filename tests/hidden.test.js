import { describe, it, expect } from 'vitest';
import { createInstances, loadSource } from './setup.js';

function createMockParseGame() {
  const inst = createInstances();
  const src = loadSource();
  const CommandParserClass = new Function(src.CommandParser + '; return CommandParser;')();

  const game = inst.game;
  game.auth.currentUser = 'admin';
  const fs = game.filesystems['dmz-03'];

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

describe('Hidden Files Path Normalization Bug', () => {
  it('should fail: path normalization for hidden files with ..', () => {
    const { cp, mockPanel, fs } = createMockParseGame();
    
    // Create test file
    fs.writeFile('/usr/lib/.bloomd', 'virus');
    fs.mkdir('/usr/lib');
    
    // Test case: /usr/lib/../lib/.bloomd should resolve to /usr/lib/.bloomd
    const result = cp._resolvePath('/usr/lib/../lib/.bloomd', mockPanel);
    console.log('Test result for /usr/lib/../lib/.bloomd:', result);
    
    // This test should FAIL with current implementation
    expect(result).toBe('/usr/lib/.bloomd');
  });

  it('should fail: path normalization for hidden files with // and .', () => {
    const { cp, mockPanel, fs } = createMockParseGame();
    
    fs.writeFile('/usr/lib/.bloomd', 'virus');
    fs.mkdir('/usr/lib');
    
    // Test case: /usr/lib//./.bloomd should resolve to /usr/lib/.bloomd  
    const result = cp._resolvePath('/usr/lib//./.bloomd', mockPanel);
    console.log('Test result for /usr/lib//./.bloomd:', result);
    
    // This test should FAIL with current implementation
    expect(result).toBe('/usr/lib/.bloomd');
  });

  it('should fail: relative path with .. from different cwd', () => {
    const { cp, mockPanel, fs } = createMockParseGame();
    
    // Set CWD to /usr/bin
    mockPanel.cwd = '/usr/bin';
    fs.writeFile('/usr/lib/.bloomd', 'virus');
    fs.mkdir('/usr/lib');
    
    // Test case: ../lib/.bloomd from /usr/bin should resolve to /usr/lib/.bloomd
    const result = cp._resolvePath('../lib/.bloomd', mockPanel);
    console.log('Test result for ../lib/.bloomd from /usr/bin:', result);
    
    // This test should FAIL with current implementation
    expect(result).toBe('/usr/lib/.bloomd');
  });

  it('should fail: path normalization with multiple .. and .', () => {
    const { cp, mockPanel, fs } = createMockParseGame();
    
    fs.writeFile('/usr/lib/.bloomd', 'virus');
    fs.mkdir('/usr/lib');
    
    // Test case: /usr/lib/./../lib/.bloomd should resolve to /usr/lib/.bloomd
    const result = cp._resolvePath('/usr/lib/./../lib/.bloomd', mockPanel);
    console.log('Test result for /usr/lib/./../lib/.bloomd:', result);
    
    // This test should FAIL with current implementation
    expect(result).toBe('/usr/lib/.bloomd');
  });

  it('should fail: root path with ..', () => {
    const { cp, mockPanel, fs } = createMockParseGame();
    
    fs.writeFile('/.hidden', 'hidden');
    
    // Test case: /../.hidden should resolve to /.hidden (or error, but not crash)
    const result = cp._resolvePath('/../.hidden', mockPanel);
    console.log('Test result for /../.hidden:', result);
    
    // This test should FAIL with current implementation
    expect(result).toBe('/.hidden');
  });

  it('should fail: empty path normalization', () => {
    const { cp, mockPanel } = createMockParseGame();
    
    // Test case: empty path should return cwd
    const result = cp._resolvePath('', mockPanel);
    console.log('Test result for empty path:', result);
    
    // This test should FAIL with current implementation
    expect(result).toBe('/usr/bin');
  });

  it('should fail: trailing slash handling', () => {
    const { cp, mockPanel, fs } = createMockParseGame();
    
    fs.mkdir('/usr/lib');
    
    // Test case: /usr/lib/ with .. should handle correctly
    const result = cp._resolvePath('/usr/lib/..', mockPanel);
    console.log('Test result for /usr/lib/..:', result);
    
    // This test should FAIL with current implementation
    expect(result).toBe('/usr');
  });
});