class TabManager {
  constructor(container, game) {
    this.container = container;
    this.game = game;
    this.panels = [];
    this.activeIndex = 0;
    this.tabCount = 0;
    this.tabBar = null;
    this.terminalContainer = null;
    this.isSplit = false;
    this.splitPanelIdx = -1;
    this._init();
  }

  _init() {
    this.tabBar = document.createElement('div');
    this.tabBar.className = 'tab-bar';

    this.terminalContainer = document.createElement('div');
    this.terminalContainer.className = 'terminal-container';

    this.container.appendChild(this.tabBar);
    this.container.appendChild(this.terminalContainer);

    this.newTab('main');

    this.addBtn = document.createElement('button');
    this.addBtn.className = 'tab-add';
    this.addBtn.textContent = '+';
    this.addBtn.title = 'New tab (tab new)';
    this.addBtn.addEventListener('click', () => this.newTab());
    this.tabBar.appendChild(this.addBtn);

    window.addEventListener('resize', () => {
      this.resize();
    });
  }

  newTab(name) {
    if (!name) {
      this.tabCount++;
      name = `term-${this.tabCount}`;
    }
    const panel = new TerminalPanel(this.terminalContainer, this.game, this, name, this.game?.auth?.currentUser);
    const tabEl = this._createTabElement(panel);
    panel._tabElement = tabEl;
    this.panels.push(panel);
    this.switchTo(this.panels.length - 1);
    panel.focus();
    return panel;
  }

  _createTabElement(panel) {
    const tab = document.createElement('div');
    tab.className = 'tab';
    tab.dataset.panel = panel.name;

    const label = document.createElement('span');
    label.className = 'tab-label';
    label.textContent = panel.name;
    label.contentEditable = false;
    label.addEventListener('dblclick', () => {
      label.contentEditable = true;
      label.focus();
      document.execCommand('selectAll', false, null);
    });
    label.addEventListener('blur', () => {
      label.contentEditable = false;
      if (label.textContent.trim()) {
        panel.name = label.textContent.trim();
      } else {
        label.textContent = panel.name;
      }
    });
    label.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        label.blur();
      }
    });
    tab.appendChild(label);

    const closeBtn = document.createElement('span');
    closeBtn.className = 'tab-close';
    closeBtn.textContent = '×';
    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.closeTab(panel);
    });
    tab.appendChild(closeBtn);

    tab.addEventListener('click', () => {
      const idx = this.panels.indexOf(panel);
      if (idx >= 0) this.switchTo(idx);
    });

    this.tabBar.appendChild(tab);
    return tab;
  }

  closeTab(panel) {
    if (this.panels.length <= 1) return;
    const idx = this.panels.indexOf(panel);
    if (idx < 0) return;
    if (panel._tabElement && panel._tabElement.parentNode) {
      panel._tabElement.parentNode.removeChild(panel._tabElement);
    }
    panel.destroy();
    this.panels.splice(idx, 1);
    if (this.activeIndex >= this.panels.length) {
      this.activeIndex = this.panels.length - 1;
    } else if (this.activeIndex >= idx) {
      // keep or adjust
    }
    this.switchTo(this.activeIndex);
  }

  switchTo(index) {
    if (index < 0 || index >= this.panels.length) return;
    this.activeIndex = index;
    for (let i = 0; i < this.panels.length; i++) {
      const active = i === index;
      if (this.isSplit) {
        this.panels[i].setActiveSplit(active);
      } else {
        this.panels[i].setActive(active);
      }
      if (this.panels[i]._tabElement) {
        this.panels[i]._tabElement.classList.toggle('active', active);
      }
    }
    this.panels[index].focus();
  }

  toggleSplit() {
    this.isSplit = !this.isSplit;
    this.terminalContainer.classList.toggle('split-mode', this.isSplit);
    if (this.isSplit) {
      if (this.panels.length < 2) {
        this.newTab('right');
      }
      for (let i = 0; i < this.panels.length; i++) {
        this.panels[i].setActiveSplit(i === this.activeIndex);
      }
    } else {
      for (let i = 0; i < this.panels.length; i++) {
        this.panels[i].setActive(i === this.activeIndex);
      }
    }
    setTimeout(() => this.resize(), 100);
  }

  nextTab() {
    const next = (this.activeIndex + 1) % this.panels.length;
    this.switchTo(next);
  }

  prevTab() {
    const prev = (this.activeIndex - 1 + this.panels.length) % this.panels.length;
    this.switchTo(prev);
  }

  getActivePanel() {
    return this.panels[this.activeIndex] || null;
  }

  getPanelByName(name) {
    return this.panels.find(p => p.name === name) || null;
  }

  broadcast(text) {
    for (const panel of this.panels) {
      panel.writeln(text);
    }
  }

  resize() {
    for (const panel of this.panels) {
      panel.resize();
    }
  }
}
