class CommandParser {
  static COMMAND_FILE_MAP = {
    ls:        ['/bin/ls'],
    ps:        ['/bin/ps'],
    kill:      ['/bin/kill'],
    rm:        ['/bin/rm'],
    cp:        ['/bin/cp'],
    mv:        ['/bin/mv'],
    find:      ['/bin/find'],
    grep:      ['/bin/grep'],
    cat:       ['/bin/cat'],
    chmod:     ['/bin/chmod'],
    mkdir:     ['/bin/mkdir'],
    touch:     ['/bin/touch'],
    pwd:       ['/bin/pwd'],
    df:        ['/bin/df'],
    du:        ['/bin/du'],
    sort:      ['/bin/sort'],
    wc:        ['/bin/wc'],
    head:      ['/bin/head'],
    tail:      ['/bin/tail'],
    md5sum:    ['/bin/md5sum'],
    uname:     ['/bin/uname'],
    ifconfig:  ['/sbin/ifconfig'],
    iptables:  ['/sbin/iptables'],
    route:     ['/sbin/route'],
    traceroute:['/sbin/traceroute'],
    ping:      ['/sbin/ping'],
    ssh:       ['/usr/bin/ssh'],
    scp:       ['/usr/bin/scp'],
    crontab:   ['/etc/crontab'],
    mail:      ['/usr/bin/mail'],
  };

  static CRITICAL_LIBS = {
    '/usr/lib/libc.so': {
      msg: 'bash: Segmentation fault (core dumped)',
      breaks: ['ls', 'ps', 'kill', 'rm', 'cp', 'mv', 'find', 'grep', 'cat', 'chmod', 'mkdir', 'touch', 'pwd', 'df', 'du', 'head', 'tail', 'sort', 'wc', 'md5sum', 'uname', 'ifconfig', 'iptables', 'route', 'traceroute', 'ping', 'crontab', 'mail', 'ssh', 'scp'],
    },
    '/usr/lib/libssl.so': {
      msg: 'ssh: error while loading shared libraries: libssl.so: cannot open shared object file',
      breaks: ['ssh', 'scp'],
    },
    '/usr/lib/libpam.so': {
      msg: 'ssh: PAM authentication failed: Critical error — check /var/log/auth.log',
      breaks: ['ssh'],
    },
  };

  static BUILTIN_CMDS = ['help', 'man', 'clear', 'history', 'cd', 'echo', 'hostname', 'whoami', 'date', 'exit', 'sudo', 'tab', 'topology'];

  constructor(game) {
    this.game = game;
    this.commands = {};
    this._registerBuiltins();
  }

  get panel() {
    return this.game.tabManager ? this.game.tabManager.getActivePanel() : null;
  }

  _getPanel() {
    return this.panel;
  }

  _withFS(fn) {
    const p = this.panel;
    if (!p) return '';
    const fs = p.currentFS;
    if (!fs) return 'No filesystem available.';
    return fn(p, fs);
  }

  _registerBuiltins() {
    this.register('help', this._help.bind(this));
    this.register('man', this._man.bind(this));
    this.register('clear', this._clear.bind(this));
    this.register('history', this._history.bind(this));
    this.register('ls', this._ls.bind(this));
    this.register('cd', this._cd.bind(this));
    this.register('pwd', this._pwd.bind(this));
    this.register('cat', this._cat.bind(this));
    this.register('rm', this._rm.bind(this));
    this.register('cp', this._cp.bind(this));
    this.register('mv', this._mv.bind(this));
    this.register('mkdir', this._mkdir.bind(this));
    this.register('touch', this._touch.bind(this));
    this.register('chmod', this._chmod.bind(this));
    this.register('find', this._find.bind(this));
    this.register('grep', this._grep.bind(this));
    this.register('ps', this._ps.bind(this));
    this.register('kill', this._kill.bind(this));
    this.register('top', this._top.bind(this));
    this.register('ifconfig', this._ifconfig.bind(this));
    this.register('iptables', this._iptables.bind(this));
    this.register('route', this._route.bind(this));
    this.register('traceroute', this._traceroute.bind(this));
    this.register('ping', this._ping.bind(this));
    this.register('crontab', this._crontab.bind(this));
    this.register('mail', this._mail.bind(this));
    this.register('ssh', this._ssh.bind(this));
    this.register('scp', this._scp.bind(this));
    this.register('topology', this._topology.bind(this));
    this.register('whoami', this._whoami.bind(this));
    this.register('hostname', this._hostname.bind(this));
    this.register('date', this._date.bind(this));
    this.register('echo', this._echo.bind(this));
    this.register('du', this._du.bind(this));
    this.register('df', this._df.bind(this));
    this.register('md5sum', this._md5sum.bind(this));
    this.register('head', this._head.bind(this));
    this.register('tail', this._tail.bind(this));
    this.register('sort', this._sort.bind(this));
    this.register('wc', this._wc.bind(this));
    this.register('uname', this._uname.bind(this));
    this.register('exit', this._exit.bind(this));
    this.register('sudo', this._sudo.bind(this));
    this.register('tab', this._tab.bind(this));
  }

  register(name, handler) {
    this.commands[name] = handler;
  }

