class PuzzleStages {
  constructor(game) {
    this.game = game;
    this.stageHandlers = {
      0: this._stage0.bind(this),
      1: this._stage1.bind(this),
      2: this._stage2.bind(this),
      3: this._stage3.bind(this),
      4: this._stage4.bind(this),
      5: this._stage5.bind(this),
      6: this._stage6.bind(this),
    };
  }

  getHandler(stage) {
    return this.stageHandlers[stage] || null;
  }

  advanceTo(stage) {
    const { story, virus, network, mirror } = this.game;
    story.setStage(stage);
    virus.setStage(stage);
    if (virus.enabled === false && stage > 0) {
      virus.start();
    }
    if (stage >= 3) {
      mirror.startDrift();
    }
    if (stage >= 5) {
      this._setupEchoProject();
    }
    return true;
  }

  _stage0() {
    const { story } = this.game;
    story.fireEvent('stage_0');
    return 'Tutorial stage active. Follow assistant instructions.';
  }

  _stage1() {
    const { story, network } = this.game;
    network.infectNode('dmz-03');
    story.fireEvent('stage_1');
    story.fireEvent('stage_1_first_infection');
    return 'Stage 1: First bloom detected on dmz-03. Investigate and contain.';
  }

  _stage2() {
    const { story, network } = this.game;
    network.infectNode('dmz-07');
    network.infectNode('dmz-05');
    story.fireEvent('stage_2');
    return 'Stage 2: Virus propagating. Multiple nodes infected. Consider isolation.';
  }

  _stage3() {
    const { story, network } = this.game;
    network.infectNode('dmz-01');
    for (const node of ['dmz-03', 'dmz-07', 'dmz-05', 'dmz-01']) {
      if (network.nodes[node]) {
        network.nodes[node].hasWatchdog = true;
      }
    }
    story.fireEvent('stage_3');
    return 'Stage 3: Watchdog active. Mirrors distorting routes. Use traceroute and route add.';
  }

  _stage4() {
    const { story, network } = this.game;
    network.infectNode('core-11');
    for (const node of network.getInfectedNodes()) {
      node.crontabInfected = true;
    }
    story.fireEvent('stage_4');
    return 'Stage 4: Virus achieving persistence via crontab. Check /etc/crontab on infected nodes.';
  }

  _stage5() {
    const { story, network } = this.game;
    network.infectNode('core-17');
    this._setupEchoProject();
    story.fireEvent('stage_5');
    return 'Stage 5: Archive segment compromised. Echo project discovered at /archive/echo/.';
  }

  _stage6() {
    const { story } = this.game;
    story.fireEvent('stage_6');
    return 'Stage 6: Final choice. Read journal.txt in /archive/echo/ and decide your path.';
  }

  _setupEchoProject() {
    const { network } = this.game;
    const core14 = network.nodes['core-14'];
    if (!core14) return;
  }

  checkPuzzleCompletion(stage, action) {
    const { virus, network } = this.game;
    switch (stage) {
      case 1:
        return network.getInfectedNodes().length === 0;
      case 2:
        return network.getInfectedNodes().length === 0;
      case 3: {
        const infected = network.getInfectedNodes();
        return infected.length === 0 || infected.every(n => n.isolated);
      }
      case 4: {
        const infected = network.getInfectedNodes();
        return infected.every(n => virus.isNodeClean(n.name) || n.isolated);
      }
      case 5:
      case 6:
        return false;
      default:
        return false;
    }
  }

  toJSON() {
    return {};
  }

  fromJSON(data) {}
}
