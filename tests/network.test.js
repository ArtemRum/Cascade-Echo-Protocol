import { describe, it, expect, beforeAll } from 'vitest';
import { createInstances, networkTopology } from './setup.js';

let NetworkGraph, network;

beforeAll(() => {
  const instances = createInstances();
  NetworkGraph = instances.NetworkGraph;
  network = instances.network;
});

describe('NetworkGraph — конструктор', () => {
  it('создаёт 30 узлов + 4 mirror-прокси', () => {
    const real = Object.values(network.nodes).filter(n => !n.isMirror);
    const mirrors = Object.values(network.nodes).filter(n => n.isMirror);
    expect(real.length).toBe(30);
    expect(mirrors.length).toBe(4);
  });

  it('dmz-03 начально заражён', () => {
    const node = network.nodes['dmz-03'];
    expect(node.infected).toBe(true);
    expect(node.bloomdRunning).toBe(true);
    expect(node.hasVirusFile).toBe(true);
  });

  it('dmz-01 чистый', () => {
    const node = network.nodes['dmz-01'];
    expect(node.infected).toBe(false);
    expect(node.bloomdRunning).toBe(false);
    expect(node.hasVirusFile).toBe(false);
  });

  it('у mirror-узлов установлен isMirror: true', () => {
    for (const [name, node] of Object.entries(network.nodes)) {
      if (name.startsWith('mirror-')) {
        expect(node.isMirror).toBe(true);
      }
    }
  });
});

describe('NetworkGraph — infectNode', () => {
  it('устанавливает infected, bloomdRunning, hasVirusFile', () => {
    const net = new NetworkGraph(networkTopology);
    net.cleanNode('dmz-03');
    net.infectNode('dmz-01');
    expect(net.nodes['dmz-01'].infected).toBe(true);
    expect(net.nodes['dmz-01'].bloomdRunning).toBe(true);
    expect(net.nodes['dmz-01'].hasVirusFile).toBe(true);
  });

  it('не заражает mirror-узел', () => {
    const net = new NetworkGraph(networkTopology);
    const result = net.infectNode('mirror-alpha');
    expect(result).toBe(false);
  });

  it('меняет состояние в nodeStates', () => {
    const net = new NetworkGraph(networkTopology);
    net.cleanNode('dmz-03');
    net.infectNode('dmz-02');
    expect(net.nodeStates['dmz-02']).toBe('infected');
  });
});

describe('NetworkGraph — getInfectedNodes', () => {
  it('возвращает только заражённые не-mirror узлы', () => {
    const net = new NetworkGraph(networkTopology);
    const infected = net.getInfectedNodes();
    expect(infected.length).toBe(1);
    expect(infected[0].name).toBe('dmz-03');
    infected.forEach(n => expect(n.isMirror).toBeFalsy());
  });
});

describe('NetworkGraph — getCleanNeighbors', () => {
  it('возвращает только чистые незаражённые не-mirror узлы', () => {
    const net = new NetworkGraph(networkTopology);
    const neighbors = net.getCleanNeighbors('dmz-03');
    expect(neighbors.length).toBeGreaterThan(0);
    neighbors.forEach(name => {
      const node = net.nodes[name];
      expect(node).toBeDefined();
      expect(node.infected).toBe(false);
      expect(node.isolated).toBe(false);
      expect(node.isMirror).toBeFalsy();
    });
  });

  it('не возвращает изолированные узлы', () => {
    const net = new NetworkGraph(networkTopology);
    net.setIsolated('dmz-01', true);
    const neighbors = net.getCleanNeighbors('dmz-03');
    expect(neighbors.find(n => n.name === 'dmz-01')).toBeUndefined();
  });
});

describe('NetworkGraph — setIsolated', () => {
  it('устанавливает isolated', () => {
    const net = new NetworkGraph(networkTopology);
    net.setIsolated('dmz-01', true);
    expect(net.nodes['dmz-01'].isolated).toBe(true);
    expect(net.nodeStates['dmz-01']).toBe('isolated');
  });

  it('заражённый изолированный узел не считается clean', () => {
    const net = new NetworkGraph(networkTopology);
    net.setIsolated('dmz-03', true);
    expect(net.nodeStates['dmz-03']).toBe('isolated');
  });

  it('restoreAllIsolated снимает изоляцию со всех', () => {
    const net = new NetworkGraph(networkTopology);
    net.setIsolated('dmz-01', true);
    net.setIsolated('dmz-02', true);
    const restored = net.restoreAllIsolated();
    expect(restored.length).toBe(2);
    expect(net.nodes['dmz-01'].isolated).toBe(false);
    expect(net.nodes['dmz-02'].isolated).toBe(false);
  });
});

describe('NetworkGraph — cleanNode', () => {
  it('сбрасывает все флаги вируса', () => {
    const net = new NetworkGraph(networkTopology);
    const result = net.cleanNode('dmz-03');
    expect(result).toBe(true);
    expect(net.nodes['dmz-03'].infected).toBe(false);
    expect(net.nodes['dmz-03'].bloomdRunning).toBe(false);
    expect(net.nodes['dmz-03'].hasVirusFile).toBe(false);
    expect(net.nodes['dmz-03'].hasWatchdog).toBe(false);
    expect(net.nodes['dmz-03'].crontabInfected).toBe(false);
  });

  it('не затрагивает другие узлы', () => {
    const net = new NetworkGraph(networkTopology);
    net.cleanNode('dmz-03');
    expect(net.nodes['dmz-01'].infected).toBe(false);
    expect(net.nodes['dmz-04'].infected).toBe(false);
  });
});

describe('NetworkGraph — canSsh', () => {
  it('можно подключиться к незаражённому узлу', () => {
    const net = new NetworkGraph(networkTopology);
    expect(net.canSsh('dmz-01', 'dmz-02')).toBe(true);
  });

  it('нельзя к изолированному', () => {
    const net = new NetworkGraph(networkTopology);
    net.setIsolated('dmz-02', true);
    expect(net.canSsh('dmz-01', 'dmz-02')).toBe(false);
  });

  it('нельзя с изолированного узла', () => {
    const net = new NetworkGraph(networkTopology);
    net.setIsolated('dmz-01', true);
    expect(net.canSsh('dmz-01', 'dmz-02')).toBe(false);
  });
});

describe('NetworkGraph — toJSON / fromJSON', () => {
  it('сериализует и восстанавливает состояние инфекции/изоляции', () => {
    const net = new NetworkGraph(networkTopology);
    net.infectNode('dmz-02');
    net.setIsolated('dmz-05', true);
    const saved = net.toJSON();
    const net2 = new NetworkGraph(networkTopology);
    net2.fromJSON(saved);
    expect(net2.nodes['dmz-02'].infected).toBe(true);
    expect(net2.nodes['dmz-05'].isolated).toBe(true);
    expect(net2.nodeStates['dmz-02']).toBe('infected');
    expect(net2.nodeStates['dmz-05']).toBe('isolated');
  });
});
