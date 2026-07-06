import { describe, it, expect, beforeAll } from 'vitest';
import { createInstances, loadSource } from './setup.js';

describe('Integration: полное заражение и очистка одного узла', () => {
  it('ssh → ps показывает bloomd → kill → rm → ps пусто', () => {
    const inst = createInstances();
    const src = loadSource();
    const CommandParserClass = new Function(src.CommandParser + '; return CommandParser;')();

    const game = inst.game;
    const fs = game.filesystems['dmz-03'];
    fs.writeFile('/usr/bin/ssh', '');
    fs.writeFile('/usr/bin/scp', '');

    // Setup virus on dmz-03 (disable stealth for deterministic test)
    inst.virus.STEALTH_CHANCE = 0;
    inst.virus._setupVirusFiles('dmz-03');

    const mockPanel = {
      cwd: '/',
      currentFS: fs,
      connectedNode: 'dmz-03',
      terminal: { clear() {} },
      commandHistory: [],
      writeln: () => {},
    };

    game.tabManager = { getActivePanel() { return mockPanel; } };
    game.getFSForNode = (name) => game.filesystems[name] || null;

    const cp = new CommandParserClass(game);

    // ps → shows bloomd
    const ps1 = cp.parse('ps');
    expect(ps1).toContain('.bloomd');

    // find → finds the file
    const find1 = cp.parse('find /usr -name .bloomd');
    expect(find1).toContain('.bloomd');

    // kill -9 1425
    const kill = cp.parse('kill -9 1425');
    expect(kill).toContain('terminated');

    // rm the file
    const rm = cp.parse('rm /usr/lib/.bloomd');
    expect(rm).toBe('');

    // ps → no bloomd
    const ps2 = cp.parse('ps');
    expect(ps2).not.toContain('.bloomd');

    // find → no results
    const find2 = cp.parse('find /usr -name .bloomd');
    expect(find2).toBe('');
  });
});

describe('Integration: USAT падает при изоляции', () => {
  it('ifconfig eth0 down → USAT уменьшился', () => {
    const inst = createInstances();
    const src = loadSource();
    const CommandParserClass = new Function(src.CommandParser + '; return CommandParser;')();

    const game = inst.game;
    const fs = game.filesystems['dmz-03'];
    fs.writeFile('/usr/bin/ssh', '');
    fs.writeFile('/usr/bin/scp', '');

    const mockPanel = {
      cwd: '/',
      currentFS: fs,
      connectedNode: 'dmz-03',
      terminal: { clear() {} },
      commandHistory: [],
      writeln: () => {},
    };

    game.tabManager = { getActivePanel() { return mockPanel; } };
    game.getFSForNode = (name) => game.filesystems[name] || null;

    const cp = new CommandParserClass(game);
    const initialScore = inst.usat.score;

    cp.parse('ifconfig eth0 down');

    expect(inst.usat.score).toBeLessThan(initialScore);
  });
});

describe('Integration: концовка fired при USAT 0', () => {
  it('usat.score <= 0 → fired', () => {
    const inst = createInstances();
    inst.usat.setScore(0);
    const result = inst.story.checkEndingConditions();
    expect(result).toBe('fired');
  });
});

describe('Integration: вирус не распространяется на изолированные узлы', () => {
  it('изоляция всех соседей → _doSpread не заражает', () => {
    const inst = createInstances();
    inst.network.infectNode('dmz-03');
    const neighbors = inst.network.getConnections('dmz-03');
    for (const n of neighbors) {
      if (!n.startsWith('mirror-')) {
        inst.network.setIsolated(n, true);
      }
    }
    inst.virus._doSpreadFrom('dmz-03');
    const infected = inst.network.getInfectedNodes();
    expect(infected.length).toBe(1);
    expect(infected[0].name).toBe('dmz-03');
  });
});

describe('Integration: stealth-нода', () => {
  it('ps показывает bloomd → ls -la находит файл → rm очищает', () => {
    const inst = createInstances();
    const src = loadSource();
    const CommandParserClass = new Function(src.CommandParser + '; return CommandParser;')();

    const game = inst.game;
    const fs = game.filesystems['dmz-03'];
    fs.writeFile('/usr/bin/ssh', '');
    fs.writeFile('/usr/bin/scp', '');

    // Setup stealth virus on dmz-03 (100% stealth, stage 4+)
    inst.virus.STEALTH_CHANCE = 1;
    inst.virus.currentStage = 4;
    inst.virus._setupVirusFiles('dmz-03');
    inst.network.nodes['dmz-03'].infected = true;

    const mockPanel = {
      cwd: '/',
      currentFS: fs,
      connectedNode: 'dmz-03',
      terminal: { clear() {} },
      commandHistory: [],
      writeln: () => {},
    };

    game.tabManager = { getActivePanel() { return mockPanel; } };
    game.getFSForNode = (name) => game.filesystems[name] || null;

    const cp = new CommandParserClass(game);

    // ps shows bloomd even on stealth node (stage 4+)
    const ps1 = cp.parse('ps');
    expect(ps1).toContain('.bloomd');

    // ls -la → finds the virus file in /usr/lib
    const ls = cp.parse('ls -la /usr/lib');
    expect(ls).toContain('.bloomd');

    // rm the virus file
    const rm = cp.parse('rm /usr/lib/.bloomd');
    expect(rm).toBe('');

    // find → no results
    const find = cp.parse('find /usr -name .bloomd');
    expect(find).toBe('');
  });

  it('kill 1425 на stealth-ноде → terminated', () => {
    const inst = createInstances();
    const src = loadSource();
    const CommandParserClass = new Function(src.CommandParser + '; return CommandParser;')();

    const game = inst.game;
    const fs = game.filesystems['dmz-03'];
    fs.writeFile('/usr/bin/ssh', '');
    fs.writeFile('/usr/bin/scp', '');

    // Setup stealth virus on dmz-03 (stage 4+ → bloomdRunning=true)
    inst.virus.STEALTH_CHANCE = 1;
    inst.virus.currentStage = 4;
    inst.virus._setupVirusFiles('dmz-03');
    inst.network.nodes['dmz-03'].infected = true;

    const mockPanel = {
      cwd: '/',
      currentFS: fs,
      connectedNode: 'dmz-03',
      terminal: { clear() {} },
      commandHistory: [],
      writeln: () => {},
    };

    game.tabManager = { getActivePanel() { return mockPanel; } };
    game.getFSForNode = (name) => game.filesystems[name] || null;

    const cp = new CommandParserClass(game);

    // bloomdRunning=true → kill 1425 works
    const result = cp.parse('kill 1425');
    expect(result).toBe('[1]     1425 terminated');
  });
});
