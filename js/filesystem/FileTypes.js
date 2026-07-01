class FileTypes {
  static getStandardFS(hostname, nodeData) {
    const ip = nodeData ? nodeData.ip : '10.0.0.1';
    return {
      type: 'dir',
      children: {
        'bin': { type: 'dir', children: {
          'sh': { type: 'file', content: '#!/bin/sh\n', permissions: '-rwxr-xr-x', owner: 'root', group: 'root' },
          'ls': { type: 'file', content: '', permissions: '-rwxr-xr-x', owner: 'root', group: 'root' },
          'ps': { type: 'file', content: '', permissions: '-rwxr-xr-x', owner: 'root', group: 'root' },
          'kill': { type: 'file', content: '', permissions: '-rwxr-xr-x', owner: 'root', group: 'root' },
          'rm': { type: 'file', content: '', permissions: '-rwxr-xr-x', owner: 'root', group: 'root' },
          'cp': { type: 'file', content: '', permissions: '-rwxr-xr-x', owner: 'root', group: 'root' },
          'mv': { type: 'file', content: '', permissions: '-rwxr-xr-x', owner: 'root', group: 'root' },
          'find': { type: 'file', content: '', permissions: '-rwxr-xr-x', owner: 'root', group: 'root' },
          'grep': { type: 'file', content: '', permissions: '-rwxr-xr-x', owner: 'root', group: 'root' },
          'cat': { type: 'file', content: '', permissions: '-rwxr-xr-x', owner: 'root', group: 'root' },
          'chmod': { type: 'file', content: '', permissions: '-rwxr-xr-x', owner: 'root', group: 'root' },
          'mount': { type: 'file', content: '', permissions: '-rwxr-xr-x', owner: 'root', group: 'root' },
          'touch': { type: 'file', content: '', permissions: '-rwxr-xr-x', owner: 'root', group: 'root' },
          'mkdir': { type: 'file', content: '', permissions: '-rwxr-xr-x', owner: 'root', group: 'root' },
          'pwd': { type: 'file', content: '', permissions: '-rwxr-xr-x', owner: 'root', group: 'root' },
          'df': { type: 'file', content: '', permissions: '-rwxr-xr-x', owner: 'root', group: 'root' },
          'du': { type: 'file', content: '', permissions: '-rwxr-xr-x', owner: 'root', group: 'root' },
        }, permissions: 'drwxr-xr-x', owner: 'root', group: 'root' },
        'sbin': { type: 'dir', children: {
          'ifconfig': { type: 'file', content: '', permissions: '-rwxr-xr-x', owner: 'root', group: 'root' },
          'iptables': { type: 'file', content: '', permissions: '-rwxr-xr-x', owner: 'root', group: 'root' },
          'route': { type: 'file', content: '', permissions: '-rwxr-xr-x', owner: 'root', group: 'root' },
          'traceroute': { type: 'file', content: '', permissions: '-rwxr-xr-x', owner: 'root', group: 'root' },
          'ping': { type: 'file', content: '', permissions: '-rwxr-xr-x', owner: 'root', group: 'root' },
          'reboot': { type: 'file', content: '', permissions: '-rwxr-xr-x', owner: 'root', group: 'root' },
        }, permissions: 'drwxr-xr-x', owner: 'root', group: 'root' },
        'etc': { type: 'dir', children: {
          'hostname': { type: 'file', content: hostname + '\n', permissions: '-rw-r--r--', owner: 'root', group: 'root' },
          'hosts': { type: 'file', content: '127.0.0.1 localhost\n::1 localhost\n', permissions: '-rw-r--r--', owner: 'root', group: 'root' },
          'passwd': { type: 'file', content: 'root:x:0:0:root:/root:/bin/sh\nadmin:x:1000:1000:Admin:/home/admin:/bin/sh\n', permissions: '-rw-r--r--', owner: 'root', group: 'root' },
          'crontab': { type: 'file', content: '# /etc/crontab: system-wide crontab\n#每分钟执行一次\nSHELL=/bin/sh\nPATH=/usr/local/sbin:/usr/local/bin:/sbin:/bin:/usr/sbin:/usr/bin\n\n', permissions: '-rw-r--r--', owner: 'root', group: 'root' },
          'rc.local': { type: 'file', content: '#!/bin/sh\n# rc.local\n# Default: no auto-starts\n', permissions: '-rwxr-xr-x', owner: 'root', group: 'root' },
          'motd': { type: 'file', content: 'Cascade Dynamics Network Server\nAuthorized access only. All activity is monitored.\n', permissions: '-rw-r--r--', owner: 'root', group: 'root' },
        }, permissions: 'drwxr-xr-x', owner: 'root', group: 'root' },
        'var': { type: 'dir', children: {
          'log': { type: 'dir', children: {
            'syslog': { type: 'file', content: FileTypes._generateSyslog(hostname, ip), permissions: '-rw-r--r--', owner: 'admin', group: 'admin' },
            'auth.log': { type: 'file', content: FileTypes._generateAuthLog(hostname), permissions: '-rw-r--r--', owner: 'admin', group: 'admin' },
          }, permissions: 'drwxr-xr-x', owner: 'admin', group: 'admin' },
          'spool': { type: 'dir', children: {}, permissions: 'drwxr-xr-x', owner: 'admin', group: 'admin' },
          'tmp': { type: 'dir', children: {}, permissions: 'drwxrwxrwt', owner: 'root', group: 'root' },
        }, permissions: 'drwxr-xr-x', owner: 'root', group: 'root' },
        'usr': { type: 'dir', children: {
          'lib': { type: 'dir', children: {
            'libc.so': { type: 'file', content: '', permissions: '-rwxr-xr-x', owner: 'root', group: 'root' },
            'libssl.so': { type: 'file', content: '', permissions: '-rwxr-xr-x', owner: 'root', group: 'root' },
            'libpam.so': { type: 'file', content: '', permissions: '-rwxr-xr-x', owner: 'root', group: 'root' },
          }, permissions: 'drwxr-xr-x', owner: 'root', group: 'root' },
          'bin': { type: 'dir', children: {}, permissions: 'drwxr-xr-x', owner: 'root', group: 'root' },
          'local': { type: 'dir', children: {
            'bin': { type: 'dir', children: {}, permissions: 'drwxr-xr-x', owner: 'root', group: 'root' },
          }, permissions: 'drwxr-xr-x', owner: 'root', group: 'root' },
          'sbin': { type: 'dir', children: {}, permissions: 'drwxr-xr-x', owner: 'root', group: 'root' },
        }, permissions: 'drwxr-xr-x', owner: 'root', group: 'root' },
        'tmp': { type: 'dir', children: {
          'temp_data': { type: 'file', content: 'Temporary cache data\n', permissions: '-rw-rw-rw-', owner: 'admin', group: 'admin' },
        }, permissions: 'drwxrwxrwt', owner: 'root', group: 'root' },
        'home': { type: 'dir', children: {
          'admin': { type: 'dir', children: {
            '.ssh': { type: 'dir', children: {
              'authorized_keys': { type: 'file', content: 'ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQC... operator-key\n', permissions: '-rw-------', owner: 'admin', group: 'admin' },
            }, permissions: 'drwx------', owner: 'admin', group: 'admin' },
            '.bash_history': { type: 'file', content: 'ls\ncd /var/log\ncat syslog\ntop\n', permissions: '-rw-------', owner: 'admin', group: 'admin' },
          }, permissions: 'drwxr-xr-x', owner: 'admin', group: 'admin' },
        }, permissions: 'drwxr-xr-x', owner: 'root', group: 'root' },
        'root': { type: 'dir', children: {}, permissions: 'drwx------', owner: 'root', group: 'root' },
        'opt': { type: 'dir', children: {}, permissions: 'drwxr-xr-x', owner: 'root', group: 'root' },
        'mnt': { type: 'dir', children: {}, permissions: 'drwxr-xr-x', owner: 'root', group: 'root' },
        'dev': { type: 'dir', children: {
          'null': { type: 'file', content: '', permissions: '-rw-rw-rw-', owner: 'root', group: 'root' },
          'zero': { type: 'file', content: '', permissions: '-rw-rw-rw-', owner: 'root', group: 'root' },
          'random': { type: 'file', content: '', permissions: '-rw-rw-rw-', owner: 'root', group: 'root' },
        }, permissions: 'drwxr-xr-x', owner: 'root', group: 'root' },
        'proc': { type: 'dir', children: {
          'cpuinfo': { type: 'file', content: 'processor: 0\nvendor_id: GenuineIntel\nmodel name: Cascade Xeon @ 2.40GHz\n', permissions: '-r--r--r--', owner: 'root', group: 'root' },
          'meminfo': { type: 'file', content: 'MemTotal: 8192000 kB\nMemFree: 4123000 kB\n', permissions: '-r--r--r--', owner: 'root', group: 'root' },
          'uptime': { type: 'file', content: '1234567.89 98765.43\n', permissions: '-r--r--r--', owner: 'root', group: 'root' },
        }, permissions: 'dr-xr-xr-x', owner: 'root', group: 'root' },
      },
      permissions: 'drwxr-xr-x', owner: 'root', group: 'root'
    };
  }

  static _generateSyslog(hostname, ip) {
    const now = new Date();
    const lines = [];
    for (let i = 10; i > 0; i--) {
      const d = new Date(now - i * 60000);
      const ts = d.toISOString().replace('T', ' ').substring(0, 19);
      lines.push(`${ts} ${hostname} kernel: [    ${Math.floor(Math.random() * 10000)}.${Math.floor(Math.random() * 999999)}] eth0: link up, 1000Mbps, full-duplex`);
    }
    lines.push(`${new Date().toISOString().replace('T', ' ').substring(0, 19)} ${hostname} kernel: [    ${Math.floor(Math.random() * 10000)}.${Math.floor(Math.random() * 999999)}] Initializing network interface eth0`);
    return lines.join('\n') + '\n';
  }

  static _generateAuthLog(hostname) {
    const now = new Date();
    const lines = [];
    for (let i = 5; i > 0; i--) {
      const d = new Date(now - i * 120000);
      const ts = d.toISOString().replace('T', ' ').substring(0, 19);
      lines.push(`${ts} ${hostname} sshd[${1000 + i}]: Accepted publickey for admin from 10.0.0.${i} port ${22000 + i} ssh2: RSA SHA256:xxxxxxxxxx`);
    }
    return lines.join('\n') + '\n';
  }
}
