import { describe, it, expect, beforeAll } from 'vitest';
import { createInstances } from './setup.js';

let VirtualFS, FileTypes;

beforeAll(() => {
  const instances = createInstances();
  VirtualFS = instances.VirtualFS;
  FileTypes = instances.FileTypes;
});

describe('VirtualFS — constructor', () => {
  it('root создаётся как директория', () => {
    const fs = new VirtualFS();
    expect(fs.root.type).toBe('dir');
    expect(fs.root.children).toEqual({});
  });

  it('root имеет тип dir', () => {
    const fs = new VirtualFS();
    expect(fs.isDir('/')).toBe(true);
  });
});

describe('VirtualFS — writeFile / readFile', () => {
  it('writeFile создаёт файл по пути /usr/lib/.bloomd', () => {
    const fs = new VirtualFS();
    fs.mkdir('/usr');
    fs.mkdir('/usr/lib');
    const result = fs.writeFile('/usr/lib/.bloomd', 'ELF...');
    expect(result).toBe(true);
    expect(fs.exists('/usr/lib/.bloomd')).toBe(true);
  });

  it('readFile возвращает содержимое созданного файла', () => {
    const fs = new VirtualFS();
    fs.mkdir('/usr');
    fs.mkdir('/usr/lib');
    fs.writeFile('/usr/lib/.bloomd', 'ELF...');
    expect(fs.readFile('/usr/lib/.bloomd')).toBe('ELF...');
  });

  it('readFile несуществующего файла → null', () => {
    const fs = new VirtualFS();
    expect(fs.readFile('/nonexistent')).toBe(null);
  });

  it('writeFile перезаписывает существующий файл', () => {
    const fs = new VirtualFS();
    fs.mkdir('/tmp');
    fs.writeFile('/tmp/test', 'old');
    fs.writeFile('/tmp/test', 'new');
    expect(fs.readFile('/tmp/test')).toBe('new');
  });

  it('writeFile создаёт файлы во вложенных директориях (parent/path/name.txt)', () => {
    const fs = new VirtualFS();
    fs.mkdir('/parent');
    fs.mkdir('/parent/path');
    fs.writeFile('/parent/path/name.txt', 'content');
    expect(fs.readFile('/parent/path/name.txt')).toBe('content');
  });
});

describe('VirtualFS — mkdir', () => {
  it('mkdir создаёт директорию', () => {
    const fs = new VirtualFS();
    expect(fs.mkdir('/newdir')).toBe(true);
    expect(fs.isDir('/newdir')).toBe(true);
  });

  it('mkdir существующей директории → false', () => {
    const fs = new VirtualFS();
    fs.mkdir('/newdir');
    expect(fs.mkdir('/newdir')).toBe(false);
  });

  it('mkdir с родительскими путями (если нет — не создаёт)', () => {
    const fs = new VirtualFS();
    expect(fs.mkdir('/a/b/c')).toBe(false);
    expect(fs.exists('/a')).toBe(false);
  });
});

describe('VirtualFS — ls', () => {
  it('ls корня возвращает все файлы/директории', () => {
    const fs = new VirtualFS();
    fs.mkdir('/testdir');
    fs.writeFile('/testfile', 'x');
    const entries = fs.ls('/');
    const names = entries.map(e => e.name);
    expect(names).toContain('testdir');
    expect(names).toContain('testfile');
  });

  it('ls показывает все файлы включая скрытые, помечая их флагом hidden', () => {
    const fs = new VirtualFS();
    fs.mkdir('/usr');
    fs.mkdir('/usr/lib');
    fs.writeFile('/usr/lib/.bloomd', 'x');
    const entries = fs.ls('/usr/lib');
    const dotfile = entries.find(e => e.name === '.bloomd');
    expect(dotfile).toBeDefined();
    expect(dotfile.hidden).toBe(true);
  });

  it('ls помечает скрытые файлы флагом hidden:true', () => {
    const fs = new VirtualFS();
    fs.mkdir('/usr');
    fs.mkdir('/usr/lib');
    fs.writeFile('/usr/lib/.bloomd', 'x');
    const entries = fs.ls('/usr/lib');
    const hidden = entries.filter(e => e.hidden);
    expect(hidden.length).toBe(1);
    expect(hidden[0].name).toBe('.bloomd');
  });

  it('ls возвращает правильные атрибуты: name, type, permissions, size, owner', () => {
    const fs = new VirtualFS();
    fs.mkdir('/usr');
    fs.writeFile('/file.txt', 'hello');
    const entries = fs.ls('/');
    const file = entries.find(e => e.name === 'file.txt');
    expect(file).toBeDefined();
    expect(file.type).toBe('file');
    expect(file.permissions).toBeDefined();
    expect(file.size).toBe(5);
    expect(file.owner).toBe('admin');
  });
});

describe('VirtualFS — rm', () => {
  it('rm удаляет файл', () => {
    const fs = new VirtualFS();
    fs.mkdir('/tmp');
    fs.writeFile('/tmp/test', 'x');
    expect(fs.rm('/tmp/test')).toBe(true);
    expect(fs.exists('/tmp/test')).toBe(false);
  });

  it('rm несуществующего файла → false', () => {
    const fs = new VirtualFS();
    expect(fs.rm('/nonexistent')).toBe(false);
  });

  it('rm директории удаляет директорию', () => {
    const fs = new VirtualFS();
    fs.mkdir('/mydir');
    expect(fs.rm('/mydir')).toBe(true);
    expect(fs.exists('/mydir')).toBe(false);
  });
});

