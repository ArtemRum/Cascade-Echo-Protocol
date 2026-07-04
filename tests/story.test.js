import { describe, it, expect, beforeAll, vi } from 'vitest';
import { createInstances, storyEvents, virusConfig } from './setup.js';

let StoryEngine, StoryEngineClass, network, virus, usat, email, mirror, watchdog;

beforeAll(() => {
  const instances = createInstances();
  StoryEngineClass = instances.StoryEngine;
  network = instances.network;
  virus = instances.virus;
  usat = instances.usat;
  email = instances.email;
  mirror = instances.mirror;
  watchdog = instances.watchdog;
  StoryEngine = instances.story;
});

describe('StoryEngine — setStage', () => {
  it('обновляет currentStage', () => {
    const s = new StoryEngineClass(storyEvents, network, virus, usat, email, mirror, watchdog);
    s.setStage(2);
    expect(s.currentStage).toBe(2);
  });

  it('добавляет stage в completedStages', () => {
    const s = new StoryEngineClass(storyEvents, network, virus, usat, email, mirror, watchdog);
    s.setStage(1);
    expect(s.completedStages).toContain(1);
  });

  it('вызывает onStageChange колбэк', () => {
    const s = new StoryEngineClass(storyEvents, network, virus, usat, email, mirror, watchdog);
    const fn = vi.fn();
    s.onStageChange = fn;
    s.setStage(2);
    expect(fn).toHaveBeenCalledWith(2);
  });

  it('запускает вирус если stage > 0 и он выключен', () => {
    const s = new StoryEngineClass(storyEvents, network, virus, usat, email, mirror, watchdog);
    virus.stop();
    expect(virus.enabled).toBe(false);
    s.setStage(1);
    expect(virus.enabled).toBe(true);
  });
});

describe('StoryEngine — fireEvent', () => {
  it('обрабатывает email', () => {
    const s = new StoryEngineClass(storyEvents, network, virus, usat, email, mirror, watchdog);
    s.fireEvent('stage_1');
    // stage_1 fires an email event (stage_1_start email_id)
    expect(email.inbox.length).toBeGreaterThan(0);
  });
});

describe('StoryEngine — checkEndingConditions', () => {
  it('flag ending_virus_wins → virus_wins', () => {
    const s = new StoryEngineClass(storyEvents, network, virus, usat, email, mirror, watchdog);
    s.setFlag('ending_virus_wins');
    expect(s.checkEndingConditions()).toBe('virus_wins');
  });

  it('flag ending_beat_virus → beat_virus', () => {
    const s = new StoryEngineClass(storyEvents, network, virus, usat, email, mirror, watchdog);
    s.setFlag('ending_beat_virus');
    expect(s.checkEndingConditions()).toBe('beat_virus');
  });

  it('stage >= 6 + flag ending_expose → expose', () => {
    const s = new StoryEngineClass(storyEvents, network, virus, usat, email, mirror, watchdog);
    s.setStage(6);
    s.setFlag('ending_expose');
    expect(s.checkEndingConditions()).toBe('expose');
  });

  it('stage >= 6 + flag ending_loyalty → loyalty', () => {
    const s = new StoryEngineClass(storyEvents, network, virus, usat, email, mirror, watchdog);
    s.setStage(6);
    s.setFlag('ending_loyalty');
    expect(s.checkEndingConditions()).toBe('loyalty');
  });

  it('stage >= 6 + flag ending_shadow → shadow', () => {
    const s = new StoryEngineClass(storyEvents, network, virus, usat, email, mirror, watchdog);
    s.setStage(6);
    s.setFlag('ending_shadow');
    expect(s.checkEndingConditions()).toBe('shadow');
  });

  it('stage >= 6 + flag ending_firefighting → firefighting', () => {
    const s = new StoryEngineClass(storyEvents, network, virus, usat, email, mirror, watchdog);
    s.setStage(6);
    s.setFlag('ending_firefighting');
    expect(s.checkEndingConditions()).toBe('firefighting');
  });

  it('usat.score <= 0 → fired', () => {
    const s = new StoryEngineClass(storyEvents, network, virus, usat, email, mirror, watchdog);
    usat.setScore(0);
    expect(s.checkEndingConditions()).toBe('fired');
  });
});

describe('StoryEngine — getEndingText', () => {
  it('возвращает текст для каждого типа концовки', () => {
    const s = new StoryEngineClass(storyEvents, network, virus, usat, email, mirror, watchdog);
    const types = ['beat_virus', 'virus_wins', 'expose', 'loyalty', 'shadow', 'firefighting', 'fired'];
    for (const t of types) {
      const text = s.getEndingText(t);
      expect(text).toContain('ENDING');
    }
  });

  it('возвращает UNKNOWN для несуществующего типа', () => {
    const s = new StoryEngineClass(storyEvents, network, virus, usat, email, mirror, watchdog);
    const text = s.getEndingText('nonexistent');
    expect(text).toContain('UNKNOWN');
  });
});

describe('StoryEngine — toJSON / fromJSON', () => {
  it('сохраняет и восстанавливает состояние', () => {
    const s = new StoryEngineClass(storyEvents, network, virus, usat, email, mirror, watchdog);
    s.setStage(3);
    s.setFlag('ending_expose');
    const saved = s.toJSON();
    const s2 = new StoryEngineClass(storyEvents, network, virus, usat, email, mirror, watchdog);
    s2.fromJSON(saved);
    expect(s2.currentStage).toBe(3);
    expect(s2.getFlag('ending_expose')).toBe(true);
  });
});
