class NetworkGraph {
  constructor(data) {
    this.nodes = {};
    this.segments = data.segments || {};
    this.routers = data.routers || {};
    this.mirrorProxies = data.mirror_proxies || {};
    this.crossSegmentLinks = data.cross_segment_links || [];
    this.initialInfected = data.initial_infected || [];
    this.nodeStates = {};
    this.connections = {};
    this.everInfected = new Set(data.initial_infected || []);

    this._buildNodes(data);
    this._buildConnections(data);
  }

  _buildNodes(data) {
    for (const [id, node] of Object.entries(data.nodes)) {
      this.nodes[id] = {
        ...node,
        name: id,
        isolated: false,
        infected: this.initialInfected.includes(id),
        bloomdRunning: this.initialInfected.includes(id),
        hasWatchdog: false,
        hasVirusFile: this.initialInfected.includes(id),
        crontabInfected: false,
        routed: false,
        virusLag: 0,
        virusLagMax: 0,
        destroyed: false,
        virusStrain: null,
      };
      this.nodeStates[id] = this.initialInfected.includes(id) ? 'infected' : 'clean';
    }
  }

  _buildConnections(data) {
    for (const [id, node] of Object.entries(data.nodes)) {
      this.connections[id] = [...(node.neighbors || [])];
    }
    for (const link of (data.cross_segment_links || [])) {
      if (!this.connections[link.from]) this.connections[link.from] = [];
      if (!this.connections[link.to]) this.connections[link.to] = [];
      if (!this.connections[link.from].includes(link.to)) this.connections[link.from].push(link.to);
      if (!this.connections[link.to].includes(link.from)) this.connections[link.to].push(link.from);
    }
    for (const [id, proxy] of Object.entries(data.mirror_proxies || {})) {
      this.nodes[id] = {
        id: -1,
        segment: 'mirror',
        name: id,
        ip: proxy.ip,
        neighbors: [...(proxy.connected_to || [])],
        importance: 0,
        type: 'mirror',
        isolated: false,
        infected: false,
        bloomdRunning: false,
        hasWatchdog: false,
        hasVirusFile: false,
        crontabInfected: false,
        routed: false,
        virusLag: 0,
        virusLagMax: 0,
        destroyed: false,
        virusStrain: null,
        isMirror: true,
        driftPattern: proxy.drift_pattern || '+5',
        driftInterval: proxy.drift_interval || 20,
        baseIp: proxy.ip,
      };
      this.nodeStates[id] = 'mirror';
      this.connections[id] = [...(proxy.connected_to || [])];
      for (const neighbor of (proxy.connected_to || [])) {
        if (!this.connections[neighbor]) this.connections[neighbor] = [];
        if (!this.connections[neighbor].includes(id)) this.connections[neighbor].push(id);
      }
    }
  }

  getNode(name) { return this.nodes[name]; }
  getState(name) { return this.nodeStates[name] || 'clean'; }
  getConnections(name) { return this.connections[name] || []; }

  getCleanNeighbors(name) {
    return (this.connections[name] || []).filter(n =>
      this.nodes[n] && !this.nodes[n].infected && !this.nodes[n].isolated && !this.nodes[n].isMirror && !this.nodes[n].destroyed
    );
  }

  getInfectedNodes() {
    return Object.values(this.nodes).filter(n => n.infected && !n.isMirror && !n.destroyed);
  }

  setVirusLagMax(name) {
    const node = this.nodes[name];
    if (!node) return;
    const map = { dmz: 6, core: 15, archive: 9 };
    node.virusLagMax = map[node.segment] || 6;
    node.virusLag = 0;
    node.destroyed = false;
  }

  incrementVirusLag(name) {
    const node = this.nodes[name];
    if (!node || !node.infected || node.destroyed) return 0;
    node.virusLag = Math.min(node.virusLagMax || 6, node.virusLag + 1);
    return node.virusLag;
  }

  getDestroyedNodes() {
    return Object.values(this.nodes).filter(n => n.destroyed && !n.isMirror);
  }

  getContainedRatio() {
    if (this.everInfected.size === 0) return 0;
    let cleanCount = 0;
    for (const name of this.everInfected) {
      if (this.nodeStates[name] === 'clean') cleanCount++;
    }
    return cleanCount / this.everInfected.size;
  }

  getIsolatedNodes() {
    return Object.values(this.nodes).filter(n => n.isolated);
  }

  infectNode(name) {
    const node = this.nodes[name];
    if (!node || node.isolated || node.isMirror || node.destroyed) return false;
    node.infected = true;
    node.bloomdRunning = true;
    node.hasVirusFile = true;
    this.nodeStates[name] = 'infected';
    this.everInfected.add(name);
    this.setVirusLagMax(name);
    return true;
  }