  static MAN_PAGES = {
    help:     'help                    — Show available commands',
    man:      'man <command>           — Show manual for a command',
    clear:    'clear                   — Clear terminal screen',
    history:  'history                 — Show command history',
    ls:       'ls [-la] [path]         — List directory contents\n'
            + '  -l      long format (permissions, size, owner)\n'
            + '  -a      show hidden files (starting with .)',
    cd:       'cd <path>               — Change working directory',
    pwd:      'pwd                     — Print working directory',
    cat:      'cat <file>              — Display file contents',
    rm:       'rm [-rf] <file|dir>     — Remove file or directory\n'
            + '  -r      recursive (for directories)\n'
            + '  -f      force (no prompt)',
    cp:       'cp [-r] <src> <dest>    — Copy file or directory',
    mv:       'mv <src> <dest>         — Move or rename file',
    mkdir:    'mkdir [-p] <dir>        — Create directory\n'
            + '  -p      create parent directories as needed',
    touch:    'touch <file>            — Create empty file or update timestamp',
    chmod:    'chmod <mode> <file>     — Change file permissions (e.g. 755, 644)',
    find:     'find [path] [-name <pattern>] — Search for files\n'
            + '  -name <pattern>  search by filename (use * for wildcard)',
    grep:     'grep <pattern> [file]   — Search text in file contents',
    ps:       'ps aux                  — Show process list on current node\n'
            + '  Look for suspicious processes like "bloomd" or "watchdog"',
    kill:     'kill [-9] <pid>         — Terminate a process\n'
            + '  -9      force kill (SIGKILL)\n'
            + '  Use with ps to find process IDs',
    top:      'top                     — Show live process monitor\n'
            + '  Displays CPU/memory usage and running processes.',
    ifconfig: 'ifconfig [eth0 down|up] — Show or toggle network interface\n'
            + '  eth0 down   isolate this node from network\n'
            + '  eth0 up     reconnect isolated node\n'
            + '  Isolating reduces User Satisfaction (USAT).',
    iptables: 'iptables -P FORWARD DROP|ACCEPT — Block or allow segment traffic\n'
            + '  DROP    isolate entire segment\n'
            + '  ACCEPT  restore segment connectivity',
    route:    'route [add -net <net> gw <gw>] — Show or modify routing table\n'
            + '  add -net <network> gw <gateway>  add static route',
    traceroute: 'traceroute <host>      — Trace network path to host\n'
            + '  Use to detect asymmetric routes and mirror proxies',
    ping:     'ping [-c <count>] <host> — Test network connectivity to host',
    crontab:  'crontab -l              — List cron jobs\n'
            + '  Check for suspicious entries added by virus',
    mail:     'mail                    — Read emails\n'
            + '  mail -r <id>   read specific message\n'
            + '  mail -r        read first unread message',
    ssh:      'ssh <user>@<host>       — Connect to remote server\n'
            + '  Examples:\n'
            + '    ssh admin@10.0.1.1     connect to dmz-01\n'
            + '    ssh admin@172.16.0.11  connect to core-11',
    scp:      'scp <src> <dest>        — Securely copy files between nodes',
    topology: 'topology                — Display ASCII network map\n'
            + '  Shows all nodes: [ ] clean, [X] infected, [#] isolated, {M} mirror',
    whoami:   'whoami                  — Show current username',
    hostname: 'hostname                — Show current node name',
    date:     'date                    — Show current date and time',
    echo:     'echo <text>             — Print text to terminal',
    du:       'du [path]               — Show disk usage of a path',
    df:       'df                      — Show filesystem disk space',
    md5sum:   'md5sum <file>           — Compute MD5 checksum of file',
    head:     'head [-n <count>] <file> — Show first N lines of file',
    tail:     'tail [-n <count>] <file> — Show last N lines of file',
    sort:     'sort <file>             — Sort lines of a text file',
    wc:       'wc <file>               — Count lines, words, characters',
    uname:    'uname [-a]              — Show system information',
    exit:     'exit                    — Disconnect from current node',
    sudo:     'sudo <command>          — Execute command with elevated privileges',
    tab:      'tab <action>            — Manage terminal tabs\n'
            + '  new                    create new tab\n'
            + '  close                  close current tab\n'
            + '  next                   switch to next tab\n'
            + '  prev                   switch to previous tab\n'
            + '  list                   list all tabs\n'
            + '  <n>                    switch to tab number n\n'
            + '  name <name>            rename current tab',
  };

  parse(input) {
    if (!input || !input.trim()) return '';
    const parts = input.trim().split(/\s+/);
    const cmd = parts[0].toLowerCase();
    const args = parts.slice(1);
    if (cmd === 'sudo' && args.length > 0) {
      const realCmd = args[0].toLowerCase();
      const realArgs = args.slice(1);
      const err = this._checkCommandAvailable(realCmd);
      if (err) return err;
      const handler = this.commands[realCmd];
      if (handler) return handler(realArgs, true);
      return `sudo: ${realCmd}: command not found`;
    }
    const err = this._checkCommandAvailable(cmd);
    if (err) return err;
    const handler = this.commands[cmd];
    if (handler) return handler(args);
    return `bash: ${cmd}: command not found`;
  }

  _checkCommandAvailable(cmd) {
    if (CommandParser.BUILTIN_CMDS.includes(cmd)) return null;
    const p = this.panel;
    if (!p || !p.currentFS) return null;
    const fs = p.currentFS;
    for (const [libPath, info] of Object.entries(CommandParser.CRITICAL_LIBS)) {
      if (info.breaks.includes(cmd) && !fs.exists(libPath)) {
        return info.msg;
      }
    }
    const required = CommandParser.COMMAND_FILE_MAP[cmd];
    if (required) {
      for (const filePath of required) {
        if (!fs.exists(filePath)) {
          return `bash: ${cmd}: command not found (${filePath} deleted)`;
        }
      }
    }
    return null;
  }

  autocomplete(input) {
    if (!input) return input;
    const parts = input.split(/\s+/);
    if (parts.length === 1) {
      const partial = parts[0].toLowerCase();
      const matches = Object.keys(this.commands).filter(c => c.startsWith(partial));
      if (matches.length === 1) return matches[0] + ' ';
      if (matches.length > 1) return matches.join('  ');
      return input;
    }
    return input;
  }

