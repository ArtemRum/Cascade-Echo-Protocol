class MirrorRouter {
  constructor(networkGraph, config) {
    this.network = networkGraph;
    this.config = config;
    this.mirrorNodes = {};
    this.driftTimers = {};
    this.driftOffsets = {};
    this.routesAdded = {};
    this._initMirrors();
  }

  _initMirrors() {
    for (const [name, proxy] of Object.entries(this.network.mirrorProxies)) {
      this.mirrorNodes[name] = { ...proxy, resolved: false };
      this.driftOffsets[name] = 0;
      this.routesAdded[name] = false;
    }
  }

  startDrift() {
    for (const name of Object.keys(this.mirrorNodes)) {
      this._scheduleDrift(name);
    }
  }

  stopDrift() {
    for (const timer of Object.values(this.driftTimers)) {
      clearTimeout(timer);
    }
    this.driftTimers = {};
  }

  _scheduleDrift(name) {
    const proxy = this.mirrorNodes[name];
    const interval = (proxy.driftInterval || 20) * 1000;
    this.driftTimers[name] = setTimeout(() => {
      this._doDrift(name);
      this._scheduleDrift(name);
    }, interval);
  }

  _doDrift(name) {
    const proxy = this.mirrorNodes[name];
    const node = this.network.nodes[name];
    if (!node) return;
    this.driftOffsets[name] = (this.driftOffsets[name] || 0) + 1;
    const pattern = proxy.driftPattern || '+5';
    const increment = parseInt(pattern) || 5;
    const parts = proxy.ip.split('.');
    const lastOctet = parseInt(parts[3]) + increment * this.driftOffsets[name];
    parts[3] = (lastOctet % 256).toString();
    const newIp = parts.join('.');
    node.ip = newIp;
    if ((this.driftOffsets[name] % 3) === 0 && !node.routed && !this.routesAdded[name]) {
      this._addAsymmetricRoute(name);
    }
  }

  _addAsymmetricRoute(name) {
    this.routesAdded[name] = true;
  }

  getCurrentIp(name) {
    return this.network.nodes[name] ? this.network.nodes[name].ip : null;
  }

  getMirrorRouteClue(name) {
    return `[WARN] Asymmetric route detected on ${name}. Expected ${this.mirrorNodes[name].ip}, got alternate path.`;
  }

  resolveMirror(name, routeCommand) {
    const proxy = this.mirrorNodes[name];
    if (!proxy) return false;
    this.network.nodes[name].routed = true;
    this.routesAdded[name] = true;
    return true;
  }

  isResolved(name) {
    return this.network.nodes[name] ? this.network.nodes[name].routed : false;
  }

  getDriftPattern(name) {
    return this.mirrorNodes[name]?.driftPattern || '+5';
  }

  getLogAnomalies() {
    const logs = [];
    for (const name of Object.keys(this.mirrorNodes)) {
      const node = this.network.nodes[name];
      if (node && !node.routed) {
        logs.push(`[WARN] Asymmetric route on ${name}: packet loss ${Math.floor(Math.random() * 10) + 1}%`);
      }
    }
    return logs;
  }

  toJSON() {
    return {
      driftOffsets: this.driftOffsets,
      routesAdded: this.routesAdded,
      mirrorStates: Object.fromEntries(
        Object.keys(this.mirrorNodes).map(n => [n, { resolved: this.network.nodes[n]?.routed || false }])
      )
    };
  }

  fromJSON(data) {
    if (data.driftOffsets) this.driftOffsets = data.driftOffsets;
    if (data.routesAdded) this.routesAdded = data.routesAdded;
    if (data.mirrorStates) {
      for (const [name, state] of Object.entries(data.mirrorStates)) {
        if (this.network.nodes[name]) {
          this.network.nodes[name].routed = state.resolved;
        }
      }
    }
  }
}
