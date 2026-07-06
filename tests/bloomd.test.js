import { describe, it, expect, beforeAll } from 'vitest';
import { createInstances, networkTopology, virusConfig } from './setup.js';

let instances, VirtualFS, NetworkGraph, Bloomd, network;

beforeAll(() => {
  instances = createInstances();
  VirtualFS = instances.VirtualFS;
  NetworkGraph = instances.NetworkGraph;
  Bloomd = instances.Bloomd;
  network = instances.network;
});

describe('Bloomd — конструктор', () => {
  it('enabled = false', () => {
    const virus = new Bloomd(network, virusConfig, () => null);
    expect(virus.enabled).toBe(false);
  });

  it('currentStage = 0', () => {
    const virus = new Bloomd(network, virusConfig, () => null);
    expect(virus.currentStage).toBe(0);
  });
});

describe('Bloomd — setStage', () => {
  it('обновляет currentStage', () => {
    const virus = new Bloomd(network, virusConfig, () => null);
    virus.setStage(3);
    expect(virus.currentStage).toBe(3);
  });
});

describe('Bloomd — _setupVirusFiles', () => {
  it('выставляет hasVirusFile = true', () => {
    const net = new NetworkGraph(networkTopology);
    const virus = new Bloomd(net, virusConfig, () => null);
    virus._setupVirusFiles('dmz-03');
    expect(net.nodes['dmz-03'].hasVirusFile).toBe(true);
  });

  it('выставляет bloomdRunning = true', () => {
    const net = new NetworkGraph(networkTopology);
    const virus = new Bloomd(net, virusConfig, () => null);
    virus.STEALTH_CHANCE = 0;
    virus._setupVirusFiles('dmz-03');
    expect(net.nodes['dmz-03'].bloomdRunning).toBe(true);
  });

  it('создаёт файл .bloomd в /usr/lib/ виртуальной ФС через getFS-колбэк', () => {
    const net = new NetworkGraph(networkTopology);
    const fs = VirtualFS.fromJSON(instances.FileTypes.getStandardFS('dmz-03', { ip: '10.0.1.3' }));
    const getFS = () => fs;
    const virus = new Bloomd(net, virusConfig, getFS);
    virus._setupVirusFiles('dmz-03');
    expect(fs.exists('/usr/lib/.bloomd')).toBe(true);
  });

  it('на stage 3+ создаёт файл .bloom_watchdog в /usr/sbin/', () => {
    const net = new NetworkGraph(networkTopology);
    const fs = VirtualFS.fromJSON(instances.FileTypes.getStandardFS('dmz-03', { ip: '10.0.1.3' }));
    const getFS = () => fs;
    const virus = new Bloomd(net, virusConfig, getFS);
    virus.setStage(3);
    virus._setupVirusFiles('dmz-03');
    expect(fs.exists('/usr/sbin/.bloom_watchdog')).toBe(true);
  });

  it('на stage 4+ выставляет crontabInfected и пишет в /etc/crontab', () => {
    const net = new NetworkGraph(networkTopology);
    const fs = instances.VirtualFS.fromJSON(instances.FileTypes.getStandardFS('dmz-03', { ip: '10.0.1.3' }));
    const getFS = () => fs;
    const virus = new Bloomd(net, virusConfig, getFS);
    virus.setStage(4);
    virus._setupVirusFiles('dmz-03');
    expect(net.nodes['dmz-03'].crontabInfected).toBe(true);
    const crontab = fs.readFile('/etc/crontab');
    expect(crontab).toContain('bloomd');
  });

  it('на stage 3+ выставляет hasWatchdog', () => {
    const net = new NetworkGraph(networkTopology);
    const virus = new Bloomd(net, virusConfig, () => null);
    virus.setStage(3);
    virus._setupVirusFiles('dmz-03');
    expect(net.nodes['dmz-03'].hasWatchdog).toBe(true);
  });

  it('содержимое файла .bloomd — бинарный заголовок ELF', () => {
    const net = new NetworkGraph(networkTopology);
    const fs = new VirtualFS();
    fs.mkdir('/usr');
    fs.mkdir('/usr/lib');
    const getFS = () => fs;
    const virus = new Bloomd(net, virusConfig, getFS);
    virus._setupVirusFiles('dmz-03');
    const content = fs.readFile('/usr/lib/.bloomd');
    expect(content.startsWith('ELF...')).toBe(true);
  });
});