  setIsolated(name, value) {
    const node = this.nodes[name];
    if (!node) return false;
    node.isolated = value;
    if (value) {
      this.nodeStates[name] = 'isolated';
    } else {
      this.nodeStates[name] = node.infected ? 'infected' : 'clean';
    }
    return true;
  }

  restoreAllIsolated() {
    const restored = [];
    for (const node of Object.values(this.nodes)) {
      if (node.isolated && !node.destroyed) {
        node.isolated = false;
        this.nodeStates[node.name] = node.infected ? 'infected' : 'clean';
        restored.push(node.name);
      }
    }
    return restored;
  }

  cleanNode(name) {
    const node = this.nodes[name];
    if (!node) return false;
    node.infected = false;
    node.bloomdRunning = false;
    node.hasVirusFile = false;
    node.hasWatchdog = false;
    node.crontabInfected = false;
    node.virusLag = 0;
    node.virusLagMax = 0;
    node.destroyed = false;
    if (!node.isolated) this.nodeStates[name] = 'clean';
    return true;
  }

  getNodeByIp(ip) {
    return Object.values(this.nodes).find(n => n.ip === ip);
  }

  getSegmentNodes(segment) {
    return Object.values(this.nodes).filter(n => n.segment === segment);
  }

  getRouterForNode(nodeName) {
    const node = this.nodes[nodeName];
    if (!node) return null;
    for (const [name, router] of Object.entries(this.routers)) {
      if (router.segment === node.segment) return { name, ...router };
    }
    return null;
  }

  canSsh(from, to) {
    const targetNode = this.nodes[to];
    if (!targetNode) return false;
    if (targetNode.isolated || targetNode.destroyed) return false;
    if (this.nodes[from] && this.nodes[from].isolated) return false;
    return true;
  }

  toJSON() {
    const state = {};
    for (const [name, node] of Object.entries(this.nodes)) {
      state[name] = {
        infected: node.infected,
        isolated: node.isolated,
        bloomdRunning: node.bloomdRunning,
        hasWatchdog: node.hasWatchdog,
        hasVirusFile: node.hasVirusFile,
        crontabInfected: node.crontabInfected,
        routed: node.routed,
        virusLag: node.virusLag,
        virusLagMax: node.virusLagMax,
        destroyed: node.destroyed,
        virusStrain: node.virusStrain || null,
      };
    }
    state.__everInfected = Array.from(this.everInfected);
    return state;
  }

  fromJSON(state) {
    this.everInfected = new Set(state.__everInfected || []);
    for (const [name, saved] of Object.entries(state)) {
      if (name === '__everInfected') continue;
      const node = this.nodes[name];
      if (node) {
        node.infected = saved.infected;
        node.isolated = saved.isolated;
        node.bloomdRunning = saved.bloomdRunning;
        node.hasWatchdog = saved.hasWatchdog;
        node.hasVirusFile = saved.hasVirusFile;
        node.crontabInfected = saved.crontabInfected;
        node.routed = saved.routed;
        node.virusLag = saved.virusLag || 0;
        node.virusLagMax = saved.virusLagMax || 0;
        node.destroyed = saved.destroyed || false;
        node.virusStrain = saved.virusStrain || null;
        this.nodeStates[name] = saved.destroyed ? 'destroyed' : saved.infected ? 'infected' : saved.isolated ? 'isolated' : 'clean';
      }
    }
  }

  getTopologyAscii() {
    let output = '\n  === CASCADE NETWORK TOPOLOGY ===\n\n';
    for (const [segName, seg] of Object.entries(this.segments)) {
      output += `  [${seg.label.toUpperCase()}]\n  `;
      for (const nodeId of seg.ids) {
        const name = Object.keys(this.nodes).find(k => this.nodes[k].id === nodeId);
        if (!name) continue;
        const node = this.nodes[name];
        let symbol;
        if (node.destroyed) symbol = '[D]';
        else if (node.isolated) symbol = '[#]';
        else if (node.infected) symbol = '[X]';
        else symbol = '[ ]';
        output += `${symbol} ${name} (${node.ip})  `;
      }
      output += '\n\n';
    }

    if (Object.keys(this.mirrorProxies).length > 0) {
      output += '  [MIRROR PROXIES]\n  ';
      for (const [name, proxy] of Object.entries(this.mirrorProxies)) {
        const node = this.nodes[name];
        output += `  {M} ${name} (${node ? node.ip : proxy.ip})  `;
      }
      output += '\n\n';
    }

    output += '  Legend:  [ ] Clean  [X] Infected  [#] Isolated  [D] Destroyed  {M} Mirror\n';
    return output;
  }
}