  _help(args) {
    const cmds = Object.keys(this.commands).sort();
    let output = 'Available commands. Use "man <command>" for details:\n';
    for (let i = 0; i < cmds.length; i += 5) {
      output += '  ' + cmds.slice(i, i + 5).join(', ') + '\n';
    }
    return output;
  }

  _man(args) {
    if (!args.length) return 'Usage: man <command>';
    const cmd = args[0].toLowerCase();
    const page = CommandParser.MAN_PAGES[cmd];
    if (!page) return `No manual entry for ${cmd}`;
    const lines = page.split('\n');
    const name = lines[0].split('—')[0].trim();
    const desc = lines[0].split('—')[1]?.trim() || '';
    let out = `\n${cmd.toUpperCase()}(1)                ${desc.toUpperCase()}                ${cmd.toUpperCase()}(1)\n\n`;
    out += `NAME\n    ${cmd} — ${desc}\n\n`;
    out += `SYNOPSIS\n    ${name}\n\n`;
    out += `DESCRIPTION\n`;
    for (const line of lines) {
      out += `    ${line.trim()}\n`;
    }
    out += `\n${cmd.toUpperCase()}(1)                                ${cmd.toUpperCase()}(1)\n`;
    return out;
  }

  _clear(args) {
    const p = this._getPanel();
    if (p) p.terminal.clear();
    return '';
  }

  _history(args) {
    const p = this._getPanel();
    if (!p) return '';
    return p.commandHistory.map((cmd, i) => `  ${i + 1}  ${cmd}`).join('\n');
  }

  _ls(args) {
    return this._withFS((p, fs) => {
      const path = args.find(a => !a.startsWith('-')) || p.cwd;
      const long = args.includes('-l') || args.includes('-la');
      const all = args.includes('-a') || args.includes('-la');
      const targetPath = this._resolvePath(path, p);
      const entries = fs.ls(targetPath);
      if (!entries) return `ls: ${path}: No such directory`;
      let filtered = all ? entries : entries.filter(e => !e.hidden);
      if (filtered.length === 0) return '';
      if (!long) {
        return filtered.map(e => (e.hidden ? '.' : '') + e.name).join('  ');
      }
      return filtered.map(e => {
        const perms = e.permissions || (e.type === 'dir' ? 'drwxr-xr-x' : '-rw-r--r--');
        const size = String(e.size || 0).padStart(5);
        return `${perms} 1 ${e.owner || 'root'} ${e.group || 'root'} ${size} ${e.name}`;
      }).join('\n');
    });
  }

  _cd(args) {
    return this._withFS((p, fs) => {
      const target = args[0] || '/';
      const resolved = this._resolvePath(target, p);
      if (!fs.isDir(resolved)) {
        return `cd: ${target}: No such directory`;
      }
      p.cwd = resolved;
      return '';
    });
  }

  _pwd(args) {
    const p = this._getPanel();
    return p ? p.cwd : '/';
  }

  _cat(args) {
    if (args.length === 0) return 'Usage: cat <file>';
    return this._withFS((p, fs) => {
      const path = this._resolvePath(args[0], p);
      const content = fs.readFile(path);
      if (content === null) return `cat: ${args[0]}: No such file`;
      if (this.game?.puzzles) this.game.puzzles.onFileRead(path);
      return content;
    });
  }

  _rm(args) {
    if (args.length === 0) return 'Usage: rm [-rf] <file|dir>';
    return this._withFS((p, fs) => {
      const recursive = args.includes('-rf') || args.includes('-r') || args.includes('-f');
      const targets = args.filter(a => !a.startsWith('-'));
      const results = [];
      for (const target of targets) {
        const path = this._resolvePath(target, p);
        if (path === '/') {
          results.push('rm: cannot remove root directory');
          continue;
        }
        if (!fs.exists(path)) {
          results.push(`rm: ${target}: No such file or directory`);
          continue;
        }
        if (fs.isDir(path) && !recursive) {
          results.push(`rm: ${target}: Is a directory (use -rf)`);
          continue;
        }
        const nodeName = p.connectedNode;
        if (nodeName && this.game?.virus && this.game.virus.isVirusPath(path)) {
          this.game.virus.removeFile(nodeName, path);
        }
        if (nodeName && this.game?.virus && path === '/etc/crontab') {
          this.game.virus.cleanCrontab(nodeName);
        }
        if (this.game?.puzzles) this.game.puzzles.checkEchoAction(path, 'delete');
        fs.rm(path);
        results.push('');
      }
      return results.join('\n');
    });
  }

  _cp(args) {
    const filtered = args.filter(a => a !== '-r');
    if (filtered.length < 2) return 'Usage: cp [-r] <source> <dest>';
    return this._withFS((p, fs) => {
      const src = this._resolvePath(filtered[0], p);
      const dest = this._resolvePath(filtered[1], p);
      if (!fs.exists(src)) return `cp: ${filtered[0]}: No such file or directory`;
      if (fs.cp(src, dest)) {
        if (this.game?.puzzles) this.game.puzzles.checkEchoAction(src, 'copy');
        if (this.game?.puzzles) this.game.puzzles.checkEchoAction(dest, 'copy');
        return '';
      }
      return 'cp: copy failed';
    });
  }

  _mv(args) {
    if (args.length < 2) return 'Usage: mv <source> <dest>';
    return this._withFS((p, fs) => {
      const src = this._resolvePath(args[0], p);
      const dest = this._resolvePath(args[1], p);
      if (!fs.exists(src)) return `mv: ${args[0]}: No such file or directory`;
      if (fs.mv(src, dest)) return '';
      return 'mv: move failed';
    });
  }

