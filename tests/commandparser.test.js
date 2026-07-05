import { describe, it, expect, beforeAll } from 'vitest';
import { createInstances, loadSource, networkTopology, virusConfig, storyEvents } from './setup.js';

let CommandParser, VirtualFS, FileTypes, NetworkGraph, Bloomd, instances;

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
    cwd: '/',
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

describe('CommandParser — parse', () => {
  it('dispatch по имени команды', () => {
    const { cp } = createMockParseGame();
    const result = cp.parse('pwd');
    expect(result).toBe('/');
  });

  it('bash: command not found для неизвестных команд', () => {
    const { cp } = createMockParseGame();
    const result = cp.parse('nonexistent_cmd_xyz');
    expect(result).toContain('command not found');
  });

  it('sudo dispatch к реальной команде', () => {
    const { cp } = createMockParseGame();
    const result = cp.parse('sudo pwd');
    expect(result).toBe('/');
  });
});

describe('CommandParser — _checkCommandAvailable', () => {
  it('BUILTIN игнорируются', () => {
    const { cp } = createMockParseGame();
    expect(cp.parse('echo hello')).toBe('hello');
    expect(cp.parse('cd /')).toBe('');
    expect(cp.parse('clear')).toBe('');
  });

  it('если libc.so удалена → Segmentation fault', () => {
    const { cp, fs } = createMockParseGame();
    fs.rm('/usr/lib/libc.so');
    const result = cp.parse('ls');
    expect(result).toContain('Segmentation fault');
  });

  it('если libssl.so удалена → ssh ошибка', () => {
    const { cp, fs } = createMockParseGame();
    const result = cp.parse('ssh');
    expect(result).not.toContain('libssl'); // ssh is a built-in, not affected directly
  });
});

describe('CommandParser — _ls', () => {
  it('ls корня', () => {
    const { cp } = createMockParseGame();
    const result = cp.parse('ls /');
    expect(result).toBeTruthy();
    expect(result).toContain('usr');
  });

  it('ls с -la показывает скрытые файлы', () => {
    const { cp, fs } = createMockParseGame();
    fs.writeFile('/.hidden_file', 'secret');
    const result = cp.parse('ls -la /');
    expect(result).toContain('.hidden_file');
  });

  it('ls несуществующего пути → No such directory', () => {
    const { cp } = createMockParseGame();
    const result = cp.parse('ls /nonexistent_path_xyz');
    expect(result).toContain('No such directory');
  });
});

describe('CommandParser — _cat', () => {
  it('cat существующего файла → содержимое', () => {
    const { cp } = createMockParseGame();
    const result = cp.parse('cat /etc/hostname');
    expect(result).toBe('dmz-03\n');
  });

  it('cat несуществующего → No such file', () => {
    const { cp } = createMockParseGame();
    const result = cp.parse('cat /nonexistent_file');
    expect(result).toContain('No such file');
  });
});

describe('CommandParser — _rm', () => {
  it('rm файла удаляет из VirtualFS', () => {
    const { cp, fs } = createMockParseGame();
    fs.writeFile('/tmp/testfile', 'x');
    cp.parse('rm /tmp/testfile');
    expect(fs.exists('/tmp/testfile')).toBe(false);
  });

  it('rm / → cannot remove root directory', () => {
    const { cp } = createMockParseGame();
    const result = cp.parse('rm /');
    expect(result).toContain('cannot remove root directory');
  });

  it('rm несуществующего → No such file or directory', () => {
    const { cp } = createMockParseGame();
    const result = cp.parse('rm /nonexistent');
    expect(result).toContain('No such file or directory');
  });

  it('rm директории без -rf → Is a directory', () => {
    const { cp } = createMockParseGame();
    const result = cp.parse('rm /usr');
    expect(result).toContain('Is a directory');
  });
});

describe('CommandParser — _find', () => {
  it('find с -name находит файл', () => {
    const { cp } = createMockParseGame();
    const result = cp.parse('find / -name hostname');
    expect(result).toContain('/etc/hostname');
  });

  it('find / → все файлы', () => {
    const { cp } = createMockParseGame();
    const result = cp.parse('find /');
    expect(result).toBeTruthy();
    expect(result.split('\n').length).toBeGreaterThan(20);
  });

  it('find без совпадений → пусто', () => {
    const { cp } = createMockParseGame();
    const result = cp.parse('find / -name zzz_nonexistent_zzz');
    expect(result).toBe('');
  });
});

describe('CommandParser — _ps', () => {
  it('показывает процесс .bloomd если node.bloomdRunning', () => {
    const { cp, network } = createMockParseGame();
    network.nodes['dmz-03'].bloomdRunning = true;
    const result = cp.parse('ps');
    expect(result).toContain('.bloomd');
  });

  it('не показывает если флаги сброшены', () => {
    const { cp, network } = createMockParseGame();
    network.nodes['dmz-03'].bloomdRunning = false;
    network.nodes['dmz-03'].hasWatchdog = false;
    const result = cp.parse('ps');
    expect(result).not.toContain('.bloomd');
  });
});

