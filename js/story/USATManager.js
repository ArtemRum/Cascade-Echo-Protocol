class USATManager {
  constructor(config) {
    const usatCfg = config.usat || {};
    this.score = usatCfg.initial || 100;
    this.maxScore = 100;
    this.dmzPenalty = usatCfg.dmz_penalty || 2;
    this.corePenalty = usatCfg.core_penalty || 5;
    this.archivePenalty = usatCfg.archive_penalty || 3;
    this.complaintInterval = (usatCfg.complaint_interval || 30) * 1000;
    this.autoRestoreThreshold = usatCfg.auto_restore_threshold || 25;
    this.firingThreshold = usatCfg.firing_threshold || 15;
    this.firingTimerDuration = (usatCfg.firing_timer || 300) * 1000;
    this.managementWarningThreshold = usatCfg.management_warning_threshold || 40;
    this.firingTimer = null;
    this.firingActive = false;
    this.warningGiven40 = false;
    this.warningGiven25 = false;
    this.onAutoRestore = null;
    this.onFiringStart = null;
    this.onFiringTimeout = null;
    this.onWarning40 = null;
    this.onComplaintTick = null;
    this.complaintIntervalId = null;
    this._startComplaintTimer();
  }

  modify(delta) {
    this.score = Math.max(0, Math.min(this.maxScore, this.score + delta));
    this._checkThresholds();
    return this.score;
  }

  setScore(value) {
    this.score = Math.max(0, Math.min(this.maxScore, value));
    this._checkThresholds();
    return this.score;
  }

  getIsolationPenalty(node) {
    if (!node) return 0;
    switch (node.segment) {
      case 'dmz': return -this.dmzPenalty;
      case 'core': return -this.corePenalty;
      case 'archive': return -this.archivePenalty;
      default: return 0;
    }
  }

  getRestoreGain(node) {
    if (!node) return 0;
    switch (node.segment) {
      case 'dmz': return this.dmzPenalty;
      case 'core': return this.corePenalty;
      case 'archive': return this.archivePenalty;
      default: return 0;
    }
  }

  _checkThresholds() {
    if (this.score < this.firingThreshold && !this.firingActive) {
      this._startFiringTimer();
    } else if (this.score >= this.firingThreshold && this.firingActive) {
      this._cancelFiringTimer();
    }

    if (this.score < this.autoRestoreThreshold && !this.warningGiven25) {
      this.warningGiven25 = true;
      if (this.onAutoRestore) this.onAutoRestore();
    } else if (this.score >= this.autoRestoreThreshold) {
      this.warningGiven25 = false;
    }

    if (this.score < this.managementWarningThreshold && !this.warningGiven40) {
      this.warningGiven40 = true;
      if (this.onWarning40) this.onWarning40(this.score);
    } else if (this.score >= this.managementWarningThreshold) {
      this.warningGiven40 = false;
    }
  }

  _startComplaintTimer() {
    this.complaintIntervalId = setInterval(() => {
      if (this.score < 100) {
        this.modify(-1);
        if (this.onComplaintTick) this.onComplaintTick(this.score);
      }
    }, this.complaintInterval);
  }

  _startFiringTimer() {
    this.firingActive = true;
    if (this.onFiringStart) this.onFiringStart(this.firingTimerDuration);
    this.firingTimer = setTimeout(() => {
      if (this.onFiringTimeout) this.onFiringTimeout();
    }, this.firingTimerDuration);
  }

  _cancelFiringTimer() {
    this.firingActive = false;
    if (this.firingTimer) {
      clearTimeout(this.firingTimer);
      this.firingTimer = null;
    }
  }

  destroy() {
    this._cancelFiringTimer();
    if (this.complaintIntervalId) {
      clearInterval(this.complaintIntervalId);
      this.complaintIntervalId = null;
    }
  }

  toJSON() {
    return {
      score: this.score,
      warningGiven40: this.warningGiven40,
      warningGiven25: this.warningGiven25,
      firingActive: this.firingActive,
    };
  }

  fromJSON(data) {
    this.score = data.score || 100;
    this.warningGiven40 = data.warningGiven40 || false;
    this.warningGiven25 = data.warningGiven25 || false;
    this.firingActive = data.firingActive || false;
  }
}