  _mkdir(args) {
    if (args.length === 0) return 'Usage: mkdir [-p] <dir>';
    return this._withFS((p, fs) => {
      const parent = args.includes('-p');
      const targets = args.filter(a => !a.startsWith('-'));
      const results = [];
      for (const target of targets) {
        const path = this._resolvePath(target, p);
        if (parent) {
          const parts = path.split('/').filter(Boolean);
          let current = '/';
          for (const part of parts) {
            current += part;
            if (!fs.exists(current)) fs.mkdir(current);
            current += '/';
          }
        } else {
          if (fs.mkdir(path)) results.push('');
          else results.push(`mkdir: ${target}: File exists`);
        }
      }
      return results.join('\n');
    });
  }

  _touch(args) {
    if (args.length === 0) return 'Usage: touch <file>';
    return this._withFS((p, fs) => {
      const path = this._resolvePath(args[0], p);
      if (fs.exists(path)) return '';
      fs.writeFile(path, '');
      return '';
    });
  }

  _chmod(args) {
    if (args.length < 2) return 'Usage: chmod <mode> <file>';
    return this._withFS((p, fs) => {
      const mode = args[0];
      const path = this._resolvePath(args[1], p);
      if (!fs.exists(path)) return `chmod: ${args[1]}: No such file`;
      if (fs.chmod(path, mode)) return '';
      return 'chmod: failed';
    });
  }

  _find(args) {
    return this._withFS((p, fs) => {
    const nameIdx = args.indexOf('-name');
    let searchPath = p.cwd;
    let pattern = '';
    if (nameIdx >= 0) {
      pattern = args[nameIdx + 1] || '';
      const pathArgs = args.slice(0, nameIdx).filter(a => !a.startsWith('-'));
      if (pathArgs.length > 0) searchPath = this._resolvePath(pathArgs[0], p);
    } else {
      const nonFlag = args.filter(a => !a.startsWith('-'));
      if (nonFlag.length === 1) {
        const arg = nonFlag[0];
        if (arg === '/') {
          pattern = '';
          searchPath = '/';
        } else if (arg === '.') {
          pattern = '.';
        } else {
          pattern = arg;
        }
      } else if (nonFlag.length >= 2) {
        searchPath = this._resolvePath(nonFlag[0], p);
        pattern = nonFlag[1];
      }
    }
    const searchPattern = pattern.replace(/\*/g, '');
    const results = fs.find(searchPath, searchPattern);
    if (results.length === 0) return '';
    return results.map(r => r.path).join('\n');
    });
  }

  _grep(args) {
    const pattern = args.find(a => !a.startsWith('-'));
    if (!pattern) return 'Usage: grep <pattern> [file]';
    return this._withFS((p, fs) => {
      const fileArg = args.filter(a => a !== pattern && !a.startsWith('-'))[0];
      if (fileArg) {
        const path = this._resolvePath(fileArg, p);
        const content = fs.readFile(path);
        if (content === null) return `grep: ${fileArg}: No such file`;
        const lines = content.split('\n').filter(l => l.includes(pattern));
        return lines.join('\n');
      }
      return '';
    });
  }

  _ps(args) {
    const p = this._getPanel();
    if (!p) return '';
    const nodeName = p.connectedNode;
    const network = this.game?.network;
    if (!nodeName || !network) return 'Not connected to a node. Use ssh to connect.';
    const node = network.nodes[nodeName];
    if (!node) return 'Node not found.';
    let output = 'PID  PPID  CPU%  MEM%  COMMAND\n';
    const processes = [
      { pid: 1, ppid: 0, cpu: 0, mem: 0.1, cmd: '/sbin/init' },
      { pid: 100, ppid: 1, cpu: 0.2, mem: 0.5, cmd: '/usr/sbin/sshd -D' },
      { pid: 150, ppid: 100, cpu: 0.1, mem: 0.3, cmd: 'sshd: admin@pts/0' },
      { pid: 200, ppid: 1, cpu: 0.5, mem: 1.2, cmd: '/usr/sbin/rsyslogd' },
      { pid: 300, ppid: 1, cpu: 0.3, mem: 0.8, cmd: '/usr/sbin/cron' },
      { pid: 350, ppid: 1, cpu: 1.0, mem: 2.1, cmd: '/usr/sbin/apache2 -k start' },
    ];
    if (node.bloomdRunning) {
      processes.push({ pid: 1425, ppid: 1, cpu: 12.1, mem: 3.2, cmd: '/usr/lib/.bloomd' });
    }
    if (node.hasWatchdog) {
      processes.push({ pid: 1530, ppid: 1, cpu: 0.5, mem: 0.1, cmd: '/usr/sbin/.bloom_watchdog' });
    }
    output += processes.map(p =>
      `${String(p.pid).padStart(5)} ${String(p.ppid).padStart(5)} ${String(p.cpu.toFixed(1)).padStart(5)} ${String(p.mem.toFixed(1)).padStart(5)}  ${p.cmd}`
    ).join('\n');
    return output;
  }

  _kill(args) {
    const p = this._getPanel();
    if (!p) return '';
    const nodeName = p.connectedNode;
    const virus = this.game?.virus;
    if (!nodeName || !virus) return 'Not connected to a node.';
    if (args.length === 0) return 'Usage: kill [-9] <pid>';
    const pidArg = args.find(a => !a.startsWith('-'));
    if (!pidArg) return 'kill: missing operand';
    const pid = parseInt(pidArg);
    if (pid === 1425) {
      if (virus.killProcess(nodeName)) {
        this.game.addSystemMessage(`[KILL] Process ${pid} (bloomd) terminated on ${nodeName}`);
        if (this.game?.puzzles) this.game.puzzles.onBloomdKilled();
        return `[1]     ${pid} terminated`;
      }
      return `kill: ${pid}: No such process`;
    }
    if (pid === 1530) {
      if (virus.killWatchdog(nodeName)) {
        this.game.addSystemMessage(`[KILL] Watchdog process ${pid} terminated on ${nodeName}`);
        if (this.game?.virus) this.game.virus.removeWatchdogFile(nodeName);
        if (this.game?.puzzles) this.game.puzzles.onWatchdogKilled();
        return `[1]     ${pid} terminated`;
      }
      return `kill: ${pid}: No such process`;
    }
    return `[1]     ${pid} terminated`;
  }

