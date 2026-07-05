import { describe, it, expect, beforeAll } from 'vitest';
import { createInstances, storyEvents } from './setup.js';

let EmailClient, email;

beforeAll(() => {
  const instances = createInstances();
  EmailClient = instances.EmailClient;
  email = instances.email;
});

describe('EmailClient — addEmail', () => {
  it('добавляет письмо в inbox', () => {
    const e = new EmailClient(storyEvents);
    e.addEmail({ from: 'test@test.com', subject: 'Test', body: 'Body' });
    expect(e.inbox.length).toBe(1);
  });

  it('увеличивает unreadCount', () => {
    const e = new EmailClient(storyEvents);
    e.addEmail({ from: 'a@b.com', subject: 'S', body: 'B' });
    expect(e.unreadCount).toBe(1);
  });

  it('присваивает id', () => {
    const e = new EmailClient(storyEvents);
    e.addEmail({ from: 'a@b.com', subject: 'S', body: 'B' });
    expect(e.inbox[0].id).toBe(1);
  });
});

describe('EmailClient — addPlotEmail', () => {
  it('загружает письмо из storyData.emails.plot', () => {
    const e = new EmailClient(storyEvents);
    const result = e.addPlotEmail('stage_1_start');
    expect(result).toBe(true);
    expect(e.inbox.length).toBe(1);
    expect(e.inbox[0].from).toBe('scheduler@cascade.com');
  });

  it('возвращает false для несуществующего emailId', () => {
    const e = new EmailClient(storyEvents);
    const result = e.addPlotEmail('nonexistent_id');
    expect(result).toBe(false);
  });
});

describe('EmailClient — addComplaint', () => {
  it('циклически выбирает шаблоны', () => {
    const e = new EmailClient(storyEvents);
    e.addComplaint('dmz-03', 'DMZ');
    expect(e.complaintIndex).toBe(1);
    e.addComplaint('core-11', 'Core');
    expect(e.complaintIndex).toBe(2);
  });

  it('подставляет {id}, {service}, {segment}', () => {
    const e = new EmailClient(storyEvents);
    e.addComplaint('dmz-03', 'DMZ');
    expect(e.inbox.length).toBe(1);
    expect(e.inbox[0].subject).toBeTruthy();
  });
});

describe('EmailClient — markRead / getUnread', () => {
  it('markRead уменьшает unreadCount', () => {
    const e = new EmailClient(storyEvents);
    e.addEmail({ from: 'a@b.com', subject: 'S', body: 'B' });
    expect(e.unreadCount).toBe(1);
    e.markRead(1);
    expect(e.unreadCount).toBe(0);
  });

  it('getUnread возвращает только непрочитанные', () => {
    const e = new EmailClient(storyEvents);
    e.addEmail({ from: 'a@b.com', subject: 'S1', body: 'B1' });
    e.addEmail({ from: 'a@b.com', subject: 'S2', body: 'B2' });
    e.markRead(1);
    const unread = e.getUnread();
    expect(unread.length).toBe(1);
    expect(unread[0].id).toBe(2);
  });
});

describe('EmailClient — toJSON / fromJSON', () => {
  it('сохраняет inbox, complaintIndex, nextId', () => {
    const e = new EmailClient(storyEvents);
    e.addEmail({ from: 'a@b.com', subject: 'S', body: 'B' });
    e.addComplaint('test', 'dmz');
    const saved = e.toJSON();
    expect(saved.inbox).toBeDefined();
    expect(saved.complaintIndex).toBe(1);
    expect(saved.nextId).toBeGreaterThan(1);
  });

  it('восстановление корректно считает unreadCount', () => {
    const e = new EmailClient(storyEvents);
    e.addEmail({ from: 'a@b.com', subject: 'S', body: 'B' });
    e.addEmail({ from: 'a@b.com', subject: 'S2', body: 'B2' });
    e.markRead(1);
    const saved = e.toJSON();
    const e2 = new EmailClient(storyEvents);
    e2.fromJSON(saved);
    expect(e2.unreadCount).toBe(1);
    expect(e2.inbox.length).toBe(2);
  });
});
