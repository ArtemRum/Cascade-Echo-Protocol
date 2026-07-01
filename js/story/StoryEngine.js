class StoryEngine {
  constructor(storyData, networkGraph, virus, usatManager, emailClient, mirrorRouter) {
    this.data = storyData;
    this.network = networkGraph;
    this.virus = virus;
    this.usat = usatManager;
    this.email = emailClient;
    this.mirror = mirrorRouter;
    this.currentStage = 0;
    this.completedStages = [];
    this.flags = {};
    this.ending = null;
    this.onStageChange = null;
    this.onSystemMessage = null;
    this.onAssistantMessage = null;
    this.assistantActive = true;
    this.stageEventsFired = {};
  }

  setStage(stage) {
    this.currentStage = stage;
    this.completedStages.push(stage);
    this.virus.setStage(stage);
    if (this.virus.enabled === false && stage > 0) {
      this.virus.start();
    }
    if (stage >= 3 && this.mirror) {
      this.mirror.startDrift();
    }
    if (this.onStageChange) this.onStageChange(stage);
    this._fireStageEvents(stage);
  }

  _fireStageEvents(stage) {
    if (this.stageEventsFired[stage]) return;
    this.stageEventsFired[stage] = true;
    const events = this.data?.story_events?.['stage_' + stage] || [];
    for (const event of events) {
      setTimeout(() => {
        if (event.type === 'system_message' && this.onSystemMessage) {
          this.onSystemMessage(event.content);
        } else if (event.type === 'assistant_message' && this.onAssistantMessage && this.assistantActive) {
          this.onAssistantMessage(event.content);
        } else if (event.type === 'email') {
          this.email.addPlotEmail(event.email_id);
        }
      }, 1000);
    }
  }

  fireEvent(eventName) {
    const events = this.data?.story_events?.[eventName] || [];
    for (const event of events) {
      if (event.type === 'system_message' && this.onSystemMessage) {
        this.onSystemMessage(event.content);
      } else if (event.type === 'assistant_message' && this.onAssistantMessage && this.assistantActive) {
        this.onAssistantMessage(event.content);
      } else if (event.type === 'email') {
        this.email.addPlotEmail(event.email_id);
      }
    }
  }

  setFlag(name, value = true) {
    this.flags[name] = value;
  }

  getFlag(name) {
    return this.flags[name] || false;
  }

  disableAssistant() {
    this.assistantActive = false;
  }

  enableAssistant() {
    this.assistantActive = true;
  }

  checkEndingConditions() {
    const infectedCount = this.network.getInfectedNodes().length;
    const totalNodes = Object.keys(this.network.nodes).filter(n => !this.network.nodes[n].isMirror).length;
    const isolatedCount = this.network.getIsolatedNodes().length;

    if (this.currentStage >= 6) {
      if (this.getFlag('ending_expose')) return 'expose';
      if (this.getFlag('ending_loyalty')) return 'loyalty';
      if (this.getFlag('ending_shadow')) return 'shadow';
      if (this.getFlag('ending_firefighting')) return 'firefighting';
    }

    if (isolatedCount >= infectedCount && infectedCount > 0 && this.currentStage >= 3) {
      return 'firefighting_possible';
    }

    if (this.usat.score <= 0) {
      return 'fired';
    }

    return null;
  }

  triggerEnding(type) {
    this.ending = type;
    if (this.email) {
      this.email.addPlotEmail('ending_' + type);
    }
    return type;
  }

  isGameOver() {
    return this.ending !== null;
  }

  getEndingText() {
    const endings = {
      'expose': '=== ENDING: EXPOSURE ===\n\nYou copied the encryption keys to Mirage\'s directory and disabled archive protection. Within hours, the Echo project data was public. Cascade Dynamics faced international investigation. Alexei Werner was vindicated. You were fired — but you sleep well at night.\n\nSome mirrors can\'t be unmade. But the truth can finally be seen.\n\nThanks for playing Cascade: Echo Protocol.',
      'loyalty': '=== ENDING: LOYALTY ===\n\nYou deleted every trace of the Echo project. The files, the logs, the backups — all gone. Cascade Dynamics continued operations as if nothing happened. You received a promotion and a bonus.\n\nBut sometimes, late at night, you wonder what was in those files.\n\nThe mirror showed you the truth. You looked away.\n\nThanks for playing Cascade: Echo Protocol.',
      'shadow': '=== ENDING: SHADOW ===\n\nYou created a third copy in /tmp/.shadow. Neither Mirage nor Cascade knows it exists. The power of knowledge, held in reserve.\n\nYou walk a narrow path between light and dark. The mirror reflects a ghost.\n\nThanks for playing Cascade: Echo Protocol.',
      'firefighting': '=== ENDING: FIREFIGHTING ===\n\nYou isolated every infected node. The virus couldn\'t spread. But neither could data flow. User satisfaction crashed to zero. Cascade\'s board had no choice — they fired you to save face.\n\nThe virus died. So did your career. Some fires leave nothing but ash.\n\nThanks for playing Cascade: Echo Protocol.',
      'fired': '=== ENDING: TERMINATED ===\n\nUser satisfaction dropped below 15%. The board lost confidence. Security escorted you out of the building before midnight.\n\nThe virus still blooms in Cascade\'s network. You won\'t be there to stop it.\n\nThanks for playing Cascade: Echo Protocol.',
    };
    return endings[type] || '=== ENDING: UNKNOWN ===\n\nThe network hums in the dark. Your fate is unclear.\n\nThanks for playing Cascade: Echo Protocol.';
  }

  toJSON() {
    return {
      currentStage: this.currentStage,
      completedStages: this.completedStages,
      flags: this.flags,
      ending: this.ending,
      assistantActive: this.assistantActive,
      stageEventsFired: this.stageEventsFired,
    };
  }

  fromJSON(data) {
    this.currentStage = data.currentStage || 0;
    this.completedStages = data.completedStages || [];
    this.flags = data.flags || {};
    this.ending = data.ending || null;
    this.assistantActive = data.assistantActive !== undefined ? data.assistantActive : true;
    this.stageEventsFired = data.stageEventsFired || {};
  }
}