  _top(args) {
    const p = this._getPanel();
    if (!p) return '';
    const nodeName = p.connectedNode;
    const network = this.game?.network;
    if (!nodeName || !network) return 'Not connected to a node.';
    const node = network.nodes[nodeName];
    if (!node) return 'Node not found.';
    let output = 'top - ' + new Date().toLocaleTimeString() + '  up 1 day, 3:42,  1 user,  load average: 0.12, 0.08, 0.05\n';
    output += 'Tasks:  45 total,   1 running,  44 sleeping,   0 stopped,   0 zombie\n';
    output += '%Cpu(s):  3.2 us,  1.5 sy,  0.0 ni, 95.0 id,  0.3 wa,  0.0 hi,  0.0 si\n';
    const memTotal = 8192;
    const memUsed = 2340 + (node.bloomdRunning ? 256 : 0);
    output += `MiB Mem : ${memTotal} total,  ${memTotal - memUsed} free,  ${memUsed} used,  320 buff/cache\n`;
    output += '\n  PID  USER      PR  NI    VIRT    RES    SHR S  %CPU  %MEM     TIME+ COMMAND\n';
    const procs = [
      [350, 'root', 20, 0, '256M', '128M', '32M', 'S', 1.0, 1.6, '0:15.23', 'apache2'],
      [200, 'syslog', 20, 0, '64M', '32M', '8M', 'S', 0.5, 0.4, '0:42.10', 'rsyslogd'],
      [100, 'root', 20, 0, '32M', '16M', '4M', 'S', 0.2, 0.2, '1:23.45', 'sshd'],
      [300, 'root', 20, 0, '16M', '8M', '2M', 'S', 0.3, 0.1, '0:05.67', 'cron'],
      [150, 'root', 20, 0, '24M', '12M', '3M', 'S', 0.1, 0.15, '0:03.21', 'sshd: admin'],
    ];
    if (node.bloomdRunning) {
      procs.push([1425, 'root', 20, 0, '128M', '64M', '16M', 'S', 12.1, 3.2, '2:15.10', '.bloomd']);
    }
    if (node.hasWatchdog) {
      procs.push([1530, 'root', 20, 0, '16M', '8M', '2M', 'S', 0.5, 0.1, '0:00.45', '.bloom_watchdog']);
    }
    output += procs.map(p =>
      `${String(p[0]).padStart(5)} ${p[1].padEnd(8)} ${String(p[2]).padStart(2)} ${String(p[3]).padStart(2)} ${p[4].padStart(7)} ${p[5].padStart(7)} ${p[6].padStart(7)} ${p[7]} ${String(p[8]).padStart(5)} ${String(p[9]).padStart(5)} ${p[10].padStart(10)} ${p[11]}`
    ).join('\n');
    return output;
  }

  _ifconfig(args) {
    const p = this._getPanel();
    if (!p) return '';
    const nodeName = p.connectedNode;
    const network = this.game?.network;
    if (!nodeName || !network) return 'Not connected to a node. Run ssh first.';
    const node = network.nodes[nodeName];
    if (!node) return 'Node not found.';
    if (args.length === 0) {
      return `eth0      Link encap:Ethernet  HWaddr 00:1A:2B:3C:4D:5E\n          inet addr:${node.ip}  Bcast:${node.ip.split('.').slice(0, 3).join('.')}.255  Mask:255.255.255.0\n          ${node.isolated ? 'DOWN' : 'UP'} BROADCAST RUNNING MULTICAST  MTU:1500  Metric:1\n          RX packets:${Math.floor(Math.random() * 10000)} errors:0 dropped:0 overruns:0 frame:0\n          TX packets:${Math.floor(Math.random() * 10000)} errors:0 dropped:0 overruns:0 carrier:0\n          collisions:0 txqueuelen:1000`;
    }
    if (args[0] === 'eth0' && args[1] === 'down') {
      network.setIsolated(nodeName, true);
      const penalty = this.game.usat.getIsolationPenalty(node);
      this.game.usat.modify(penalty);
      this.game.addSystemMessage(`[NET] ${nodeName} isolated from network. USAT -${Math.abs(penalty)}%`);
      this.game.email.addComplaint(nodeName, node.segment);
      if (this.game?.puzzles) this.game.puzzles.onNodeIsolated();
      return `${nodeName}: eth0 DOWN`;
    }
    if (args[0] === 'eth0' && args[1] === 'up') {
      network.setIsolated(nodeName, false);
      const gain = this.game.usat.getRestoreGain(node);
      this.game.usat.modify(gain);
      this.game.addSystemMessage(`[NET] ${nodeName} reconnected. USAT +${gain}%`);
      return `${nodeName}: eth0 UP`;
    }
    return `ifconfig: ${args.join(' ')}: error`;
  }

