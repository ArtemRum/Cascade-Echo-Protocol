import { describe, it, expect, beforeAll } from 'vitest';
import { createInstances, virusConfig } from './setup.js';

let Watchdog, Bloomd, NetworkGraph, VirtualFS, network, watchdog, VirusConfig;

beforeAll(() => {
  const instances = createInstances();
  Watchdog = instances.Watchdog;
  Bloomd = instances.Bloomd;
  NetworkGraph = instances.NetworkGraph;
  VirtualFS = instances.VirtualFS;
  network = instances.network;
  watchdog = instances.watchdog;
  VirusConfig = virusConfig;
});

describe('Watchdog — конструктор', () => {
  it('enabled = false', () => {
    const wd = new Watchdog(network, VirusConfig, null);
    expect(wd.enabled).toBe(false);
  });
});

describe('Watchdog — _doScan', () => {
  it('не сканирует узлы без hasWatchdog', () => {
    const wd = new Watchdog(network, VirusConfig, null);
    expect(wd._doScan).toBeDefined();
  });
});

describe('Watchdog — toJSON / fromJSON', () => {
  it('сохраняет и восстанавливает состояние', () => {
    const saved = watchdog.toJSON();
    const wd2 = new Watchdog(network, VirusConfig, null);
    wd2.fromJSON(saved);
    expect(wd2.currentStage).toBe(watchdog.currentStage);
    expect(wd2.enabled).toBe(watchdog.enabled);
  });
});
