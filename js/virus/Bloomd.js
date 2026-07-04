class Bloomd {
  constructor(networkGraph, config, getFS) {
    this.network = networkGraph;
    this.config = config.virus || {};
    this.stageConfig = config.stages || {};
    this.getFS = getFS || (() => null);
    this.currentStage = 0;
    this.spreadInterval = null;
    this.virusProcesses = {};
    this.mutationIndex = 0;
    this.onSpread = null;
    this.onBloomEffect = null;
    this.enabled = false;
  }

  start() {
    this.enabled = true;
    this._scheduleSpread();
  }

  stop() {
    if (this.spreadInterval) {
      clearTimeout(this.spreadInterval);
      this.spreadInterval = null;
    }
    this.enabled = false;
  }

  setStage(stage) {
    this.currentStage = stage;
    const stageKey = String(stage);
    const stageCfg = this.stageConfig[stageKey];
    if (stageCfg && stageCfg.spread_interval > 0) {
      if (this.spreadInterval) clearTimeout(this.spreadInterval);
      this._scheduleSpread();
    }
  }

  _scheduleSpread() {
    if (!this.enabled) return;
    const stageKey = String(this.currentStage);
    const stageCfg = this.stageConfig[stageKey];
    const interval = (stageCfg && stageCfg.spread_interval > 0) ? stageCfg.spread_interval * 1000 : 420000;
    this.spreadInterval = setTimeout(() => {
      this._doSpread();
      this._scheduleSpread();
    }, interval);
  }

  _doSpread() {
    if (!this.enabled) return;
    const infected = this.network.getInfectedNodes();
    if (infected.length === 0) return;
    const source = infected[Math.floor(Math.random() * infected.length)];
    const cleanNeighbors = this.network.getCleanNeighbors(source.name);
    if (cleanNeighbors.length === 0) return;
    const target = cleanNeighbors[Math.floor(Math.random() * cleanNeighbors.length)];
    this.network.infectNode(target);
    this._setupVirusFiles(target);
    if (this.onBloomEffect) this.onBloomEffect(target);
    if (this.onSpread) this.onSpread(target);
  }

  _setupVirusFiles(nodeName) {
    const node = this.network.nodes[nodeName];
    if (!node) return;
    const virusPath = this._getVirusPath();
    const watchdogPath = this.config.watchdog_path || '/usr/sbin/.bloom_watchdog';
    const fs = this.getFS(nodeName);

    if (fs) {
      fs.writeFile(virusPath, Utils.ELF_BINARY);
    }
    node.hasVirusFile = true;
    node.bloomdRunning = true;

    if (this.currentStage >= 3) {
      if (fs) {
        fs.writeFile(watchdogPath, Utils.ELF_BINARY);
      }
      node.hasWatchdog = true;
    }
    if (this.currentStage >= 4) {
      if (fs) {
        const crontab = fs.readFile('/etc/crontab') || '';
        const entry = this.config.crontab_entry || '*/5 * * * * root /usr/lib/.bloomd';
        if (!crontab.includes(entry)) {
          fs.writeFile('/etc/crontab', crontab + entry + '\n');
        }
        const rc = fs.readFile('/etc/rc.local') || '';
        const rcEntry = this.config.rc_local_entry || '/usr/lib/.bloomd &';
        if (!rc.includes(rcEntry)) {
          fs.writeFile('/etc/rc.local', rc + '\n' + rcEntry + '\n');
        }
      }
      node.crontabInfected = true;
    }
  }

  createPhysicalFile(nodeName) {
    const fs = this.getFS(nodeName);
    if (!fs) return;
    const virusPath = this._getVirusPath();
    fs.writeFile(virusPath, Utils.ELF_BINARY);
  }

  setupInitialInfected() {
    for (const node of Object.values(this.network.nodes)) {
      if (node.infected && !node.isMirror) {
        this._setupVirusFiles(node.name);
      }
    }
  }

  _getVirusPath() {
    const mutations = this.config.mutations_stage_3 || ['.bloomd'];
    const lateMutations = this.config.mutations_stage_5 || ['.syslogd'];
    if (this.currentStage >= 5) {
      const idx = this.mutationIndex % lateMutations.length;
      return '/usr/lib/' + lateMutations[idx];
    }
    if (this.currentStage >= 3) {
      const idx = this.mutationIndex % mutations.length;
      return '/usr/lib/' + mutations[idx];
    }
    return this.config.initial_path || '/usr/lib/.bloomd';
  }

  getVirusPath() {
    return this._getVirusPath();
  }

  getWatchdogPath() {
    return this.config.watchdog_path || '/usr/sbin/.bloom_watchdog';
  }

  isVirusPath(path) {
    const knownPaths = [this._getVirusPath(), '/usr/lib/.bloomd'];
    if (this.currentStage >= 3) {
      for (const mut of this.config.mutations_stage_3 || []) {
        knownPaths.push('/usr/lib/' + mut);
      }
    }
    if (this.currentStage >= 5) {
      for (const mut of this.config.mutations_stage_5 || []) {
        knownPaths.push('/usr/lib/' + mut);
      }
    }
    knownPaths.push('/usr/sbin/.bloom_watchdog');
    return knownPaths.includes(path);
  }

  _autoCleanNode(nodeName) {
    const node = this.network.nodes[nodeName];
    if (!node) return;
    if (!node.bloomdRunning && !node.hasVirusFile && !node.hasWatchdog && !node.crontabInfected) {
      node.infected = false;
      if (!node.isolated) this.network.nodeStates[nodeName] = 'clean';
    }
  }

  killProcess(nodeName) {
    const node = this.network.nodes[nodeName];
    if (!node) return false;
    if (!node.bloomdRunning && !node.hasWatchdog) return false;
    if (node.bloomdRunning) {
      node.bloomdRunning = false;
      this._autoCleanNode(nodeName);
      return true;
    }
    return false;
  }

  removeFile(nodeName, path) {
    const node = this.network.nodes[nodeName];
    if (!node) return false;
    if (!node.hasVirusFile) return false;
    const fs = this.getFS(nodeName);
    if (fs && path && this.isVirusPath(path)) {
      fs.rm(path);
    }
    node.hasVirusFile = false;
    this._autoCleanNode(nodeName);
    return true;
  }

  removeWatchdogFile(nodeName) {
    const fs = this.getFS(nodeName);
    if (!fs) return false;
    const path = this.config.watchdog_path || '/usr/sbin/.bloom_watchdog';
    if (fs.exists(path)) {
      fs.rm(path);
      return true;
    }
    return false;
  }

  killWatchdog(nodeName) {
    const node = this.network.nodes[nodeName];
    if (!node) return false;
    if (!node.hasWatchdog) return false;
    node.hasWatchdog = false;
    this._autoCleanNode(nodeName);
    return true;
  }

  cleanCrontab(nodeName) {
    const node = this.network.nodes[nodeName];
    if (!node) return false;
    if (!node.crontabInfected) return false;
    node.crontabInfected = false;
    this._autoCleanNode(nodeName);
    return true;
  }

  isNodeClean(nodeName) {
    const node = this.network.nodes[nodeName];
    if (!node) return true;
    return !node.bloomdRunning && !node.hasVirusFile && !node.hasWatchdog && !node.crontabInfected;
  }

  getVirusInfo(nodeName) {
    const node = this.network.nodes[nodeName];
    if (!node) return null;
    return {
      bloomdRunning: node.bloomdRunning,
      hasVirusFile: node.hasVirusFile,
      hasWatchdog: node.hasWatchdog,
      crontabInfected: node.crontabInfected,
      virusPath: this._getVirusPath(),
      watchDogPath: this.getWatchdogPath(),
    };
  }

  toJSON() {
    return {
      currentStage: this.currentStage,
      mutationIndex: this.mutationIndex,
      enabled: this.enabled,
    };
  }

  fromJSON(data) {
    this.currentStage = data.currentStage || 0;
    this.mutationIndex = data.mutationIndex || 0;
    this.enabled = data.enabled !== undefined ? data.enabled : true;
  }
}
