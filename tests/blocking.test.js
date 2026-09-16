/**
 * Tests for src/dashboard/blocking.js
 */

import { createDefaultLimitConfig } from '../src/background/storage.js';

function makeChrome(visits = {}, limits = {}) {
  global.chrome = {
    storage: {
      local: {
        data: { visits, limits },
        get(keys, cb) {
          let res = {};
          if (keys === null) res = this.data;
          else if (Array.isArray(keys)) {
            res = {};
            keys.forEach((k) => {
              if (this.data[k] !== undefined) res[k] = this.data[k];
            });
          } else if (typeof keys === 'string') res = { [keys]: this.data[keys] };
          if (typeof cb === 'function') {
            cb(res);
            return;
          }
          return Promise.resolve(res);
        },
        set(items, cb) {
          Object.assign(this.data, items);
          if (typeof cb === 'function') cb();
          return Promise.resolve();
        },
        clear(cb) {
          this.data = {};
          if (typeof cb === 'function') cb();
          return Promise.resolve();
        },
      },
    },
    runtime: { getURL: (p) => `chrome-extension://id/${p}` },
    declarativeNetRequest: {
      updateDynamicRules: jest.fn(async () => {}),
      getDynamicRules: jest.fn(async () => []),
    },
  };
  global.chrome.action = { setBadgeText: async () => {}, setBadgeBackgroundColor: async () => {} };
}

describe('dashboard/blocking', () => {
  beforeEach(() => {
    jest.resetModules();
    document.body.innerHTML = `
      <div id="rules-list"></div>
      <div id="rules-empty"></div>
      <form id="limit-form">
        <input name="domain" id="domain-input" value="" />
        <label><input name="enabled" id="limit-enabled" type="checkbox" checked /> Enabled</label>
        <label><input name="fiveHourEnabled" id="five-hour-enabled" type="checkbox" checked /> 5h</label>
        <input name="fiveHourLimit" id="five-hour-limit" value="10" />
        <label><input name="dailyEnabled" id="daily-enabled" type="checkbox" checked /> Daily</label>
        <input name="dailyLimit" id="daily-limit" value="20" />
        <button type="submit">Save</button>
      </form>
      <div id="limit-error"></div>
    `;
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'log').mockImplementation(() => {});
    global.confirm = jest.fn(() => true);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    document.body.innerHTML = '';
  });

  test('renders empty state when no limits', async () => {
    makeChrome({}, {});
    await import('../src/dashboard/blocking.js');
    document.dispatchEvent(new Event('DOMContentLoaded'));
    await new Promise((r) => setTimeout(r, 50));
    const empty = document.getElementById('rules-empty');
    expect(empty.style.display).toBe('block');
  });

  test('renders list when limits exist', async () => {
    makeChrome({}, { 'example.com': createDefaultLimitConfig() });
    await import('../src/dashboard/blocking.js');
    document.dispatchEvent(new Event('DOMContentLoaded'));
    await new Promise((r) => setTimeout(r, 50));
    const list = document.getElementById('rules-list');
    expect(list.children.length).toBeGreaterThan(0);
    expect(list.textContent).toContain('example.com');
  });

  test('handles disabled limit badge', async () => {
    makeChrome({}, { 'example.com': createDefaultLimitConfig({ enabled: false }) });
    await import('../src/dashboard/blocking.js');
    document.dispatchEvent(new Event('DOMContentLoaded'));
    await new Promise((r) => setTimeout(r, 50));
    expect(document.getElementById('rules-list').textContent).toContain('Disabled');
  });

  test('shows inline error when host permission is denied while enabling a rule', async () => {
    makeChrome({}, { 'example.com': createDefaultLimitConfig({ enabled: false }) });
    global.chrome.permissions = { contains: async () => false, request: async () => false };
    await import('../src/dashboard/blocking.js');
    document.dispatchEvent(new Event('DOMContentLoaded'));
    await new Promise((r) => setTimeout(r, 50));
    const toggleBtn = document.querySelector('.toggle-btn');
    expect(toggleBtn).not.toBeNull();
    toggleBtn.click();
    await new Promise((r) => setTimeout(r, 50));
    expect(document.getElementById('limit-error').textContent).toBe(
      'Website access is required to enable blocking.',
    );
  });
});
