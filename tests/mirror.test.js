import { describe, it, expect, beforeAll } from 'vitest';
import { createInstances } from './setup.js';

let MirrorRouter, VirtualFS, FileTypes, network, mirror;

beforeAll(() => {
  const instances = createInstances();
  MirrorRouter = instances.MirrorRouter;
  network = instances.network;
  mirror = instances.mirror;
});

describe('MirrorRouter — дрейф IP', () => {
  it('_doDrift увеличивает последний октет по паттерну', () => {
    const initialIp = network.nodes['mirror-alpha'].ip;
    mirror._doDrift('mirror-alpha');
    expect(network.nodes['mirror-alpha'].ip).not.toBe(initialIp);
  });

  it('resolveMirror устанавливает node.routed = true', () => {
    const result = mirror.resolveMirror('mirror-alpha');
    expect(result).toBe(true);
    expect(network.nodes['mirror-alpha'].routed).toBe(true);
  });
});

describe('MirrorRouter — toJSON / fromJSON', () => {
  it('сохраняет и восстанавливает состояние', () => {
    const saved = mirror.toJSON();
    expect(saved.driftOffsets).toBeDefined();
    expect(saved.routesAdded).toBeDefined();
    expect(saved.mirrorStates).toBeDefined();
  });
});
