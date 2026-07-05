import { createInstances, loadSource } from './tests/setup.js';

const inst = createInstances();
const src = loadSource();
const CommandParserClass = new Function(src.CommandParser + '; return CommandParser;')();

const game = inst.game;
game.auth.currentUser = 'admin';
const fs = game.filesystems['dmz-03'];

const mockPanel = {
  cwd: '/usr/lib/x86_64-linux-gnu',
  currentFS: fs,
  connectedNode: 'dmz-03',
  terminal: { clear() {} },
  commandHistory: [],
};

game.tabManager = {
  getActivePanel() { return mockPanel; },
};

const cp = new CommandParserClass(game);

// Test the specific case
console.log('CWD:', mockPanel.cwd);
console.log('Path: ../../bin/ls');

// Test _normalizePath directly
const combined = '/usr/lib/x86_64-linux-gnu/../../bin/ls';
console.log('Combined path:', combined);
const normalized = cp._normalizePath(combined);
console.log('Normalized result:', normalized);

// Test _resolvePath
const resolved = cp._resolvePath('../../bin/ls', mockPanel);
console.log('Resolved result:', resolved);

// Test path components
const components = combined.split('/').filter(c => c !== '');
console.log('Path components:', components);