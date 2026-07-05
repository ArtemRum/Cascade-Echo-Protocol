class EmailClient {
  constructor(storyData, gameClock, username) {
    this.data = storyData;
    this.clock = gameClock || null;
    this.username = username || 'operator';
    this.inbox = [];
    this.unreadCount = 0;
    this.complaintIndex = 0;
    this.nextId = 1;
  }

  addEmail(email) {
    const now = this.clock ? this.clock.toISOString() : new Date().toISOString().substring(0, 19).replace('T', ' ');
    const msg = {
      id: this.nextId++,
      from: email.from || 'unknown@cascade.com',
      subject: email.subject || 'No subject',
      body: email.body || '',
      read: false,
      timestamp: now,
      server: email.server || null,
    };
    this.inbox.push(msg);
    this.unreadCount++;
    if (this.onNewEmail) this.onNewEmail(msg);
    return msg;
  }

  addPlotEmail(emailId) {
    const plotEmails = this.data?.emails?.plot || {};
    const emailData = plotEmails[emailId];
    if (!emailData) return false;
    let body = emailData.body || '';
    if (this.username) {
      body = body.replace(/\{username\}/g, this.username);
    }
    this.addEmail({
      from: emailData.from || 'system@cascade.com',
      subject: emailData.subject || 'Notification',
      body: body,
    });
    return true;
  }

  addComplaint(nodeName, segment) {
    const templates = this.data?.emails?.complaint_templates || [];
    if (templates.length === 0) return;
    const template = templates[this.complaintIndex % templates.length];
    this.complaintIndex++;
    const body = template
      .replace('{id}', String(Math.floor(Math.random() * 9000) + 1000))
      .replace('{service}', nodeName || 'server')
      .replace('{segment}', segment || 'DMZ');
    this.addEmail({
      from: `user${Math.floor(Math.random() * 9000) + 1000}@cascade.com`,
      subject: template.split('\n')[0].replace('Subject: ', ''),
      body: body.split('\n').slice(1).join('\n').trim(),
      server: nodeName,
    });
  }

  addAssistantMessage(subject, body) {
    this.addEmail({
      from: 'assistant@cascade.com',
      subject: subject || '[ASSISTANT] Guidance',
      body: body || '',
    });
  }

  getInbox() {
    return this.inbox;
  }

  getUnread(serverName) {
    if (!serverName) return this.inbox.filter(e => !e.read);
    return this.inbox.filter(e => !e.read && (!e.server || e.server === serverName));
  }

  getById(id) {
    return this.inbox.find(e => e.id === id);
  }

  markRead(id) {
    const email = this.getById(id);
    if (email && !email.read) {
      email.read = true;
      this.unreadCount--;
      return true;
    }
    return false;
  }

  markAllRead() {
    for (const email of this.inbox) {
      if (!email.read) this.unreadCount--;
      email.read = true;
    }
  }

  getEmailSummary(serverName) {
    const filtered = serverName
      ? this.inbox.filter(e => !e.server || e.server === serverName)
      : this.inbox;
    return filtered.map(e => ({
      id: e.id,
      from: e.from,
      subject: e.subject,
      read: e.read,
      timestamp: e.timestamp,
    }));
  }

  getUnreadCount(serverName) {
    return serverName
      ? this.inbox.filter(e => !e.read && (!e.server || e.server === serverName)).length
      : this.unreadCount;
  }

  toJSON() {
    return {
      inbox: this.inbox,
      complaintIndex: this.complaintIndex,
      nextId: this.nextId,
      clock: this.clock ? this.clock.toJSON() : null,
    };
  }

  fromJSON(data) {
    this.inbox = data.inbox || [];
    this.complaintIndex = data.complaintIndex || 0;
    this.nextId = data.nextId !== undefined ? data.nextId : this.inbox.length + 1;
    this.unreadCount = this.inbox.filter(e => !e.read).length;
    if (data.clock && this.clock) this.clock.fromJSON(data.clock);
  }
}
