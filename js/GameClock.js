class GameClock {
  constructor(baseDate) {
    this.baseDate = baseDate || new Date();
    this.elapsed = 0;
  }

  tick(seconds) {
    this.elapsed += seconds;
  }

  now() {
    return new Date(this.baseDate.getTime() + this.elapsed * 1000);
  }

  toISOString() {
    return this.now().toISOString().replace('T', ' ').substring(0, 19);
  }

  toLocaleTimeString() {
    return this.now().toLocaleTimeString();
  }

  toShortTime() {
    const d = this.now();
    return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  }

  getTime() {
    return this.now().getTime();
  }

  toString() {
    return this.now().toString();
  }

  toJSON() {
    return { baseDate: this.baseDate.toISOString(), elapsed: this.elapsed };
  }

  fromJSON(data) {
    this.baseDate = new Date(data.baseDate);
    this.elapsed = data.elapsed;
  }
}
