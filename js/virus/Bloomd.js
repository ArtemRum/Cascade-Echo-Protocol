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
    this.onBloomInterference = null;
    this.enabled = false;
    this.nodeStrains = {};
    this.decoyPaths = {};
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

  _getStrainPool(stage) {
    const pool = [...(this.config.mutations_stage_3 || ['.bloomd'])];
    if (stage >= 5) {
      pool.push(...(this.config.mutations_stage_5 || ['.syslogd']));
    }
    return pool;
  }

  _generateStrain(stage) {
    if (stage <= 1) {
      return { path: this.config.initial_path || '/usr/lib/.bloomd' };
    }
    const pool = this._getStrainPool(stage);
    const selected = pool[Math.floor(Math.random() * pool.length)];
    return { path: '/usr/lib/' + selected };
  }

  _getStrain(nodeName) {
    return this.nodeStrains[nodeName] || { path: this._getVirusPath() };
  }

  infectStage(stage) {
    if (!this.enabled) return [];
    const clean = Object.values(this.network.nodes)
      .filter(n => !n.infected && !n.isMirror && !n.isolated && !n.destroyed);
    const count = Math.min(stage, clean.length);
    if (count === 0) return [];

    const shuffled = [...clean].sort(() => Math.random() - 0.5);
    const targets = shuffled.slice(0, count);
    const infectedNames = [];

    for (const node of targets) {
      const strain = this._generateStrain(stage);
      this.nodeStrains[node.name] = strain;
      this.network.infectNode(node.name);
      this.network.nodes[node.name].virusStrain = strain;
      this._setupVirusFiles(node.name, strain);
      if (this.onBloomEffect) this.onBloomEffect(node.name);
      if (this.onSpread) this.onSpread(node.name);
      infectedNames.push(node.name);
    }

    for (const [prevName, prevStrain] of Object.entries(this.nodeStrains)) {
      if (infectedNames.includes(prevName)) continue;
      const prevNode = this.network.nodes[prevName];
      if (!prevNode) continue;
      const fs = this.getFS(prevName);

      if (prevNode.infected) {
        const newStrain = this._generateStrain(stage);
        this.nodeStrains[prevName] = newStrain;
        prevNode.virusStrain = newStrain;
        if (fs) {
          fs.writeFile(newStrain.path, Utils.ELF_BINARY);
          fs.writeFile(prevStrain.path, 'ПХАХПАХПХАХПХАХПАХ, хорошая попытка :3');
        }
        this.decoyPaths[prevName] = prevStrain.path;
        if (this.onBloomEffect) this.onBloomEffect(prevName);
      } else if (fs) {
        fs.writeFile(prevStrain.path, 'ПХАХПАХПХАХПХАХПАХ, хорошая попытка :3');
        this.decoyPaths[prevName] = prevStrain.path;
      }
    }

    return infectedNames;
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
    const strain = this._generateStrain(this.currentStage);
    this.nodeStrains[target] = strain;
    this.network.nodes[target].virusStrain = strain;
    this._setupVirusFiles(target, strain);
    if (this.onBloomEffect) this.onBloomEffect(target);
    if (this.onSpread) this.onSpread(target);
  }

  _setupVirusFiles(nodeName, strain) {
    const node = this.network.nodes[nodeName];
    if (!node) return;
    const s = strain || this.nodeStrains[nodeName] || { path: this._getVirusPath() };
    const virusPath = s.path;
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
    const strain = this.nodeStrains[nodeName];
    const virusPath = strain ? strain.path : this._getVirusPath();
    fs.writeFile(virusPath, Utils.ELF_BINARY);
  }

  infectSilently(nodeName) {
    const node = this.network.nodes[nodeName];
    if (!node || node.isolated || node.isMirror || node.destroyed) return false;
    node.infected = true;
    node.bloomdRunning = true;
    node.hasVirusFile = true;
    this.network.nodeStates[nodeName] = 'infected';
    this.network.everInfected.add(nodeName);
    this.network.setVirusLagMax(nodeName);
    const strain = this._generateStrain(this.currentStage);
    this.nodeStrains[nodeName] = strain;
    node.virusStrain = strain;
    this._setupVirusFiles(nodeName, strain);
    return true;
  }

  setupInitialInfected() {
    for (const node of Object.values(this.network.nodes)) {
      if (node.infected && !node.isMirror) {
        const strain = this.nodeStrains[node.name] || { path: this._getVirusPath() };
        this._setupVirusFiles(node.name, strain);
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
    for (const strain of Object.values(this.nodeStrains)) {
      if (path === strain.path) return true;
    }
    if (path === (this.config.watchdog_path || '/usr/sbin/.bloom_watchdog')) return true;
    if (path === (this.config.initial_path || '/usr/lib/.bloomd')) return true;
    return false;
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
      if (this.onBloomInterference) this.onBloomInterference(nodeName, 'kill');
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
    if (this.onBloomInterference) this.onBloomInterference(nodeName, 'rm');
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
    if (this.onBloomInterference) this.onBloomInterference(nodeName, 'kill');
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
    const strain = this.nodeStrains[nodeName] || { path: this._getVirusPath() };
    return {
      bloomdRunning: node.bloomdRunning,
      hasVirusFile: node.hasVirusFile,
      hasWatchdog: node.hasWatchdog,
      crontabInfected: node.crontabInfected,
      virusPath: strain.path,
      watchDogPath: this.getWatchdogPath(),
    };
  }

  toJSON() {
    return {
      currentStage: this.currentStage,
      mutationIndex: this.mutationIndex,
      enabled: this.enabled,
      nodeStrains: this.nodeStrains,
    };
  }

  fromJSON(data) {
    this.currentStage = data.currentStage || 0;
    this.mutationIndex = data.mutationIndex || 0;
    this.enabled = data.enabled !== undefined ? data.enabled : true;
    this.nodeStrains = data.nodeStrains || {};
    for (const [name, strain] of Object.entries(this.nodeStrains)) {
      const node = this.network?.nodes?.[name];
      if (node) node.virusStrain = strain;
    }
  }
}
