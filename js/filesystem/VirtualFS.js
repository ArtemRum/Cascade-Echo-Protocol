class VirtualFS {
  constructor() {
    this.root = { type: 'dir', children: {}, permissions: 'drwxr-xr-x', owner: 'root', group: 'root' };
  }

  static fromJSON(data) {
    const fs = new VirtualFS();
    fs.root = fs._deserialize(data);
    return fs;
  }

  toJSON() {
    return this._serialize(this.root);
  }

  _serialize(node) {
    if (node.type === 'file') {
      return { type: 'file', content: node.content, permissions: node.permissions, owner: node.owner, group: node.group };
    }
    const children = {};
    for (const [name, child] of Object.entries(node.children || {})) {
      children[name] = this._serialize(child);
    }
    return { type: 'dir', children, permissions: node.permissions, owner: node.owner, group: node.group };
  }

  _deserialize(data) {
    if (data.type === 'file') {
      return { type: 'file', content: data.content || '', permissions: data.permissions || '-rw-r--r--', owner: data.owner || 'root', group: data.group || 'root' };
    }
    const children = {};
    for (const [name, childData] of Object.entries(data.children || {})) {
      children[name] = this._deserialize(childData);
    }
    return { type: 'dir', children, permissions: data.permissions || 'drwxr-xr-x', owner: data.owner || 'root', group: data.group || 'root' };
  }

  _resolve(path) {
    if (!path || path === '/') return { node: this.root, parent: null, name: '' };
    const parts = path.replace(/\/+/g, '/').replace(/\/$/, '').split('/').filter(Boolean);
    let current = this.root;
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (part === '') continue;
      if (!current.children[part] || current.children[part].type !== 'dir') return null;
      current = current.children[part];
    }
    const name = parts[parts.length - 1];
    return { node: current.children[name] || null, parent: current, name };
  }

  _resolveDir(path) {
    if (!path || path === '/') return { node: this.root, parent: null, name: '' };
    const parts = path.replace(/\/+/g, '/').replace(/\/$/, '').split('/').filter(Boolean);
    let current = this.root;
    for (const part of parts) {
      if (!current.children[part] || current.children[part].type !== 'dir') return null;
      current = current.children[part];
    }
    return { node: current, parent: null, name: '' };
  }

  _resolveParent(path) {
    const parts = path.replace(/\/+/g, '/').replace(/\/$/, '').split('/').filter(Boolean);
    if (parts.length === 0) return { parent: null, name: '' };
    const name = parts.pop();
    const parentPath = '/' + parts.join('/');
    const parentResult = this._resolveDir(parentPath || '/');
    if (!parentResult) return null;
    return { parent: parentResult.node, name };
  }

  exists(path) {
    if (path === '/') return true;
    return this._resolve(path) !== null && this._resolve(path).node !== null;
  }

  isDir(path) {
    const r = this._resolve(path);
    return r && r.node && r.node.type === 'dir';
  }

  isFile(path) {
    const r = this._resolve(path);
    return r && r.node && r.node.type === 'file';
  }

  readFile(path) {
    const r = this._resolve(path);
    if (!r || !r.node || r.node.type !== 'file') return null;
    return r.node.content;
  }

  writeFile(path, content) {
    const result = this._resolveParent(path);
    if (!result) return false;
    const { parent, name } = result;
    if (!parent) return false;
    parent.children[name] = { type: 'file', content: content || '', permissions: '-rw-r--r--', owner: 'admin', group: 'admin' };
    return true;
  }

  mkdir(path) {
    const result = this._resolveParent(path);
    if (!result) return false;
    const { parent, name } = result;
    if (!parent) return false;
    if (parent.children[name]) return false;
    parent.children[name] = { type: 'dir', children: {}, permissions: 'drwxr-xr-x', owner: 'admin', group: 'admin' };
    return true;
  }

  rm(path) {
    const result = this._resolveParent(path);
    if (!result) return false;
    const { parent, name } = result;
    if (!parent || !parent.children[name]) return false;
    delete parent.children[name];
    return true;
  }

  mv(src, dest) {
    const srcResult = this._resolveParent(src);
    if (!srcResult) return false;
    const { parent: srcParent, name: srcName } = srcResult;
    if (!srcParent || !srcParent.children[srcName]) return false;

    const node = srcParent.children[srcName];
    delete srcParent.children[srcName];

    const destResult = this._resolveParent(dest);
    if (!destResult) return false;
    const { parent: destParent, name: destName } = destResult;
    if (!destParent) return false;
    destParent.children[destName] = node;
    return true;
  }

  cp(src, dest) {
    const srcResult = this._resolve(src);
    if (!srcResult || !srcResult.node) return false;
    const node = this._serialize(srcResult.node);

    const destResult = this._resolveParent(dest);
    if (!destResult) return false;
    const { parent: destParent, name: destName } = destResult;
    if (!destParent) return false;
    destParent.children[destName] = this._deserialize(node);
    return true;
  }

  ls(path) {
    const dir = path ? this._resolveDir(path) : { node: this.root };
    if (!dir || !dir.node || dir.node.type !== 'dir') return null;
    return Object.entries(dir.node.children || {}).map(([name, node]) => ({
      name,
      type: node.type,
      permissions: node.permissions,
      owner: node.owner,
      group: node.group,
      size: node.type === 'file' ? (node.content || '').length : 0,
      hidden: name.startsWith('.')
    })).sort((a, b) => a.name.localeCompare(b.name));
  }

  find(path, pattern) {
    const dir = path ? this._resolveDir(path) : { node: this.root };
    if (!dir) return [];
    const results = [];
    const search = (node, currentPath) => {
      if (!node || !node.children) return;
      for (const [name, child] of Object.entries(node.children)) {
        const fullPath = currentPath === '/' ? '/' + name : currentPath + '/' + name;
        if (name.includes(pattern) || fullPath.includes(pattern)) {
          results.push({ name, path: fullPath, type: child.type });
        }
        if (child.type === 'dir') search(child, fullPath);
      }
    };
    const startPath = path || '/';
    search(dir.node, startPath === '/' ? '' : startPath);
    return results;
  }

  getSize(path) {
    const r = this._resolve(path);
    if (!r || !r.node) return 0;
    if (r.node.type === 'file') return (r.node.content || '').length;
    let total = 0;
    const count = (node) => {
      if (!node.children) return;
      for (const child of Object.values(node.children)) {
        if (child.type === 'file') total += (child.content || '').length;
        if (child.type === 'dir') count(child);
      }
    };
    count(r.node);
    return total;
  }

  chmod(path, mode) {
    const r = this._resolve(path);
    if (!r || !r.node) return false;
    const typePrefix = r.node.type === 'dir' ? 'd' : '-';
    const modeMap = {
      '755': 'rwxr-xr-x', '644': 'rw-r--r--', '777': 'rwxrwxrwx',
      '700': 'rwx------', '600': 'rw-------', '444': 'r--r--r--',
      '555': 'r-xr-xr-x', '000': '---------'
    };
    r.node.permissions = typePrefix + (modeMap[mode] || 'rw-r--r--');
    return true;
  }

  getNode(path) {
    const r = this._resolve(path);
    return r ? r.node : null;
  }
}