describe('Bloomd — killProcess', () => {
  it('сбрасывает bloomdRunning', () => {
    const net = new NetworkGraph(networkTopology);
    const virus = new Bloomd(net, virusConfig, () => null);
    virus.STEALTH_CHANCE = 0;
    virus._setupVirusFiles('dmz-03');
    expect(virus.killProcess('dmz-03')).toBe(true);
    expect(net.nodes['dmz-03'].bloomdRunning).toBe(false);
  });

  it('возвращает true, если процесс был запущен', () => {
    const net = new NetworkGraph(networkTopology);
    const virus = new Bloomd(net, virusConfig, () => null);
    virus.STEALTH_CHANCE = 0;
    virus._setupVirusFiles('dmz-03');
    expect(virus.killProcess('dmz-03')).toBe(true);
  });

  it('возвращает false, если процесс не запущен', () => {
    const net = new NetworkGraph(networkTopology);
    const virus = new Bloomd(net, virusConfig, () => null);
    expect(virus.killProcess('dmz-01')).toBe(false);
  });
});

describe('Bloomd — removeFile', () => {
  it('сбрасывает hasVirusFile', () => {
    const net = new NetworkGraph(networkTopology);
    const virus = new Bloomd(net, virusConfig, () => null);
    virus._setupVirusFiles('dmz-03');
    virus.removeFile('dmz-03', '/usr/lib/.bloomd');
    expect(net.nodes['dmz-03'].hasVirusFile).toBe(false);
  });

  it('удаляет файл из VirtualFS через getFS-колбэк', () => {
    const net = new NetworkGraph(networkTopology);
    const fs = new VirtualFS();
    fs.mkdir('/usr');
    fs.mkdir('/usr/lib');
    fs.writeFile('/usr/lib/.bloomd', 'x');
    net.nodes['dmz-03'].hasVirusFile = true;
    const getFS = () => fs;
    const virus = new Bloomd(net, virusConfig, getFS);
    virus.removeFile('dmz-03', '/usr/lib/.bloomd');
    expect(fs.exists('/usr/lib/.bloomd')).toBe(false);
  });

  it('возвращает false, если файла не было', () => {
    const net = new NetworkGraph(networkTopology);
    const virus = new Bloomd(net, virusConfig, () => null);
    expect(virus.removeFile('dmz-01', '/usr/lib/.bloomd')).toBe(false);
  });
});

describe('Bloomd — killWatchdog', () => {
  it('сбрасывает hasWatchdog', () => {
    const net = new NetworkGraph(networkTopology);
    const virus = new Bloomd(net, virusConfig, () => null);
    virus.setStage(3);
    virus._setupVirusFiles('dmz-03');
    virus.killWatchdog('dmz-03');
    expect(net.nodes['dmz-03'].hasWatchdog).toBe(false);
  });
});

describe('Bloomd — isVirusPath', () => {
  it('возвращает true для /usr/lib/.bloomd', () => {
    const virus = new Bloomd(network, virusConfig, () => null);
    expect(virus.isVirusPath('/usr/lib/.bloomd')).toBe(true);
  });

  it('возвращает false для /tmp/test', () => {
    const virus = new Bloomd(network, virusConfig, () => null);
    expect(virus.isVirusPath('/tmp/test')).toBe(false);
  });
});

describe('Bloomd — isNodeClean', () => {
  it('true если нет ни одного флага', () => {
    const virus = new Bloomd(network, virusConfig, () => null);
    expect(virus.isNodeClean('dmz-01')).toBe(true);
  });

  it('false если bloomdRunning', () => {
    const virus = new Bloomd(network, virusConfig, () => null);
    network.nodes['dmz-01'].bloomdRunning = true;
    expect(virus.isNodeClean('dmz-01')).toBe(false);
    network.nodes['dmz-01'].bloomdRunning = false;
  });

  it('false если hasVirusFile', () => {
    const virus = new Bloomd(network, virusConfig, () => null);
    network.nodes['dmz-01'].hasVirusFile = true;
    expect(virus.isNodeClean('dmz-01')).toBe(false);
    network.nodes['dmz-01'].hasVirusFile = false;
  });

  it('false если hasWatchdog', () => {
    const virus = new Bloomd(network, virusConfig, () => null);
    network.nodes['dmz-01'].hasWatchdog = true;
    expect(virus.isNodeClean('dmz-01')).toBe(false);
    network.nodes['dmz-01'].hasWatchdog = false;
  });
});

