import { describe, it, expect, beforeAll, vi } from 'vitest';
import { createInstances, virusConfig } from './setup.js';

let USATManager, usat;

beforeAll(() => {
  const instances = createInstances();
  USATManager = instances.USATManager;
  usat = instances.usat;
});

describe('USATManager — конструктор', () => {
  it('score = 100', () => {
    const u = new USATManager(virusConfig);
    expect(u.score).toBe(100);
  });

  it('запускает complaintTimer', () => {
    const u = new USATManager(virusConfig);
    expect(u.complaintIntervalId).toBeDefined();
    u.destroy();
  });
});

describe('USATManager — modify', () => {
  it('увеличивает score', () => {
    const u = new USATManager(virusConfig);
    u.setScore(50);
    u.modify(10);
    expect(u.score).toBe(60);
    u.destroy();
  });

  it('уменьшает score', () => {
    const u = new USATManager(virusConfig);
    u.modify(-10);
    expect(u.score).toBe(90);
    u.destroy();
  });

  it('не даёт score уйти ниже 0', () => {
    const u = new USATManager(virusConfig);
    u.modify(-200);
    expect(u.score).toBe(0);
    u.destroy();
  });

  it('не даёт score подняться выше 100', () => {
    const u = new USATManager(virusConfig);
    u.modify(200);
    expect(u.score).toBe(100);
    u.destroy();
  });
});

describe('USATManager — пороги', () => {
  it('score < 15 → вызывает onFiringStart', () => {
    const u = new USATManager(virusConfig);
    const onFiringStart = vi.fn();
    u.onFiringStart = onFiringStart;
    u.setScore(14);
    expect(onFiringStart).toHaveBeenCalled();
    u.destroy();
  });

  it('score < 15 → запускает firingTimer', () => {
    const u = new USATManager(virusConfig);
    u.setScore(14);
    expect(u.firingActive).toBe(true);
    expect(u.firingTimer).toBeDefined();
    u.destroy();
  });

  it('score >= 15 → отменяет firingTimer (если был запущен)', () => {
    const u = new USATManager(virusConfig);
    u.setScore(14);
    expect(u.firingActive).toBe(true);
    u.setScore(20);
    expect(u.firingActive).toBe(false);
    expect(u.firingTimer).toBeNull();
    u.destroy();
  });

  it('score < 25 → вызывает onAutoRestore', () => {
    const u = new USATManager(virusConfig);
    const fn = vi.fn();
    u.onAutoRestore = fn;
    u.setScore(24);
    expect(fn).toHaveBeenCalled();
    u.destroy();
  });

  it('score < 40 → вызывает onWarning40', () => {
    const u = new USATManager(virusConfig);
    const fn = vi.fn();
    u.onWarning40 = fn;
    u.setScore(39);
    expect(fn).toHaveBeenCalled();
    u.destroy();
  });
});

describe('USATManager — isolation penalty', () => {
  it('dmzPenalty = -6', () => {
    const u = new USATManager(virusConfig);
    const penalty = u.getIsolationPenalty({ segment: 'dmz' });
    expect(penalty).toBe(-6);
    u.destroy();
  });

  it('corePenalty = -15', () => {
    const u = new USATManager(virusConfig);
    const penalty = u.getIsolationPenalty({ segment: 'core' });
    expect(penalty).toBe(-15);
    u.destroy();
  });

  it('archivePenalty = -9', () => {
    const u = new USATManager(virusConfig);
    const penalty = u.getIsolationPenalty({ segment: 'archive' });
    expect(penalty).toBe(-9);
    u.destroy();
  });
});

describe('USATManager — destroy', () => {
  it('отменяет complaintTimer', () => {
    const u = new USATManager(virusConfig);
    const id = u.complaintIntervalId;
    u.destroy();
    expect(u.complaintIntervalId).toBeNull();
  });

  it('отменяет firingTimer', () => {
    const u = new USATManager(virusConfig);
    u.setScore(14);
    expect(u.firingTimer).toBeDefined();
    u.destroy();
    expect(u.firingTimer).toBeNull();
  });
});

describe('USATManager — toJSON / fromJSON', () => {
  it('сохраняет и восстанавливает состояние', () => {
    const u = new USATManager(virusConfig);
    u.setScore(42);
    const saved = u.toJSON();
    const u2 = new USATManager(virusConfig);
    u2.fromJSON(saved);
    expect(u2.score).toBe(42);
    u.destroy();
    u2.destroy();
  });
});
