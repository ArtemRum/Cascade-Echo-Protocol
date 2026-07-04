class PuzzleStages {
  constructor(story, virus, network, mirror, email, filesystems) {
    this.story = story;
    this.virus = virus;
    this.network = network;
    this.mirror = mirror;
    this.email = email;
    this.filesystems = filesystems;
    this.stageTimers = {};
    this.puzzleState = {
      firstSshDone: false,
      bloomdKilled: false,
      nodeIsolated: false,
      mirrorsResolved: 0,
      watchdogKilled: false,
      echoDiscovered: false,
      journalRead: false,
      keysExposed: false,
      echoDeleted: false,
      shadowCopyMade: false,
    };
    this.branchDecided = false;
  }

  advanceTo(stage) {
    const { story, virus, network, mirror } = this;
    story.setStage(stage);
    if (stage >= 3) {
      this._injectMirrorLogs();
    }
    if (stage === 1) {
      story.fireEvent('stage_1_first_infection');
    }
    return true;
  }

  _injectMirrorLogs() {
    const mirrorLog = '[WARN] Asymmetric route detected. Possible proxy manipulation.';
    const mirrorNodes = Object.values(this.network.mirrorProxies || {});
    const nodes = mirrorNodes.flatMap(p => p.connected_to || []);
    for (const name of nodes) {
      const fs = this.filesystems[name];
      if (fs) {
        const log = fs.readFile('/var/log/syslog') || '';
        fs.writeFile('/var/log/syslog', log + `${new Date().toISOString()} ${name} ${mirrorLog}\n`);
      }
    }
  }

  tick(seconds) {
    if (this.story.isGameOver()) return;
    const stage = this.story.currentStage;

    if (stage >= 3) {
      this._checkBranchOutcomes();
      if (this.story.isGameOver()) return;
    }

    if (stage >= 6) {
      this._checkEndingTriggers();
      return;
    }

    if (!this.stageTimers[stage]) this.stageTimers[stage] = 0;
    this.stageTimers[stage] += seconds;

    if (this._isStageComplete(stage)) {
      this._advance();
    }
  }

  _isStageComplete(stage) {
    switch (stage) {
      case 0: return this.stageTimers[0] >= 300;
      case 1: return this.stageTimers[1] >= 600;
      case 2: return this.stageTimers[2] >= 1020 && this.network.getCleanRatio() > 0.3;
      case 3: return this.puzzleState.echoDiscovered;
      case 4: return this.puzzleState.journalRead;
      case 5: return this.stageTimers[5] >= 2;
      default: return false;
    }
  }

  _advance() {
    const next = this.story.currentStage + 1;
    if (next > 6) return;
    this.advanceTo(next);
    this._fireEntryEmail(next);
  }

  _fireEntryEmail(stage) {
    const map = {
      1: 'stage_1_start',
      3: 'stage_3_mirror',
      4: 'stage_4_crontab',
      5: 'stage_5_archive',
      6: 'stage_6_decision',
    };
    const id = map[stage];
    if (id) this.email.addPlotEmail(id);
  }

  _checkBranchOutcomes() {
    const { story, network } = this;
    if (this.branchDecided) return;
    const stage = story.currentStage;

    const totalReal = Object.values(network.nodes).filter(n => !n.isMirror).length;
    const infectedCount = network.getInfectedNodes().length;

    if (infectedCount >= totalReal - 2) {
      story.setFlag('ending_virus_wins', true);
      this.branchDecided = true;
      return;
    }

    if (stage === 3 && this.puzzleState.echoDiscovered) {
      this._advance();
      return;
    }

    if (this.puzzleState.watchdogKilled && this.puzzleState.mirrorsResolved >= 2) {
      story.setFlag('ending_beat_virus', true);
      this.branchDecided = true;
      return;
    }
  }

  _checkEndingTriggers() {
    const { story, network } = this;
    if (story.isGameOver()) return;

    if (story.getFlag('ending_expose') || story.getFlag('ending_loyalty') ||
        story.getFlag('ending_shadow') || story.getFlag('ending_firefighting')) {
      return;
    }

    if (this.puzzleState.keysExposed) {
      story.setFlag('ending_expose', true);
    }
    if (this.puzzleState.echoDeleted) {
      story.setFlag('ending_loyalty', true);
    }
    if (this.puzzleState.shadowCopyMade) {
      story.setFlag('ending_shadow', true);
    }

    const infected = Object.values(network.nodes).filter(n => n.infected && !n.isMirror);
    const allIsolated = infected.length > 0 && infected.every(n => n.isolated);
    if (allIsolated) {
      story.setFlag('ending_firefighting', true);
    }
  }

  checkEchoAction(path, action) {
    if (path.includes('/archive/echo') || path.includes('echo')) {
      if (action === 'delete') {
        if (path.includes('echo')) this.puzzleState.echoDeleted = true;
      }
      if (action === 'copy') {
        if (path.includes('keys') || path.includes('encryption')) {
          this.puzzleState.keysExposed = true;
        }
        if (path.includes('.shadow') || path.includes('shadow')) {
          this.puzzleState.shadowCopyMade = true;
        }
      }
      return true;
    }
    return false;
  }

  onFileRead(path) {
    if (path.includes('journal.txt') || path.includes('journal')) {
      this.puzzleState.journalRead = true;
    }
    if (path.includes('archive/echo') || path.includes('/archive/echo/')) {
      this.puzzleState.echoDiscovered = true;
    }
  }

  onSshConnected() { this.puzzleState.firstSshDone = true; }
  onBloomdKilled() { this.puzzleState.bloomdKilled = true; }
  onNodeIsolated() { this.puzzleState.nodeIsolated = true; }
  onRouteResolved() { this.puzzleState.mirrorsResolved++; }
  onWatchdogKilled() { this.puzzleState.watchdogKilled = true; }

  getClue(stage) {
    const clues = {
      1: 'Check processes with "ps aux" or "top". Look for "bloomd".\nSearch files with: find / -name "*.bloomd*" 2>/dev/null',
      2: 'The virus spreads through network connections. Isolate nodes with: ifconfig eth0 down\nCheck USAT in status bar.',
      3: 'Network routes are being manipulated. Use "traceroute" to see the path.\nAdd static routes: route add -net <target> gw <gateway>\nKill the watchdog before the virus file!',
      4: 'Hidden project found: /archive/echo/ on core-14. Read journal.txt.',
      5: 'Read journal.txt. Then choose:\n  Expose: cp /archive/echo/keys/encryption.key /tmp/\n  Loyalty: rm -rf /archive/echo\n  Shadow: cp -r /archive/echo /tmp/.shadow\n  Firefight: isolate all infected nodes',
    };
    return clues[stage] || '';
  }

  toJSON() {
    return {
      puzzleState: this.puzzleState,
      stageTimers: this.stageTimers,
      branchDecided: this.branchDecided,
    };
  }

  restore() {
    const stage = this.story.currentStage;
    if (stage >= 3) this._injectMirrorLogs();
  }

  fromJSON(data) {
    if (data.puzzleState) this.puzzleState = { ...this.puzzleState, ...data.puzzleState };
    if (data.stageTimers) this.stageTimers = data.stageTimers;
    if (data.branchDecided !== undefined) this.branchDecided = data.branchDecided;
  }
}
