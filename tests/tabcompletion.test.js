import { describe, it, expect } from 'vitest';
import { createInstances, loadSource } from './setup.js';

function createMockParseGame() {
  const inst = createInstances();
  const src = loadSource();
  const CommandParserClass = new Function(src.CommandParser + '; return CommandParser;')();

  const game = inst.game;
  game.auth.currentUser = 'admin';
  const fs = game.filesystems['dmz-03'];

  // Create test files including hidden ones
  fs.writeFile('/usr/lib/.bloomd', 'virus');
  fs.writeFile('/usr/lib/.hidden_file', 'hidden');
  fs.writeFile('/usr/lib/regular_file', 'regular');
  fs.writeFile('/.hidden_root', 'root hidden');
  fs.mkdir('/usr/lib');
  fs.mkdir('/home');
  fs.writeFile('/home/.bashrc', 'bash config');
  fs.writeFile('/home/.profile', 'profile');
  fs.writeFile('/home/document.txt', 'document');

  // Mock tabManager
  const mockPanel = {
    cwd: '/usr/lib',
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

describe('Hidden Files Tab Completion', () => {
  // These tests should PASS with fixed implementation
  it('should pass: tab completion for hidden files when typing .bl', () => {
    const { cp } = createMockParseGame();
    
    // Test case: typing ".bl" should suggest ".bloomd" if exists
    const result = cp.autocomplete('.bl');
    console.log('Tab completion result for .bl:', result);
    
    // Should return ".bloomd " (with space) since there's exact match
    expect(result).toBe('.bloomd ');
  });

  it('should pass: tab completion shows hidden files when input starts with .', () => {
    const { cp } = createMockParseGame();
    
    // Test case: input starting with . should complete to hidden files
    // Note: autocomplete only works on last token, so "ls -la ." will complete "."
    const result = cp.autocomplete('ls -la .');
    console.log('Tab completion result for "ls -la .":', result);
    
    // Should show hidden files suggestions
    expect(result).toContain('\n');
    expect(result).toContain('.bloomd');
    expect(result).toContain('.hidden_file');
  });

  it('should pass: tab completion for cat command with hidden file', () => {
    const { cp } = createMockParseGame();
    
    // Test case: "cat .b" should suggest ".bloomd"
    const result = cp.autocomplete('cat .b');
    console.log('Tab completion result for "cat .b":', result);
    
    // Should complete to ".bloomd " since there's exact match
    expect(result).toBe('cat .bloomd ');
  });

  it('should pass: multiple hidden file suggestions', () => {
    const { cp } = createMockParseGame();
    
    // Change CWD to /home where there are multiple . files
    const game = createMockParseGame();
    const cp2 = game.cp;
    game.mockPanel.cwd = '/home';
    
    // Test case: "ls ." should show all hidden files in current directory
    const result = cp2.autocomplete('ls .');
    console.log('Tab completion result for "ls ." in /home:', result);
    
    // Should show both .bashrc and .profile
    expect(result).toContain('\n');
    expect(result).toContain('.bashrc');
    expect(result).toContain('.profile');
  });

  it('should pass: tab completion for regular files (non-hidden)', () => {
    const { cp } = createMockParseGame();
    
    // Test case: "cat r" should suggest "regular_file"
    const result = cp.autocomplete('cat r');
    console.log('Tab completion result for "cat r":', result);
    
    // Should complete to "regular_file"
    expect(result).toBe('cat regular_file ');
  });

  it('should pass: hidden files not shown when typing non-dot prefix', () => {
    const game = createMockParseGame();
    const cp2 = game.cp;
    game.mockPanel.cwd = '/home';
    
    // Test case: "ls b" should NOT suggest ".bashrc" (hidden file)
    const result = cp2.autocomplete('ls b');
    console.log('Tab completion result for "ls b" in /home:', result);
    
    // Should NOT show .bashrc because input doesn't start with .
    expect(result).not.toContain('.bashrc');
    expect(result).toBe('ls b'); // No matches for "b" (only .bashrc and .profile)
  });
});