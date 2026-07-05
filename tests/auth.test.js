import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { createInstances } from './setup.js';

let AuthManager, auth;

beforeEach(() => {
  localStorage.clear();
  const instances = createInstances();
  AuthManager = instances.AuthManager;
  auth = instances.auth;
});

describe('AuthManager — register / login', () => {
  it('регистрация нового пользователя', () => {
    const result = auth.register('testuser', 'password123');
    expect(result.ok).toBe(true);
  });

  it('логин существующего', () => {
    auth.register('testuser', 'password123');
    auth.logout();
    const result = auth.login('testuser', 'password123');
    expect(result.ok).toBe(true);
  });

  it('неверный пароль → ошибка', () => {
    auth.register('testuser', 'password123');
    auth.logout();
    const result = auth.login('testuser', 'wrongpass');
    expect(result.ok).toBe(false);
    expect(result.error).toBe('Wrong password');
  });

  it('короткий пароль → ошибка', () => {
    const result = auth.register('testuser', 'ab');
    expect(result.ok).toBe(false);
    expect(result.error).toContain('short');
  });
});

describe('AuthManager — deleteUser', () => {
  it('удаление с правильным паролем', () => {
    auth.register('testuser', 'password123');
    const result = auth.deleteUser('testuser', 'password123');
    expect(result).toBe(true);
  });

  it('неверный пароль → false', () => {
    auth.register('testuser', 'password123');
    const result = auth.deleteUser('testuser', 'wrongpass');
    expect(result).toBe(false);
  });
});

describe('AuthManager — localStorage', () => {
  it('пользователи сохраняются в localStorage', () => {
    auth.register('testuser', 'password123');
    const raw = localStorage.getItem('cascade_users');
    expect(raw).toBeDefined();
    const users = JSON.parse(raw);
    expect(users['testuser']).toBeDefined();
  });
});
