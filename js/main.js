class Game {
  constructor() {
    this.auth = new AuthManager();
    this.network = null;
    this.virus = null;
    this.watchdog = null;
    this.usat = null;
    this.email = null;
    this.story = null;
    this.mirror = null;
    this.puzzles = null;
    this.tabManager = null;
    this.commandParser = null;
    this.filesystems = {};
    this.systemMessages = [];
    this.statusBar = null;
    this.statusInterval = null;
    this.bloomInterval = null;
    this.gameTime = 0;
    this.gameTick = null;
    this.running = false;
    this.topologyData = null;
    this.storyData = null;
    this.virusConfig = null;

    this._renderLogin();
  }

  _renderLogin() {
    const existing = document.querySelector('.login-screen');
    if (existing) existing.remove();

    const users = this.auth.getUsers();

    const screen = document.createElement('div');
    screen.className = 'login-screen';
    screen.innerHTML = `
      <div class="login-box">
        <div class="login-title">CASCADE: ECHO PROTOCOL</div>
        <div class="login-subtitle">NETSEC OPERATOR ACCESS v2.4</div>
        <hr class="login-divider">
        <div class="login-field">
          <label>Operator ID</label>
          <input type="text" id="login-user" placeholder="enter your callsign" autocomplete="off" spellcheck="false">
        </div>
        <div class="login-field">
          <label>Access Code</label>
          <input type="password" id="login-pass" placeholder="••••••••" autocomplete="off" spellcheck="false">
        </div>
        <div class="login-actions">
          <button class="login-btn" id="login-btn">LOGIN</button>
          <button class="login-btn secondary" id="register-btn">REGISTER</button>
        </div>
        <div class="login-error" id="login-error"></div>
        ${users.length > 0 ? `
        <div class="login-users">
          <div class="login-users-label">Known Operators</div>
          ${users.map(u => `
            <div class="login-user-item" data-user="${u.username}">
              <span>${u.username} ${u.hasSave ? '●' : '○'}</span>
              <span class="save-status">${u.hasSave ? 'save found' : 'new'}</span>
            </div>
          `).join('')}
        </div>` : ''}
      </div>
    `;

    document.body.appendChild(screen);

    const userInput = screen.querySelector('#login-user');
    const passInput = screen.querySelector('#login-pass');
    const loginBtn = screen.querySelector('#login-btn');
    const registerBtn = screen.querySelector('#register-btn');
    const errorEl = screen.querySelector('#login-error');

    const showError = (msg) => { errorEl.textContent = msg; };
    const clearError = () => { errorEl.textContent = ''; };

    const doLogin = () => {
      clearError();
      const username = userInput.value.trim();
      const password = passInput.value;
      if (!username || !password) { showError('Enter callsign and access code'); return; }
      const result = this.auth.login(username, password);
      if (result.ok) {
        screen.remove();
        this._startGame(result.save);
      } else {
        showError(result.error);
        passInput.value = '';
        passInput.focus();
      }
    };

    const doRegister = () => {
      clearError();
      const username = userInput.value.trim();
      const password = passInput.value;
      if (!username || !password) { showError('Enter callsign and access code'); return; }
      const result = this.auth.register(username, password);
      if (result.ok) {
        screen.remove();
        this._startGame(null);
      } else {
        showError(result.error);
      }
    };

    loginBtn.addEventListener('click', doLogin);
    registerBtn.addEventListener('click', doRegister);

    passInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') doLogin(); });
    userInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') passInput.focus(); });

    screen.querySelectorAll('.login-user-item').forEach(el => {
      el.addEventListener('click', () => {
        userInput.value = el.dataset.user;
        passInput.focus();
      });
    });

    setTimeout(() => userInput.focus(), 100);
  }

  async _startGame(savedData) {
    try {
      const [topologyData, storyData, virusConfig] = await Promise.all([
        fetch('data/network_topology.json').then(r => r.json()),
        fetch('data/story_events.json').then(r => r.json()),
        fetch('data/virus_config.json').then(r => r.json()),
      ]);

      this.topologyData = topologyData;
      this.storyData = storyData;
      this.virusConfig = virusConfig;

      this.network = new NetworkGraph(topologyData);
      this.virus = new Bloomd(this.network, virusConfig);
      this.watchdog = new Watchdog(this.network, virusConfig);
      this.mirror = new MirrorRouter(this.network, virusConfig);
      this.usat = new USATManager(virusConfig);
      this.email = new EmailClient(storyData);
      this.story = new StoryEngine(storyData, this.network, this.virus, this.usat, this.email, this.mirror);
      this.puzzles = new PuzzleStages(this);

      this._wireCallbacks(virusConfig);
      this._initFS(topologyData);
      this._initUI();
      this.commandParser = new CommandParser(this);

      if (savedData) {
        this._restoreGame(savedData);
        this._start();
      } else {
        this._startTutorial();
      }
    } catch (err) {
      console.error('Failed to initialize game:', err);
      document.getElementById('app').innerHTML =
        '<div style="color:red;padding:2rem;font-family:monospace">' +
        'Failed to load game data. Check console for details.<br>' +
        'Error: ' + err.message + '</div>';
    }
  }

  _wireCallbacks(virusConfig) {
    this.virus.onSpread = (target) => {
      this.email.addComplaint(target, this.network.nodes[target]?.segment || 'unknown');
      this._autoSave();
    };

    this.virus.onBloomEffect = (target) => {
      // trigger is available for when player investigates the node
    };

    this.watchdog.onWatchdogLog = (log) => {
      // silently logged in memory, player can find via logs on node
    };

    this.usat.onAutoRestore = () => {
      this.network.restoreAllIsolated();
      this.email.addPlotEmail('usat_critical_25');
      this._autoSave();
    };

    this.usat.onFiringStart = (duration) => {
      this.addSystemMessage('[!!!] WARNING: User satisfaction critically low. Termination proceedings initiated.');
      this.email.addPlotEmail('usat_firing_15');
    };

    this.usat.onFiringTimeout = () => {
      this.story.triggerEnding('fired');
      this._showEnding('fired');
    };

    this.usat.onWarning40 = (score) => {
      this.email.addPlotEmail('usat_warning_40');
    };

    this.usat.onComplaintTick = (score) => {
      this.email.addComplaint('unknown', 'all');
      this._updateStatusBar();
    };

    this.story.onStageChange = (stage) => {
      this._updateStatusBar();
      this._autoSave();
    };

    this.story.onSystemMessage = (msg) => {
      this.addSystemMessage(msg);
    };

    this.story.onAssistantMessage = (msg) => {
      this.email.addAssistantMessage('Guidance — Night Shift', msg);
    };
  }

  _initFS(topologyData) {
    for (const [name, node] of Object.entries(this.network.nodes)) {
      if (node.isMirror) continue;
      const fsData = FileTypes.getStandardFS(name, node);
      this.filesystems[name] = VirtualFS.fromJSON(fsData);
    }
    this._setupEchoFiles();
  }

  _setupEchoFiles() {
    const core14 = this.filesystems['core-14'];
    if (core14) {
      core14.mkdir('/archive');
      core14.mkdir('/archive/echo');
      core14.writeFile('/archive/echo/journal.txt',
        '=== PROJECT ECHO - PERSONAL JOURNAL ===\n' +
        'Alexei Werner, Lead Network Architect\n\n' +
        'Entry 1: They asked me to build a shadow replication system. ' +
        'Every packet, every file, every transaction — copied silently to a hidden segment. ' +
        'They said it was for "disaster recovery."\n\n' +
        'Entry 2: I discovered the truth. The copies aren\'t for backup. ' +
        'Cascade Dynamics has been selling client data for years. ' +
        'The Echo project is their crowning achievement — a perfect, invisible mirror of everything.\n\n' +
        'Entry 3: I confronted management. They "restructured" my position. ' +
        'Now I\'m on the outside. But I left something behind — a way to expose them.\n\n' +
        'Entry 4: The bloomd virus wasn\'t my creation. It\'s Cascade\'s countermeasure. ' +
        'They infected their own network to discredit me. The watchdog process, the file mutations — ' +
        'all designed to make it look like I\'m attacking them.\n\n' +
        'Entry 5: If you\'re reading this, you know the truth. ' +
        'The encryption keys are in /archive/echo/keys/. Copy them out. ' +
        'The world deserves to know what Cascade is doing.\n\n' +
        '— A.W.'
      );
      core14.writeFile('/archive/echo/keys/encryption.key',
        '-----BEGIN PGP PUBLIC KEY BLOCK-----\n' +
        'mQINBGCi4TMBEADJf8Yx3qPq0v7uRz5t2w4k6L9sSdFh2jKl8Zx5y7t3R\n' +
        'pW0cVvRmNnJhOHh4eHh4eHh4eHh4eQ==\n' +
        '-----END PGP PUBLIC KEY BLOCK-----'
      );
      core14.writeFile('/archive/echo/client_data/sample.txt',
        '[REDACTED] Client transaction records — Cascade Dynamics\n' +
        'This directory contains evidence of unauthorized data collection.\n' +
        'Timestamps span 2035–2038. Estimated 2.4 million records.\n'
      );
    }
  }

  _initUI() {
    const app = document.getElementById('app');
    app.innerHTML = '';

    const container = document.createElement('div');
    container.id = 'game-container';
    container.className = 'game-container';

    const header = document.createElement('div');
    header.className = 'game-header';
    header.innerHTML =
      '<span class="game-title">CASCADE: ECHO PROTOCOL</span>' +
      '<span class="game-subtitle">Operator: ' + this.auth.currentUser + '</span>';

    const terminalWrapper = document.createElement('div');
    terminalWrapper.id = 'terminal-wrapper';
    terminalWrapper.className = 'terminal-wrapper';

    this.statusBar = document.createElement('div');
    this.statusBar.className = 'status-bar';

    container.appendChild(header);
    container.appendChild(terminalWrapper);
    container.appendChild(this.statusBar);
    app.appendChild(container);

    this.tabManager = new TabManager(terminalWrapper, this);
    this._updateStatusBar();
    this._startStatusUpdates();
  }

  _startTutorial() {
    const active = this.tabManager.getActivePanel();
    if (!active) return;
    const msg = [
      '╔══════════════════════════════════════════════════╗',
      '║  CASCADE DYNAMICS — NETSEC TERMINAL v2.4        ║',
      '║  Night Shift — 22:00                            ║',
      '╚══════════════════════════════════════════════════╝',
      '',
      'Operator ' + this.auth.currentUser + ' online.',
      '',
      'Users reporting slow data access on DMZ segment.',
      'Investigate with:  ssh admin@<ip>',
      '',
      'Check complaints:  mail',
      'View network:      topology',
      'Available tools:   help',
      '',
    ];
    for (const line of msg) {
      active.writeln('\x1b[32m' + line + '\x1b[0m');
    }
    setTimeout(() => {
      this._start();
    }, 3000);
  }

  _start() {
    if (this.running) return;
    this.running = true;
    this.story.setStage(1);
    this.puzzles.advanceTo(1);
    this.virus.start();
    this.watchdog.start();

    this.gameTick = setInterval(() => {
      this.gameTime++;
      this._updateStatusBar();
      if (this.gameTime % 10 === 0) {
        this._autoSave();
      }
    }, 1000);

    this.bloomInterval = setInterval(() => {
      this._checkEndings();
    }, 5000);
  }

  getFSForNode(nodeName) {
    if (!this.filesystems[nodeName]) {
      const node = this.network.nodes[nodeName];
      if (node) {
        const fsData = FileTypes.getStandardFS(nodeName, node);
        this.filesystems[nodeName] = VirtualFS.fromJSON(fsData);
      }
    }
    return this.filesystems[nodeName] || null;
  }

  addSystemMessage(msg) {
    this.systemMessages.push({ time: Date.now(), text: msg });
    this._flashStatus(msg);
    const activePanel = this.tabManager.getActivePanel();
    if (activePanel) {
      activePanel.writeln('\x1b[31m' + msg + '\x1b[0m');
    }
  }

  _triggerBloomEffect(target) {
    const activePanel = this.tabManager.getActivePanel();
    if (!activePanel) return;
    const chars = ['*', '.', '+', '*', '.', '+'];
    const lines = [];
    for (let i = 0; i < 3; i++) {
      const line = '  '.repeat(Math.floor(Math.random() * 5)) +
        chars.map(c => c + ' '.repeat(Math.floor(Math.random() * 3))).join('');
      lines.push(line);
    }
    const msg = `\x1b[35m[!] BLOOM DETECTED on ${target}\x1b[0m`;
    activePanel.writeln(msg);
    for (const line of lines) {
      activePanel.writeln('\x1b[35m' + line + '\x1b[0m');
    }
  }

  _showAssistantMessage(msg) {
    const activePanel = this.tabManager.getActivePanel();
    if (!activePanel) return;
    activePanel.writeln('\x1b[36m[ASSISTANT] ' + msg + '\x1b[0m');
  }

  _showStatus(msg) {
    const activePanel = this.tabManager.getActivePanel();
    if (activePanel) {
      activePanel.writeln('\x1b[33m' + msg + '\x1b[0m');
    }
  }

  _flashStatus(msg) {
    if (this.statusBar) {
      let flash = this.statusBar.querySelector('.status-message');
      if (!flash) {
        flash = document.createElement('span');
        flash.className = 'status-message';
        this.statusBar.appendChild(flash);
      }
      flash.textContent = '\u26A0 ' + msg;
      setTimeout(() => { if (flash) flash.textContent = ''; }, 5000);
    }
  }

  _updateStatusBar() {
    if (!this.statusBar) return;
    const usat = this.usat ? this.usat.score : 100;
    const barLen = 20;
    const filled = Math.round(usat / 100 * barLen);
    const bar = '\u2588'.repeat(filled) + '\u2591'.repeat(barLen - filled);
    const usatColor = usat > 50 ? '#00ff41' : usat > 25 ? '#ffff00' : '#ff0000';

    const infectedCount = this.network ? this.network.getInfectedNodes().length : 0;
    const isolatedCount = this.network ? this.network.getIsolatedNodes().length : 0;

    const time = new Date().toLocaleTimeString();
    const stage = this.story ? this.story.currentStage : 0;

    this.statusBar.innerHTML =
      `<span class="status-item">${time}</span>` +
      `<span class="status-item">Stage ${stage}</span>` +
      `<span class="status-item">Infected: ${infectedCount}</span>` +
      `<span class="status-item">Isolated: ${isolatedCount}</span>` +
      `<span class="status-item" style="color:${usatColor}">USAT: ${bar} ${usat}%</span>` +
      `<span class="status-item status-message"></span>`;
  }

  _startStatusUpdates() {
    this.statusInterval = setInterval(() => this._updateStatusBar(), 2000);
  }

  _checkEndings() {
    if (this.story.isGameOver()) return;
    const ending = this.story.checkEndingConditions();
    if (ending && ending !== 'firefighting_possible') {
      this.story.triggerEnding(ending);
      this._showEnding(ending);
    }
  }

  _showEnding(type) {
    this.running = false;
    if (this.gameTick) { clearInterval(this.gameTick); this.gameTick = null; }
    if (this.bloomInterval) { clearInterval(this.bloomInterval); this.bloomInterval = null; }
    if (this.statusInterval) { clearInterval(this.statusInterval); this.statusInterval = null; }
    this.virus.stop();
    this.watchdog.stop();
    this.usat.destroy();

    const text = this.story.getEndingText();
    const activePanel = this.tabManager.getActivePanel();
    if (activePanel) {
      activePanel.terminal.clear();
      activePanel.writeln('\n\x1b[33m' + '='.repeat(60) + '\x1b[0m');
      for (const line of text.split('\n')) {
        activePanel.writeln('\x1b[33m' + line + '\x1b[0m');
      }
      activePanel.writeln('\x1b[33m' + '='.repeat(60) + '\x1b[0m');
      activePanel.writeln('\n\x1b[32mShift over. Close tab or F5 to restart.\x1b[0m');
    }
    this.auth.saveGame(null);
  }

  _autoSave() {
    try {
      const data = this._serialize();
      this.auth.saveGame(data);
    } catch (e) {
      // storage full or unavailable
    }
  }

  _serialize() {
    return {
      network: this.network ? this.network.toJSON() : {},
      virus: this.virus ? this.virus.toJSON() : {},
      watchdog: this.watchdog ? this.watchdog.toJSON() : {},
      mirror: this.mirror ? this.mirror.toJSON() : {},
      usat: this.usat ? this.usat.toJSON() : {},
      email: this.email ? this.email.toJSON() : {},
      story: this.story ? this.story.toJSON() : {},
      puzzles: this.puzzles ? this.puzzles.toJSON() : {},
      gameTime: this.gameTime,
    };
  }

  _restoreGame(data) {
    if (!data) return;
    if (this.network) this.network.fromJSON(data.network || {});
    if (this.virus) this.virus.fromJSON(data.virus || {});
    if (this.watchdog) this.watchdog.fromJSON(data.watchdog || {});
    if (this.mirror) this.mirror.fromJSON(data.mirror || {});
    if (this.usat) this.usat.fromJSON(data.usat || {});
    if (this.email) this.email.fromJSON(data.email || {});
    if (this.story) this.story.fromJSON(data.story || {});
    if (this.puzzles) this.puzzles.fromJSON(data.puzzles || {});
    this.gameTime = data.gameTime || 0;
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.game = new Game();
});
