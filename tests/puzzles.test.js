import { describe, it, expect, beforeAll } from 'vitest';
import { createInstances, networkTopology, virusConfig, storyEvents } from './setup.js';

let PuzzleStages, VirtualFS, FileTypes, NetworkGraph, Bloomd, Watchdog, StoryEngineClass,
  USATManager, EmailClient, MirrorRouter, instances;

function createFullGame() {
  const inst = createInstances();
  return inst;
}

beforeAll(() => {
  instances = createFullGame();
  PuzzleStages = instances.PuzzleStages;
  VirtualFS = instances.VirtualFS;
  FileTypes = instances.FileTypes;
  NetworkGraph = instances.NetworkGraph;
});

describe('PuzzleStages — advanceTo', () => {
  it('вызывает story.setStage, virus.setStage', () => {
    const { game, story, virus } = createFullGame();
    const initialStage = story.currentStage;
    game.puzzles.advanceTo(1);
    expect(story.currentStage).toBe(1);
  });

  it('на stage 1 вызывает story.fireEvent(\'stage_1_first_infection\')', () => {
    const { game, story } = createFullGame();
    const spy = vi.spyOn(story, 'fireEvent');
    game.puzzles.advanceTo(1);
    expect(spy).toHaveBeenCalledWith('stage_1_first_infection');
  });
});

describe('PuzzleStages — _isStageComplete', () => {
  it('stage 0: tutorialProcessKilled && tutorialFileRemoved → true', () => {
    const { game } = createFullGame();
    game.puzzles.puzzleState.tutorialProcessKilled = true;
    game.puzzles.puzzleState.tutorialFileRemoved = true;
    expect(game.puzzles._isStageComplete(0)).toBe(true);
  });

  it('stage 1: таймер >= 600 → true', () => {
    const { game } = createFullGame();
    game.puzzles.stageTimers[1] = 600;
    expect(game.puzzles._isStageComplete(1)).toBe(true);
  });

  it('stage 2: таймер >= 1020 И containedRatio > 0.3 → true', () => {
    const { game, network } = createFullGame();
    game.puzzles.stageTimers[2] = 1020;
    // Clean dmz-03 (only initially infected node)
    network.cleanNode('dmz-03');
    expect(game.puzzles._isStageComplete(2)).toBe(true);
  });

  it('stage 3: echoDiscovered → true', () => {
    const { game } = createFullGame();
    game.puzzles.puzzleState.echoDiscovered = true;
    expect(game.puzzles._isStageComplete(3)).toBe(true);
  });

  it('stage 4: journalRead → true', () => {
    const { game } = createFullGame();
    game.puzzles.puzzleState.journalRead = true;
    expect(game.puzzles._isStageComplete(4)).toBe(true);
  });

  it('stage 5: таймер >= 30 → true', () => {
    const { game } = createFullGame();
    game.puzzles.stageTimers[5] = 30;
    expect(game.puzzles._isStageComplete(5)).toBe(true);
  });
});

describe('PuzzleStages — _checkBranchOutcomes', () => {
  it('infected >= totalReal - 2 → flag ending_virus_wins', () => {
    const { game, network, story } = createFullGame();
    // Infect all nodes
    for (const name of Object.keys(network.nodes)) {
      if (!name.startsWith('mirror-')) {
        network.infectNode(name);
      }
    }
    game.puzzles._checkBranchOutcomes();
    expect(story.getFlag('ending_virus_wins')).toBe(true);
  });
});

describe('PuzzleStages — checkEchoAction', () => {
  it('delete /archive/echo → echoDeleted = true', () => {
    const { game, puzzles } = createFullGame();
    puzzles.checkEchoAction('/archive/echo', 'delete');
    expect(puzzles.puzzleState.echoDeleted).toBe(true);
  });

  it('copy keys/encryption.key → keysExposed = true', () => {
    const { puzzles } = createFullGame();
    puzzles.checkEchoAction('/archive/echo/keys/encryption.key', 'copy');
    expect(puzzles.puzzleState.keysExposed).toBe(true);
  });

  it('copy to .shadow/ → shadowCopyMade = true', () => {
    const { puzzles } = createFullGame();
    puzzles.checkEchoAction('/tmp/.shadow/echo', 'copy');
    expect(puzzles.puzzleState.shadowCopyMade).toBe(true);
  });
});

describe('PuzzleStages — onFileRead', () => {
  it('чтение journal.txt → journalRead = true', () => {
    const { puzzles } = createFullGame();
    puzzles.onFileRead('/archive/echo/journal.txt');
    expect(puzzles.puzzleState.journalRead).toBe(true);
  });

  it('чтение /archive/echo/ → echoDiscovered = true', () => {
    const { puzzles } = createFullGame();
    puzzles.onFileRead('/archive/echo/journal.txt');
    expect(puzzles.puzzleState.echoDiscovered).toBe(true);
  });
});