describe('Bloomd — toJSON / fromJSON', () => {
  it('сохраняет и восстанавливает currentStage, mutationIndex, enabled', () => {
    const virus = new Bloomd(network, virusConfig, () => null);
    virus.setStage(5);
    virus.mutationIndex = 2;
    virus.enabled = true;
    const saved = virus.toJSON();
    const virus2 = new Bloomd(network, virusConfig, () => null);
    virus2.fromJSON(saved);
    expect(virus2.currentStage).toBe(5);
    expect(virus2.mutationIndex).toBe(2);
    expect(virus2.enabled).toBe(true);
  });
});

describe('Bloomd — per-node spread timers', () => {
  it('_scheduleNodeSpread создаёт таймер в nodeSpreadTimers', () => {
    const net = new NetworkGraph(networkTopology);
    net.infectNode('dmz-03');
    const virus = new Bloomd(net, virusConfig, () => null);
    virus.enabled = true;
    virus._scheduleNodeSpread('dmz-03');
    expect(virus.nodeSpreadTimers['dmz-03']).toBeDefined();
    virus._clearNodeSpreadTimer('dmz-03');
  });

  it('_clearNodeSpreadTimer удаляет таймер', () => {
    const net = new NetworkGraph(networkTopology);
    net.infectNode('dmz-03');
    const virus = new Bloomd(net, virusConfig, () => null);
    virus.enabled = true;
    virus._scheduleNodeSpread('dmz-03');
    virus._clearNodeSpreadTimer('dmz-03');
    expect(virus.nodeSpreadTimers['dmz-03']).toBeUndefined();
  });

  it('_doSpreadFrom(source) заражает чистого соседа source', () => {
    const net = new NetworkGraph(networkTopology);
    net.infectNode('dmz-03');
    const virus = new Bloomd(net, virusConfig, () => null);
    virus.enabled = true;
    virus.STEALTH_CHANCE = 0;

    const cleanBefore = net.getCleanNeighbors('dmz-03');
    expect(cleanBefore.length).toBeGreaterThan(0);

    virus._doSpreadFrom('dmz-03');

    const infected = net.getInfectedNodes();
    expect(infected.length).toBeGreaterThanOrEqual(2);
    expect(net.nodes['dmz-03'].infected).toBe(true);
  });

  it('_doSpreadFrom не заражает, если все соседи изолированы', () => {
    const net = new NetworkGraph(networkTopology);
    net.infectNode('dmz-03');
    const virus = new Bloomd(net, virusConfig, () => null);
    virus.enabled = true;

    const neighbors = net.getConnections('dmz-03');
    for (const n of neighbors) {
      if (!n.startsWith('mirror-')) {
        net.setIsolated(n, true);
      }
    }

    virus._doSpreadFrom('dmz-03');
    const infected = net.getInfectedNodes();
    expect(infected.length).toBe(1);
    expect(infected[0].name).toBe('dmz-03');
  });

  it('_doSpreadFrom не работает, если source не заражён', () => {
    const net = new NetworkGraph(networkTopology);
    const virus = new Bloomd(net, virusConfig, () => null);
    virus.enabled = true;
    virus._doSpreadFrom('dmz-01');
    const infected = net.getInfectedNodes();
    expect(infected.length).toBe(0);
  });

  it('_rescheduleAllNodeSpreads создаёт таймеры для всех infected', () => {
    const net = new NetworkGraph(networkTopology);
    net.infectNode('dmz-03');
    net.infectNode('core-11');
    const virus = new Bloomd(net, virusConfig, () => null);
    virus.enabled = true;
    virus._rescheduleAllNodeSpreads();
    expect(virus.nodeSpreadTimers['dmz-03']).toBeDefined();
    expect(virus.nodeSpreadTimers['core-11']).toBeDefined();
    virus._clearNodeSpreadTimer('dmz-03');
    virus._clearNodeSpreadTimer('core-11');
  });

  it('infectSilently вызывает _scheduleNodeSpread', () => {
    const net = new NetworkGraph(networkTopology);
    const virus = new Bloomd(net, virusConfig, () => null);
    virus.enabled = true;
    virus.infectSilently('dmz-03');
    expect(virus.nodeSpreadTimers['dmz-03']).toBeDefined();
    virus._clearNodeSpreadTimer('dmz-03');
  });

  it('infectStage создаёт таймеры для новых нод', () => {
    const net = new NetworkGraph(networkTopology);
    const virus = new Bloomd(net, virusConfig, () => null);
    virus.enabled = true;
    const infected = virus.infectStage(2);
    expect(infected.length).toBe(2);
    for (const name of infected) {
      expect(virus.nodeSpreadTimers[name]).toBeDefined();
      virus._clearNodeSpreadTimer(name);
    }
  });
});

