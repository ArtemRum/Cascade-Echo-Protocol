class AuthManager {
  constructor() {
    this.currentUser = null;
    this._usersKey = 'cascade_users';
  }

  _getUsers() {
    try {
      return JSON.parse(localStorage.getItem(this._usersKey)) || {};
    } catch {
      return {};
    }
  }

  _saveUsers(users) {
    localStorage.setItem(this._usersKey, JSON.stringify(users));
  }

  _hash(str) {
    return Utils.hash(str);
  }

  getUsers() {
    const users = this._getUsers();
    return Object.entries(users).map(([username, data]) => ({
      username,
      hasSave: data.save !== null && data.save !== undefined,
      lastPlayed: data.lastPlayed || 0,
    }));
  }

  login(username, password) {
    const users = this._getUsers();
    const user = users[username];
    if (!user) return { ok: false, error: 'User not found' };
    if (user.password !== this._hash(password)) return { ok: false, error: 'Wrong password' };
    this.currentUser = username;
    return { ok: true, save: user.save || null };
  }

  register(username, password) {
    if (!username || username.length < 2) return { ok: false, error: 'Username too short (min 2 chars)' };
    if (!password || password.length < 3) return { ok: false, error: 'Password too short (min 3 chars)' };
    if (!/^[a-zA-Z0-9_-]+$/.test(username)) return { ok: false, error: 'Username: only letters, numbers, - and _' };
    const users = this._getUsers();
    if (users[username]) return { ok: false, error: 'User already exists' };
    users[username] = {
      password: this._hash(password),
      save: null,
      created: Date.now(),
      lastPlayed: Date.now(),
    };
    this._saveUsers(users);
    this.currentUser = username;
    return { ok: true, save: null };
  }

  deleteUser(username, password) {
    const users = this._getUsers();
    const user = users[username];
    if (!user) return false;
    if (user.password !== this._hash(password)) return false;
    const saveKey = this._getSaveKey(username);
    localStorage.removeItem(saveKey);
    delete users[username];
    this._saveUsers(users);
    if (this.currentUser === username) this.currentUser = null;
    return true;
  }

  saveGame(data) {
    if (!this.currentUser) return false;
    const users = this._getUsers();
    if (!users[this.currentUser]) return false;
    users[this.currentUser].save = data;
    users[this.currentUser].lastPlayed = Date.now();
    this._saveUsers(users);
    const saveKey = this._getSaveKey(this.currentUser);
    localStorage.setItem(saveKey, JSON.stringify({ version: 1, timestamp: Date.now(), ...data }));
    return true;
  }

  loadGame() {
    if (!this.currentUser) return null;
    const saveKey = this._getSaveKey(this.currentUser);
    try {
      const raw = localStorage.getItem(saveKey);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  hasSave(username) {
    const users = this._getUsers();
    return users[username] && users[username].save !== null;
  }

  logout() {
    this.currentUser = null;
  }

  isLoggedIn() {
    return this.currentUser !== null;
  }

  _getSaveKey(username) {
    return `cascade_save_${username}`;
  }
}