  _iptables(args) {
    if (args.length < 3) return 'Usage: iptables -P FORWARD DROP|ACCEPT';
    if (args[0] === '-P' && args[1] === 'FORWARD') {
      const network = this.game?.network;
      if (!network) return 'No network available.';
      const p = this.panel;
      const segment = p && p.connectedNode ? (network.nodes[p.connectedNode]?.segment || 'dmz') : 'dmz';
      const action = args[2].toUpperCase();
      if (action === 'DROP') {
        const segNodes = network.getSegmentNodes(segment);
        for (const node of segNodes) {
          if (!node.isolated) {
            network.setIsolated(node.name, true);
            const penalty = this.game.usat.getIsolationPenalty(node);
            this.game.usat.modify(penalty);
          }
        }
        this.game.addSystemMessage(`[NET] ${segment.toUpperCase()} segment isolated via iptables.`);
        return `iptables: FORWARD policy set to DROP on ${segment} segment`;
      } else if (action === 'ACCEPT') {
        const segNodes = network.getSegmentNodes(segment);
        for (const node of segNodes) {
          if (node.isolated) {
            network.setIsolated(node.name, false);
          }
        }
        return `iptables: FORWARD policy set to ACCEPT on ${segment} segment`;
      }
    }
    return 'iptables: invalid arguments';
  }

  _route(args) {
    const mirror = this.game?.mirror;
    if (args.length === 0) {
      let output = 'Kernel IP routing table\n';
      output += 'Destination     Gateway         Genmask         Flags Metric Ref    Use Iface\n';
      output += 'default         10.0.0.1        0.0.0.0         UG    0      0        0 eth0\n';
      output += '10.0.0.0        *               255.255.255.0   U     0      0        0 eth0\n';
      output += '172.16.0.0      *               255.255.255.0   U     0      0        0 eth1\n';
      output += '192.168.0.0     *               255.255.255.0   U     0      0        0 eth2\n';
      if (mirror) {
        for (const name of Object.keys(mirror.mirrorNodes)) {
          const node = this.game.network.nodes[name];
          if (node && node.routed) {
            output += `${node.ip}        10.255.0.1      255.255.255.255 UGH   0      0        0 eth0\n`;
          }
        }
      }
      return output;
    }
    if (args[0] === 'add' && args[1] === '-net') {
      const target = args[2];
      const gwIdx = args.indexOf('gw');
      const gw = gwIdx >= 0 ? args[gwIdx + 1] : null;
      if (!target || !gw) return 'Usage: route add -net <network> gw <gateway>';
      if (mirror) {
        for (const name of Object.keys(mirror.mirrorNodes)) {
          const node = this.game.network.nodes[name];
          if (node && (node.ip === gw || target.includes(node.ip))) {
            mirror.resolveMirror(name, args.join(' '));
            if (this.game?.puzzles) this.game.puzzles.onRouteResolved();
            this.game.addSystemMessage(`[ROUTE] Static route added via ${gw} — mirror ${name} resolved.`);
            return `Route added to ${target} via ${gw}. Mirror pathway stabilized.`;
          }
        }
      }
      return `Route added to ${target} via ${gw}.`;
    }
    return 'route: invalid arguments. Use: route add -net <network> gw <gateway>';
  }