describe('Bloomd — stealth', () => {
  it('STEALTH_CHANCE=0 → node.stealth=false, bloomdRunning=true', () => {
    const net = new NetworkGraph(networkTopology);
    const virus = new Bloomd(net, virusConfig, () => null);
    virus.STEALTH_CHANCE = 0;
    virus._setupVirusFiles('dmz-03');
    expect(net.nodes['dmz-03'].stealth).toBe(false);
    expect(net.nodes['dmz-03'].bloomdRunning).toBe(true);
  });

  it('STEALTH_CHANCE=1 + stage>=4 → node.stealth=true, bloomdRunning=true', () => {
    const net = new NetworkGraph(networkTopology);
    const virus = new Bloomd(net, virusConfig, () => null);
    virus.STEALTH_CHANCE = 1;
    virus.currentStage = 4;
    virus._setupVirusFiles('dmz-03');
    expect(net.nodes['dmz-03'].stealth).toBe(true);
    expect(net.nodes['dmz-03'].bloomdRunning).toBe(true);
  });

  it('повторный вызов _setupVirusFiles не перезаписывает существующий stealth', () => {
    const net = new NetworkGraph(networkTopology);
    const virus = new Bloomd(net, virusConfig, () => null);
    net.nodes['dmz-03'].stealth = true;
    net.nodes['dmz-03'].bloomdRunning = false;
    virus.STEALTH_CHANCE = 0;
    virus.currentStage = 0;
    virus._setupVirusFiles('dmz-03');
    expect(net.nodes['dmz-03'].stealth).toBe(true);
    expect(net.nodes['dmz-03'].bloomdRunning).toBe(true);
  });

  it('_autoCleanNode очищает stealth', () => {
    const net = new NetworkGraph(networkTopology);
    const virus = new Bloomd(net, virusConfig, () => null);
    net.nodes['dmz-03'].stealth = true;
    net.nodes['dmz-03'].hasVirusFile = true;
    net.nodes['dmz-03'].bloomdRunning = false;
    net.nodes['dmz-03'].hasVirusFile = false;
    virus._autoCleanNode('dmz-03');
    expect(net.nodes['dmz-03'].stealth).toBe(false);
    expect(net.nodes['dmz-03'].infected).toBe(false);
  });

  it('STEALTH_CHANCE=0.25 + stage>=4 создаёт stealth-ноды с вероятностью ~25%', () => {
    const net = new NetworkGraph(networkTopology);
    const virus = new Bloomd(net, virusConfig, () => null);
    let stealthCount = 0;
    const trials = 200;
    for (let i = 0; i < trials; i++) {
      const net2 = new NetworkGraph(networkTopology);
      const v2 = new Bloomd(net2, virusConfig, () => null);
      v2.currentStage = 4;
      v2._setupVirusFiles('dmz-03');
      if (net2.nodes['dmz-03'].stealth) stealthCount++;
    }
    const ratio = stealthCount / trials;
    expect(ratio).toBeGreaterThan(0.1);
    expect(ratio).toBeLessThan(0.45);
  });
});