describe('VirtualFS — find', () => {
  it('find находит файлы по подстроке в любом месте пути', () => {
    const fs = new VirtualFS();
    fs.mkdir('/usr');
    fs.mkdir('/usr/lib');
    fs.writeFile('/usr/lib/.bloomd', 'x');
    const results = fs.find('/', '.bloomd');
    expect(results.length).toBeGreaterThan(0);
    expect(results.some(r => r.path.includes('.bloomd'))).toBe(true);
  });

  it('find находит файлы в поддиректориях', () => {
    const fs = new VirtualFS();
    fs.mkdir('/a');
    fs.mkdir('/a/b');
    fs.writeFile('/a/b/deep.txt', 'x');
    const results = fs.find('/', 'deep');
    expect(results.length).toBe(1);
  });

  it('find без совпадений → []', () => {
    const fs = new VirtualFS();
    expect(fs.find('/', 'zzz_nonexistent_zzz')).toEqual([]);
  });

  it('find \'/\' возвращает все файлы системы', () => {
    const fs = new VirtualFS();
    fs.mkdir('/test');
    fs.writeFile('/test/a.txt', 'x');
    fs.writeFile('/test/b.txt', 'y');
    const results = fs.find('/', '');
    expect(results.length).toBeGreaterThanOrEqual(2);
  });

  it('find с шаблоном \'.bloomd\' находит /usr/lib/.bloomd', () => {
    const fs = new VirtualFS();
    fs.mkdir('/usr');
    fs.mkdir('/usr/lib');
    fs.writeFile('/usr/lib/.bloomd', 'ELF');
    const results = fs.find('/', '.bloomd');
    expect(results.some(r => r.path === '/usr/lib/.bloomd')).toBe(true);
  });
});

describe('VirtualFS — mv', () => {
  it('mv перемещает файл', () => {
    const fs = new VirtualFS();
    fs.mkdir('/src');
    fs.mkdir('/dst');
    fs.writeFile('/src/test.txt', 'content');
    expect(fs.mv('/src/test.txt', '/dst/test.txt')).toBe(true);
    expect(fs.exists('/src/test.txt')).toBe(false);
    expect(fs.readFile('/dst/test.txt')).toBe('content');
  });

  it('mv изменяет путь', () => {
    const fs = new VirtualFS();
    fs.mkdir('/old');
    fs.writeFile('/old/file', 'data');
    fs.mv('/old/file', '/file');
    expect(fs.exists('/old/file')).toBe(false);
    expect(fs.readFile('/file')).toBe('data');
  });
});

describe('VirtualFS — cp', () => {
  it('cp копирует содержимое файла', () => {
    const fs = new VirtualFS();
    fs.mkdir('/src');
    fs.mkdir('/dst');
    fs.writeFile('/src/orig.txt', 'original');
    expect(fs.cp('/src/orig.txt', '/dst/copy.txt')).toBe(true);
    expect(fs.readFile('/dst/copy.txt')).toBe('original');
  });

  it('cp не изменяет оригинал', () => {
    const fs = new VirtualFS();
    fs.mkdir('/src');
    fs.mkdir('/dst');
    fs.writeFile('/src/orig.txt', 'original');
    fs.cp('/src/orig.txt', '/dst/copy.txt');
    fs.writeFile('/dst/copy.txt', 'modified');
    expect(fs.readFile('/src/orig.txt')).toBe('original');
  });
});

describe('VirtualFS — chmod', () => {
  it('chmod меняет permissions', () => {
    const fs = new VirtualFS();
    fs.writeFile('/test', 'x');
    fs.chmod('/test', '755');
    const node = fs.getNode('/test');
    expect(node.permissions).toBe('-rwxr-xr-x');
  });
});

describe('VirtualFS — getSize', () => {
  it('getSize суммирует размеры вложенных файлов', () => {
    const fs = new VirtualFS();
    fs.mkdir('/d');
    fs.writeFile('/d/a', '12345');
    fs.writeFile('/d/b', '67890');
    expect(fs.getSize('/d')).toBe(10);
  });

  it('getSize одного файла = его длина', () => {
    const fs = new VirtualFS();
    fs.writeFile('/f', 'hello');
    expect(fs.getSize('/f')).toBe(5);
  });
});

describe('VirtualFS — fromJSON / toJSON', () => {
  it('сериализация и десериализация сохраняют дерево и содержимое', () => {
    const fs = new VirtualFS();
    fs.mkdir('/data');
    fs.writeFile('/data/file.txt', 'content');
    const json = fs.toJSON();
    const fs2 = VirtualFS.fromJSON(json);
    expect(fs2.readFile('/data/file.txt')).toBe('content');
    expect(fs2.isDir('/data')).toBe(true);
  });

  it('fromJSON загружает стандартную файловую систему из FileTypes.getStandardFS()', () => {
    const fsData = FileTypes.getStandardFS('dmz-03', { ip: '10.0.1.3' });
    const fs = VirtualFS.fromJSON(fsData);
    expect(fs.exists('/bin')).toBe(true);
    expect(fs.exists('/etc')).toBe(true);
    expect(fs.exists('/var')).toBe(true);
    expect(fs.exists('/usr')).toBe(true);
    expect(fs.readFile('/etc/hostname')).toBe('dmz-03\n');
    expect(fs.isDir('/bin')).toBe(true);
  });
});