  _traceroute(args) {
    const target = args.find(a => !a.startsWith('-'));
    if (!target) return 'Usage: traceroute [-s <source_ip>] <destination>';
    let output = `traceroute to ${target}, 30 hops max, 60 byte packets\n`;
    const network = this.game?.network;
    const node = network ? network.getNodeByIp(target) : null;
    const hops = [];
    if (node) {
      const path = ['10.0.0.1', '172.16.0.1'];
      for (let i = 1; i <= 3; i++) {
        const hopDelay = Math.floor(Math.random() * 20) + 1;
        if (i === 3) {
          hops.push(` 3  ${target}  ${hopDelay}.${Math.floor(Math.random() * 999)} ms  ${hopDelay + 1}.${Math.floor(Math.random() * 999)} ms  ${hopDelay + 2}.${Math.floor(Math.random() * 999)} ms`);
        } else {
          hops.push(` ${i}  ${path[i - 1]}  ${hopDelay}.${Math.floor(Math.random() * 999)} ms  ${hopDelay + 1}.${Math.floor(Math.random() * 999)} ms  ${hopDelay + 2}.${Math.floor(Math.random() * 999)} ms`);
        }
      }
    } else {
      for (let i = 1; i <= 5; i++) {
        const hopDelay = Math.floor(Math.random() * 50) + 5;
        const ip = `10.0.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
        if (i <= 3) {
          hops.push(` ${i}  ${ip}  ${hopDelay}.${Math.floor(Math.random() * 999)} ms  ${hopDelay + 1}.${Math.floor(Math.random() * 999)} ms  ${hopDelay + 2}.${Math.floor(Math.random() * 999)} ms`);
        } else {
          hops.push(` ${i}  * * *`);
        }
      }
      hops.push(` 5  ${target}  ${Math.floor(Math.random() * 30) + 10}.${Math.floor(Math.random() * 999)} ms  ${Math.floor(Math.random() * 30) + 10}.${Math.floor(Math.random() * 999)} ms  ${Math.floor(Math.random() * 30) + 10}.${Math.floor(Math.random() * 999)} ms`);
    }
    output += hops.join('\n');
    const mirror = this.game?.mirror;
    if (mirror) {
      const anomalies = mirror.getLogAnomalies();
      if (anomalies.length > 0) {
        output += '\n\n' + anomalies.join('\n');
      }
    }
    return output;
  }

  _ping(args) {
    const target = args.find(a => !a.startsWith('-'));
    if (!target) return 'Usage: ping <host>';
    const count = args.includes('-c') ? parseInt(args[args.indexOf('-c') + 1]) || 4 : 4;
    const lines = [];
    for (let i = 0; i < count; i++) {
      const delay = Math.floor(Math.random() * 40) + 1;
      lines.push(`PING ${target} (${target}) 56(84) bytes of data.`);
      lines.push(`64 bytes from ${target}: icmp_seq=${i + 1} ttl=64 time=${delay}.${Math.floor(Math.random() * 999)} ms`);
    }
    lines.push(`\n--- ${target} ping statistics ---`);
    lines.push(`${count} packets transmitted, ${count} received, 0% packet loss, time ${count * 100}ms`);
    return lines.join('\n');
  }

  _crontab(args) {
    if (args.length === 0) return 'Usage: crontab -e (edit) or crontab -l (list)';
    return this._withFS((p, fs) => {
      if (args[0] === '-l') {
        const content = fs.readFile('/etc/crontab');
        return content || 'no crontab for admin';
      }
      if (args[0] === '-e') {
        return 'crontab: editing not available in this terminal. Use: cat /etc/crontab to view.';
      }
      return 'crontab: invalid option';
    });
  }

  _mail(args) {
    const email = this.game?.email;
    if (!email) return 'Mail system unavailable.';
    if (args.length === 0) {
      const summary = email.getEmailSummary();
      if (summary.length === 0) return 'No mail.';
      let output = `Mailbox (${email.unreadCount} unread, ${summary.length} total):\n`;
      summary.forEach(e => {
        const marker = e.read ? ' ' : 'N';
        const idx = String(e.id).padStart(3);
        output += `${marker} ${idx}  ${e.timestamp}  ${e.from.padEnd(28)} ${e.subject.substring(0, 40)}\n`;
      });
      return output;
    }
    if (args[0] === '-r' || args[0] === 'read') {
      if (args[1]) {
        const id = parseInt(args[1]);
        const emailItem = email.getById(id);
        if (!emailItem) return `Message ${id} not found.`;
        email.markRead(id);
        return `From: ${emailItem.from}\nSubject: ${emailItem.subject}\nDate: ${emailItem.timestamp}\n\n${emailItem.body}`;
      }
      const unread = email.getUnread();
      if (unread.length === 0) return 'No unread messages.';
      const latest = unread[0];
      email.markRead(latest.id);
      return `From: ${latest.from}\nSubject: ${latest.subject}\nDate: ${latest.timestamp}\n\n${latest.body}`;
    }
    return 'Usage: mail (list), mail -r <id> (read)';
  }

  _ssh(args) {
    const p = this._getPanel();
    if (!p) return '';
    if (args.length === 0) return 'Usage: ssh <user>@<host>';
    const match = args[0].match(/(.+)@(.+)/);
    if (!match) return 'ssh: invalid format. Use: ssh user@host';
    const user = match[1];
    const host = match[2];
    if (!host || host === '') return 'ssh: invalid hostname';
    const network = this.game?.network;
    if (!network) return 'Network offline.';
    const nodeName = Object.keys(network.nodes).find(k => network.nodes[k].ip === host || k === host);
    if (!nodeName) return `ssh: Could not resolve hostname ${host}: Name or service not known`;
    const node = network.nodes[nodeName];
    if (!network.canSsh(p.connectedNode, nodeName)) {
      return `ssh: connect to host ${host} port 22: Connection refused (node is isolated)`;
    }
    p.connectedNode = nodeName;
    p.currentFS = this.game.getFSForNode(nodeName);
    p.cwd = '/';
    p.sshUser = user;
    this.game.addSystemMessage(`[SSH] Connected to ${nodeName} as ${user}`);
    if (this.game?.puzzles) this.game.puzzles.onSshConnected();
    return `\nWelcome to ${nodeName} (${node.ip})\n${node.segment.toUpperCase()} segment\nLinux CascadeOS 4.15.0 #1 SMP\n`;
  }

  _scp(args) {
    if (args.length < 2) return 'Usage: scp <source> <user>@<host>:<dest>';
    return this._withFS((p, fs) => {
    const src = args[0];
    const destMatch = args[1]?.match(/(.+)@(.+?):(.+)/);
    if (!destMatch) {
      const dest = this._resolvePath(args[1], p);
      if (fs.cp(this._resolvePath(src, p), dest)) {
        if (this.game?.puzzles) this.game.puzzles.checkEchoAction(this._resolvePath(src, p), 'copy');
        return '';
      }
      return 'scp: copy failed';
    }
    // Remote destination — for now just show intent
    return `scp: ${src} -> ${destMatch[2]}:${destMatch[3]}`;
    });
  }

  _topology(args) {
    const network = this.game?.network;
    if (!network) return 'Network offline.';
    return network.getTopologyAscii();
  }

  _whoami(args) {
    const p = this._getPanel();
    return p ? p.sshUser : 'admin';
  }

  _hostname(args) {
    const p = this._getPanel();
    return p ? (p.connectedNode || 'localhost') : 'localhost';
  }

  _date(args) { return new Date().toString(); }

  _echo(args) { return args.join(' '); }

  _du(args) {
    return this._withFS((p, fs) => {
      const path = args[0] ? this._resolvePath(args[0], p) : p.cwd;
      if (!fs.exists(path)) return `du: ${args[0]}: No such file or directory`;
      return `${fs.getSize(path)}\t${path}`;
    });
  }

  _df(args) {
    return this._withFS((p, fs) => {
      const total = 8388608;
      const used = fs.getSize('/');
      const avail = total - used;
      return `Filesystem     1K-blocks    Used Available Use% Mounted on\n/dev/sda1        ${total} ${used} ${avail} ${Math.round(used/total*100)}% /`;
    });
  }

  _md5sum(args) {
    if (args.length === 0) return 'Usage: md5sum <file>';
    return this._withFS((p, fs) => {
      const path = this._resolvePath(args[0], p);
      const content = fs.readFile(path);
      if (content === null) return `md5sum: ${args[0]}: No such file`;
      const hash = Utils.md5Fake(content);
      return `${hash}  ${args[0]}`;
    });
  }

  _head(args) {
    const nIdx = args.indexOf('-n');
    const lines = nIdx >= 0 ? parseInt(args[nIdx + 1]) || 10 : 10;
    const fileArg = args.find(a => !a.startsWith('-') && a !== String(lines));
    if (!fileArg) return 'Usage: head [-n <count>] <file>';
    return this._withFS((p, fs) => {
      const path = this._resolvePath(fileArg, p);
      const content = fs.readFile(path);
      if (content === null) return `head: ${fileArg}: No such file`;
      return content.split('\n').slice(0, lines).join('\n');
    });
  }

  _tail(args) {
    const nIdx = args.indexOf('-n');
    const lines = nIdx >= 0 ? parseInt(args[nIdx + 1]) || 10 : 10;
    const fileArg = args.find(a => !a.startsWith('-') && a !== String(lines));
    if (!fileArg) return 'Usage: tail [-n <count>] <file>';
    return this._withFS((p, fs) => {
      const path = this._resolvePath(fileArg, p);
      const content = fs.readFile(path);
      if (content === null) return `tail: ${fileArg}: No such file`;
      const allLines = content.split('\n');
      return allLines.slice(Math.max(0, allLines.length - lines)).join('\n');
    });
  }

  _sort(args) {
    const fileArg = args.find(a => !a.startsWith('-'));
    if (!fileArg) return 'Usage: sort [file]';
    return this._withFS((p, fs) => {
      const path = this._resolvePath(fileArg, p);
      const content = fs.readFile(path);
      if (content === null) return `sort: ${fileArg}: No such file`;
      return content.split('\n').sort().join('\n');
    });
  }

  _wc(args) {
    const fileArg = args.find(a => !a.startsWith('-'));
    if (!fileArg) return 'Usage: wc [file]';
    return this._withFS((p, fs) => {
      const path = this._resolvePath(fileArg, p);
      const content = fs.readFile(path);
      if (content === null) return `wc: ${fileArg}: No such file`;
      const lines = content.split('\n').length;
      const words = content.split(/\s+/).filter(Boolean).length;
      const chars = content.length;
      return `${lines} ${words} ${chars} ${fileArg}`;
    });
  }

  _uname(args) {
    if (args.includes('-a')) return 'Linux CascadeOS 4.15.0-042-generic #1 SMP x86_64 GNU/Linux';
    return 'Linux';
  }

  _exit(args) {
    const p = this._getPanel();
    if (!p) return '';
    if (p.connectedNode) {
      const nodeName = p.connectedNode;
      p.connectedNode = null;
      p.currentFS = null;
      p.cwd = '/';
      this.game.addSystemMessage(`[SSH] Disconnected from ${nodeName}`);
      return 'logout\nConnection closed.';
    }
    return '';
  }

  _sudo(args) {
    return 'Usage: sudo <command>';
  }

  _tab(args) {
    const tm = this.game?.tabManager;
    if (!tm) return 'Tab manager unavailable.';
    if (!args.length) {
      let out = `Tabs (${tm.panels.length} open, active: ${tm.activeIndex + 1}):\n`;
      tm.panels.forEach((p, i) => {
        const marker = i === tm.activeIndex ? '>' : ' ';
        const host = p.connectedNode ? '@' + p.connectedNode : '';
        out += `${marker} ${i + 1}. ${p.name}${host}\n`;
      });
      return out;
    }
    const cmd = args[0].toLowerCase();
    switch (cmd) {
      case 'new':
        tm.newTab();
        return `Tab created. ${tm.panels.length} open.`;
      case 'close':
        if (tm.panels.length <= 1) return 'Cannot close last tab.';
        const name = tm.getActivePanel()?.name || '';
        tm.closeTab(tm.getActivePanel());
        return `Tab "${name}" closed.`;
      case 'next':
        tm.nextTab();
        return `Switched to tab ${tm.activeIndex + 1}`;
      case 'prev':
        tm.prevTab();
        return `Switched to tab ${tm.activeIndex + 1}`;
      case 'list':
        let out = `Tabs (${tm.panels.length} open):\n`;
        tm.panels.forEach((p, i) => {
          const marker = i === tm.activeIndex ? '>' : ' ';
          const host = p.connectedNode ? ' — ' + p.connectedNode : '';
          out += `${marker} ${i + 1}. ${p.name}${host}\n`;
        });
        return out;
      case 'name':
        if (args.length < 2) return 'Usage: tab name <new name>';
        const newName = args.slice(1).join(' ');
        const active = tm.getActivePanel();
        if (active) {
          active.name = newName;
          if (active._tabElement) {
            const label = active._tabElement.querySelector('.tab-label');
            if (label) label.textContent = newName;
          }
          return `Tab renamed to "${newName}".`;
        }
        return 'No active tab.';
      default: {
        const n = parseInt(cmd);
        if (!isNaN(n) && n >= 1 && n <= tm.panels.length) {
          tm.switchTo(n - 1);
          return `Switched to tab ${n}.`;
        }
        return `tab: unknown action "${cmd}". Use: new, close, next, prev, list, name, <n>`;
      }
    }
  }

  _resolvePath(target, p) {
    if (!target) return p ? p.cwd : '/';
    if (target.startsWith('/')) return target;
    if (target === '..') {
      const parts = (p ? p.cwd : '/').replace(/\/$/, '').split('/').filter(Boolean);
      parts.pop();
      return '/' + parts.join('/');
    }
    if (target === '.') return p ? p.cwd : '/';
    const cwd = p ? p.cwd : '/';
    return (cwd === '/' ? '' : cwd) + '/' + target;
  }
}
