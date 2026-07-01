class Watchdog {
  constructor(networkGraph, config) {
    this.network = networkGraph;
    this.config = config.virus || {};
    this.stageConfig = config.stages || {};
    this.currentStage = 0;
    this.scanInterval = null;
    this.enabled = false;
    this.logs = [];
    this.onWatchdogLog = null;
  }

  start() {
    this.enabled = true;
    this._scheduleScan();
  }

  stop() {
    if (this.scanInterval) {
      clearInterval(this.scanInterval);
      this.scanInterval = null;
    }
    this.enabled = false;
  }

  setStage(stage) {
    this.currentStage = stage;
  }

  _scheduleScan() {
    const interval = (this.config.scan_interval || 15) * 1000;
    this.scanInterval = setInterval(() => {
      if (!this.enabled) return;
      this._doScan();
    }, interval);
  }

  _doScan() {
    const infectedNodes = this.network.getInfectedNodes();
    for (const node of infectedNodes) {
      if (node.isolated) continue;
      if (!node.hasWatchdog) continue;
      const stageKey = String(this.currentStage);
      const stageCfg = this.stageConfig[stageKey];
      const restoresFile = stageCfg ? stageCfg.watchdog_restores_file : false;

      if (restoresFile) {
        if (!node.hasVirusFile) {
          node.hasVirusFile = true;
          const log = `[WATCHDOG] Restored virus file on ${node.name}`;
          this.logs.push(log);
          if (this.onWatchdogLog) this.onWatchdogLog(log);
        }
        if (!node.bloomdRunning && node.hasVirusFile) {
          node.bloomdRunning = true;
          const log = `[WATCHDOG] Restarted bloomd process on ${node.name}`;
          this.logs.push(log);
          if (this.onWatchdogLog) this.onWatchdogLog(log);
        }
      } else {
        if (!node.bloomdRunning && node.hasVirusFile) {
          node.bloomdRunning = true;
          const log = `[WATCHDOG] Restarted bloomd process on ${node.name} (file exists)`;
          this.logs.push(log);
          if (this.onWatchdogLog) this.onWatchdogLog(log);
        }
      }
    }
  }

  getLogs() {
    return this.logs;
  }

  toJSON() {
    return { currentStage: this.currentStage, enabled: this.enabled };
  }

  fromJSON(data) {
    this.currentStage = data.currentStage || 0;
    this.enabled = data.enabled !== undefined ? data.enabled : true;
  }
}
