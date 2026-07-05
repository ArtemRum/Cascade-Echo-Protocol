import { describe, it, expect, beforeAll } from 'vitest';
import { createInstances } from './setup.js';

let VirtualFS, FileTypes;

beforeAll(() => {
  const instances = createInstances();
  VirtualFS = instances.VirtualFS;
  FileTypes = instances.FileTypes;
});

describe('FileTypes.getStandardFS', () => {
  it('возвращает дерево с bin, sbin, etc, var, usr, tmp, home, root, proc, dev', () => {
    const fsData = FileTypes.getStandardFS('test', { ip: '10.0.0.1' });
    const fs = VirtualFS.fromJSON(fsData);
    const dirs = ['bin', 'sbin', 'etc', 'var', 'usr', 'tmp', 'home', 'root', 'proc', 'dev'];
    for (const d of dirs) {
      expect(fs.isDir('/' + d)).toBe(true);
    }
  });

  it('/usr/lib содержит libc.so, libssl.so, libpam.so', () => {
    const fs = VirtualFS.fromJSON(FileTypes.getStandardFS('test', { ip: '10.0.0.1' }));
    expect(fs.exists('/usr/lib/libc.so')).toBe(true);
    expect(fs.exists('/usr/lib/libssl.so')).toBe(true);
    expect(fs.exists('/usr/lib/libpam.so')).toBe(true);
  });

  it('/etc/hostname содержит переданный hostname', () => {
    const fs = VirtualFS.fromJSON(FileTypes.getStandardFS('dmz-03', { ip: '10.0.1.3' }));
    expect(fs.readFile('/etc/hostname')).toBe('dmz-03\n');
  });

  it('/var/log/syslog не пустой', () => {
    const fs = VirtualFS.fromJSON(FileTypes.getStandardFS('dmz-03', { ip: '10.0.1.3' }));
    const log = fs.readFile('/var/log/syslog');
    expect(log).toBeTruthy();
    expect(log.length).toBeGreaterThan(50);
  });

  it('/etc/crontab содержит crontab-заголовок', () => {
    const fs = VirtualFS.fromJSON(FileTypes.getStandardFS('test', { ip: '10.0.0.1' }));
    const ct = fs.readFile('/etc/crontab');
    expect(ct).toContain('/etc/crontab');
    expect(ct).toContain('SHELL');
    expect(ct).toContain('PATH');
  });

  it('/tmp содержит temp_data', () => {
    const fs = VirtualFS.fromJSON(FileTypes.getStandardFS('test', { ip: '10.0.0.1' }));
    expect(fs.readFile('/tmp/temp_data')).toBeTruthy();
  });

  it('/home/admin/.ssh/authorized_keys содержит ключ', () => {
    const fs = VirtualFS.fromJSON(FileTypes.getStandardFS('test', { ip: '10.0.0.1' }));
    const key = fs.readFile('/home/admin/.ssh/authorized_keys');
    expect(key).toContain('ssh-rsa');
  });
});
