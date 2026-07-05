class TerminalPanel {
  constructor(container, game, tabManager, name, username) {
    this.container = container;
    this.game = game;
    this.tabManager = tabManager;
    this.name = name || 'terminal';
    this.cwd = '/';
    this.connectedNode = null;
    this.currentFS = null;
    this.sshUser = 'admin';
    this.localUser = username || 'admin';
    this.commandHistory = [];
    this.historyIndex = -1;
    this.currentInput = '';
    this.terminal = null;
    this.fitAddon = null;
    this.promptStr = this.localUser + '@cascade:~$ ';
    this.element = null;
    this._init();
  }

  _init() {
    this.element = document.createElement('div');
    this.element.className = 'terminal-panel';
    this.element.dataset.panel = this.name;

    this.fitAddon = new FitAddon.FitAddon();
    this.terminal = new Terminal({
      cursorBlink: true,
      cursorStyle: 'block',
      fontSize: 14,
      fontFamily: '"Courier New", "DejaVu Sans Mono", monospace',
      convertEol: true,
      theme: {
        background: '#0a0a0a',
        foreground: '#00ff41',
        cursor: '#00ff41',
        selectionBackground: '#003300',
        black: '#000000',
        red: '#ff0000',
        green: '#00ff41',
        yellow: '#ffff00',
        blue: '#0088ff',
        magenta: '#ff00ff',
        cyan: '#00ffff',
        white: '#c0c0c0',
        brightBlack: '#555555',
        brightRed: '#ff5555',
        brightGreen: '#55ff55',
        brightYellow: '#ffff55',
        brightBlue: '#5555ff',
        brightMagenta: '#ff55ff',
        brightCyan: '#55ffff',
        brightWhite: '#ffffff',
      },
      allowTransparency: false,
      scrollback: 1000,
      attachCustomKeyEventHandler: (e) => {
        if (e.type !== 'keydown') return true;
        if (e.ctrlKey && e.shiftKey && e.key === 'Tab') {
          e.preventDefault();
          this.tabManager.prevTab();
          return false;
        }
        if (e.ctrlKey && e.key === 'Tab') {
          e.preventDefault();
          this.tabManager.nextTab();
          return false;
        }
        if (e.altKey && e.key >= '1' && e.key <= '9') {
          e.preventDefault();
          const idx = parseInt(e.key) - 1;
          if (idx < this.tabManager.panels.length) {
            this.tabManager.switchTo(idx);
          }
          return false;
        }
        if (e.ctrlKey && e.key === 'c') {
          if (!this.currentInput) return true;
          this.currentInput = '';
          this.terminal.write('^C\r\n');
          this._writePrompt();
          return false;
        }
        if (e.ctrlKey && e.key === 'l') {
          this.terminal.clear();
          this._writePrompt();
          return false;
        }
        return true;
      },
    });

    this.terminal.loadAddon(this.fitAddon);

    this.terminal.open(this.element);
    this.terminal.onKey(this._onKey.bind(this));
    this.terminal.onResize(() => {});

    this.element.addEventListener('mousedown', () => {
      const idx = this.tabManager.panels.indexOf(this);
      if (idx >= 0 && idx !== this.tabManager.activeIndex) {
        this.tabManager.switchTo(idx);
      }
    });

    setTimeout(() => {
      this.fitAddon.fit();
    }, 50);

    this._writePrompt();
    this.container.appendChild(this.element);
  }

  _writePrompt() {
    const host = this.connectedNode || 'cascade';
    const user = this.connectedNode ? this.sshUser : this.localUser;
    const dir = this.cwd === '/' ? '~' : this.cwd;
    this.promptStr = `${user}@${host}:${dir}$ `;
    this.terminal.write(this.promptStr);
  }

  _onKey(e) {
    const printable = e.key;
    const ev = e.domEvent;

    if (ev.key === 'Enter') {
      this._execute();
      return;
    }

    if (ev.key === 'Backspace') {
      if (this.currentInput.length > 0) {
        this.currentInput = this.currentInput.slice(0, -1);
        this.terminal.write('\b \b');
      }
      return;
    }

    if (ev.key === 'Tab') {
      ev.preventDefault();
      if (!this.game || !this.game.commandParser) return;
      const completed = this.game.commandParser.autocomplete(this.currentInput);
      if (completed && completed !== this.currentInput) {
        if (completed.includes('  ')) {
          this.terminal.write('\r\n' + completed + '\r\n');
          this._writePrompt();
          this.terminal.write(this.currentInput);
        } else {
          this.currentInput = completed;
          this.terminal.write(completed.slice(this.currentInput.length));
        }
      }
      return;
    }

    if (ev.key === 'ArrowUp') {
      ev.preventDefault();
      if (this.commandHistory.length > 0) {
        if (this.historyIndex === -1) {
          this.historyIndex = this.commandHistory.length - 1;
        } else if (this.historyIndex > 0) {
          this.historyIndex--;
        }
        const cmd = this.commandHistory[this.historyIndex];
        const clearLen = this.currentInput.length;
        for (let i = 0; i < clearLen; i++) this.terminal.write('\b \b');
        this.currentInput = cmd;
        this.terminal.write(cmd);
      }
      return;
    }

    if (ev.key === 'ArrowDown') {
      ev.preventDefault();
      if (this.commandHistory.length > 0 && this.historyIndex >= 0) {
        if (this.historyIndex < this.commandHistory.length - 1) {
          this.historyIndex++;
        } else {
          this.historyIndex = -1;
        }
        const clearLen = this.currentInput.length;
        for (let i = 0; i < clearLen; i++) this.terminal.write('\b \b');
        if (this.historyIndex >= 0) {
          this.currentInput = this.commandHistory[this.historyIndex];
        } else {
          this.currentInput = '';
        }
        this.terminal.write(this.currentInput);
      }
      return;
    }

    if (printable && printable.length === 1 && !ev.ctrlKey && !ev.altKey && !ev.metaKey) {
      this.currentInput += printable;
      this.terminal.write(printable);
      return;
    }
  }

  _execute() {
    const input = this.currentInput.trim();
    this.terminal.write('\r\n');
    if (input) {
      this.commandHistory.push(input);
      this.historyIndex = -1;
      this.currentInput = '';
      const result = this.game.commandParser.parse(input);
      if (result) {
        this.terminal.write(result + '\r\n');
      }
    }
    this._writePrompt();
  }

  write(text) {
    this.terminal.write(text);
  }

  writeln(text) {
    this.terminal.writeln(text);
  }

  focus() {
    this.terminal.focus();
  }

  setActive(active) {
    this.element.style.display = active ? 'block' : 'none';
    if (active) {
      setTimeout(() => {
        this.terminal.focus();
        if (this.fitAddon) {
          try { this.fitAddon.fit(); } catch(e) {}
        }
      }, 50);
    }
  }

  setActiveSplit(active) {
    this.element.style.display = 'block';
    this.element.classList.toggle('active-panel', active);
    if (active) {
      setTimeout(() => {
        this.terminal.focus();
        if (this.fitAddon) {
          try { this.fitAddon.fit(); } catch(e) {}
        }
      }, 50);
    }
  }

  resize() {
    if (this.fitAddon) {
      try { this.fitAddon.fit(); } catch(e) {}
    }
  }

  destroy() {
    if (this.terminal) {
      this.terminal.dispose();
      this.terminal = null;
    }
    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }
  }
}