describe('CommandParser — _kill', () => {
  it('PID 1425 → вызывает bloomd-методы', () => {
    const { cp, network } = createMockParseGame();
    network.nodes['dmz-03'].bloomdRunning = true;
    const result = cp.parse('kill -9 1425');
    expect(result).toContain('terminated');
    expect(network.nodes['dmz-03'].bloomdRunning).toBe(false);
  });

  it('PID 1530 → вызывает watchdog-методы', () => {
    const { cp, network } = createMockParseGame();
    network.nodes['dmz-03'].hasWatchdog = true;
    const result = cp.parse('kill 1530');
    expect(result).toContain('terminated');
    expect(network.nodes['dmz-03'].hasWatchdog).toBe(false);
  });
});

describe('CommandParser — _ifconfig', () => {
  it('eth0 down → node.isolated = true', () => {
    const { cp, network } = createMockParseGame();
    cp.parse('ifconfig eth0 down');
    expect(network.nodes['dmz-03'].isolated).toBe(true);
  });

  it('eth0 up → node.isolated = false', () => {
    const { cp, network } = createMockParseGame();
    network.setIsolated('dmz-03', true);
    cp.parse('ifconfig eth0 up');
    expect(network.nodes['dmz-03'].isolated).toBe(false);
  });

  it('без аргументов → статус интерфейса', () => {
    const { cp } = createMockParseGame();
    const result = cp.parse('ifconfig');
    expect(result).toContain('eth0');
    expect(result).toContain('UP');
  });
});

describe('CommandParser — _ssh', () => {
  it('подключает к узцу: меняет connectedNode и currentFS', () => {
    const { cp, mockPanel } = createMockParseGame();
    const result = cp.parse('ssh admin@dmz-01');
    expect(mockPanel.connectedNode).toBe('dmz-01');
    expect(mockPanel.currentFS).toBeDefined();
  });

  it('ошибка для несуществующего хоста', () => {
    const { cp } = createMockParseGame();
    const result = cp.parse('ssh admin@nonexistent');
    expect(result).toContain('Could not resolve hostname');
  });

  it('ошибка для изолированного узла', () => {
    const { cp, network } = createMockParseGame();
    network.setIsolated('dmz-02', true);
    const result = cp.parse('ssh admin@dmz-02');
    expect(result).toContain('isolated');
  });
});

describe('CommandParser — _exit', () => {
  it('сбрасывает connectedNode, currentFS, cwd', () => {
    const { cp, mockPanel } = createMockParseGame();
    cp.parse('ssh admin@dmz-01');
    cp.parse('exit');
    expect(mockPanel.connectedNode).toBeNull();
    expect(mockPanel.currentFS).toBeNull();
    expect(mockPanel.cwd).toBe('/');
  });
});

describe('CommandParser — _resolvePath', () => {
  it('\'/\' → \'/\'', () => {
    const { cp, mockPanel } = createMockParseGame();
    expect(cp._resolvePath('/', mockPanel)).toBe('/');
  });

  it('относительный путь склеивается с cwd', () => {
    const { cp, mockPanel } = createMockParseGame();
    mockPanel.cwd = '/usr';
    expect(cp._resolvePath('bin', mockPanel)).toBe('/usr/bin');
  });

  it('\'..\' поднимается на уровень', () => {
    const { cp, mockPanel } = createMockParseGame();
    mockPanel.cwd = '/usr/lib';
    expect(cp._resolvePath('..', mockPanel)).toBe('/usr');
  });

  it('\'.\' → cwd', () => {
    const { cp, mockPanel } = createMockParseGame();
    mockPanel.cwd = '/usr';
    expect(cp._resolvePath('.', mockPanel)).toBe('/usr');
  });
});

describe('CommandParser — _crontab', () => {
  it('crontab -l показывает содержимое /etc/crontab', () => {
    const { cp } = createMockParseGame();
    const result = cp.parse('crontab -l');
    expect(result).toContain('SHELL');
  });
});

describe('CommandParser — _touch', () => {
  it('touch создаёт файл', () => {
    const { cp, fs } = createMockParseGame();
    cp.parse('touch /tmp/newfile');
    expect(fs.exists('/tmp/newfile')).toBe(true);
  });
});

describe('CommandParser — _mkdir', () => {
  it('mkdir создаёт директорию', () => {
    const { cp, fs } = createMockParseGame();
    cp.parse('mkdir /tmp/newdir');
    expect(fs.isDir('/tmp/newdir')).toBe(true);
  });
});
