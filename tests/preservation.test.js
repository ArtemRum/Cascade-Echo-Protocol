import { describe, it, expect } from 'vitest';
import { createInstances, loadSource } from './setup.js';

function createMockParseGame() {
  const inst = createInstances();
  const src = loadSource();
  const CommandParserClass = new Function(src.CommandParser + '; return CommandParser;')();

  const game = inst.game;
  game.auth.currentUser = 'admin';
  const fs = game.filesystems['dmz-03'];

  // Add required binary files for commands
  fs.writeFile('/usr/bin/ssh', '');
  fs.writeFile('/usr/bin/scp', '');

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

describe('Preservation Tests - Regular File Behavior', () => {
  it('should preserve: simple absolute paths work correctly', () => {
    const { cp, mockPanel } = createMockParseGame();
    
    // Test case: simple absolute path
    const result = cp._resolvePath('/usr/bin/ls', mockPanel);
    expect(result).toBe('/usr/bin/ls');
  });

  it('should preserve: simple relative paths work correctly', () => {
    const { cp, mockPanel } = createMockParseGame();
    
    // Set CWD to /usr
    mockPanel.cwd = '/usr';
    
    // Test case: simple relative path
    const result = cp._resolvePath('bin/ls', mockPanel);
    expect(result).toBe('/usr/bin/ls');
  });

  it('should preserve: .. works correctly for regular files', () => {
    const { cp, mockPanel } = createMockParseGame();
    
    // Set CWD to /usr/lib
    mockPanel.cwd = '/usr/lib';
    
    // Test case: .. from /usr/lib
    const result = cp._resolvePath('..', mockPanel);
    expect(result).toBe('/usr');
  });

  it('should preserve: . works correctly for regular files', () => {
    const { cp, mockPanel } = createMockParseGame();
    
    // Set CWD to /usr/lib
    mockPanel.cwd = '/usr/lib';
    
    // Test case: . from /usr/lib
    const result = cp._resolvePath('.', mockPanel);
    expect(result).toBe('/usr/lib');
  });

  it('should preserve: empty path returns CWD', () => {
    const { cp, mockPanel } = createMockParseGame();
    
    // Set CWD to /home/user
    mockPanel.cwd = '/home/user';
    
    // Test case: empty path
    const result = cp._resolvePath('', mockPanel);
    expect(result).toBe('/home/user');
  });

  it('should preserve: root path normalization', () => {
    const { cp, mockPanel } = createMockParseGame();
    
    // Test case: root path
    const result = cp._resolvePath('/', mockPanel);
    expect(result).toBe('/');
  });

  it('should preserve: path with trailing slash', () => {
    const { cp, mockPanel } = createMockParseGame();
    
    // Test case: path with trailing slash
    const result = cp._resolvePath('/usr/lib/', mockPanel);
    expect(result).toBe('/usr/lib');
  });

  it('should preserve: complex relative paths work', () => {
    const { cp, mockPanel } = createMockParseGame();
    
    // Set CWD to /var/log
    mockPanel.cwd = '/var/log';
    
    // Test case: complex relative path with ..
    const result = cp._resolvePath('../tmp/file.txt', mockPanel);
    expect(result).toBe('/var/tmp/file.txt');
  });

  it('should preserve: paths with multiple .. work correctly', () => {
    const { cp, mockPanel, fs } = createMockParseGame();
    
    // Set CWD to /usr/lib/x86_64-linux-gnu
    mockPanel.cwd = '/usr/lib/x86_64-linux-gnu';
    
    // Ensure directory exists in filesystem
    fs.mkdir('/usr/lib/x86_64-linux-gnu');
    
    // Test case: multiple ..
    const result = cp._resolvePath('../../bin/ls', mockPanel);
    console.log('CWD:', mockPanel.cwd);
    console.log('FS has dir?', fs.isDir(mockPanel.cwd));
    console.log('Test result for "../../bin/ls" from /usr/lib/x86_64-linux-gnu:', result);
    
    // Debug: check what _normalizePath returns
    const combined = (mockPanel.cwd === '/' ? '' : mockPanel.cwd) + '/' + '../../bin/ls';
    console.log('Combined path:', combined);
    
    // Should resolve to /usr/bin/ls
    expect(result).toBe('/usr/bin/ls');
  });

  it('should preserve: command completion works for regular commands', () => {
    const { cp } = createMockParseGame();
    
    // Test case: command completion
    const result = cp.autocomplete('ls');
    expect(result).toBe('ls ');
    
    const result2 = cp.autocomplete('p');
    expect(result2).toContain('ps');
    expect(result2).toContain('pwd');
  });
});