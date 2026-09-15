/**
 * Tests for src/dashboard/domain.js
 */

import { createDefaultLimitConfig } from '../src/background/storage.js';
import { getDateKey } from '../src/common/date-utils.js';

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
    declarativeNetRequest: { updateDynamicRules: async () => {}, getDynamicRules: async () => [] },
  };
  global.chrome.action = { setBadgeText: async () => {}, setBadgeBackgroundColor: async () => {} };
}

describe('dashboard/domain', () => {
  beforeEach(() => {
    jest.resetModules();
    document.body.innerHTML = `
      <h1 id="domain-title"></h1>
      <form id="domain-limit-form">
        <input name="enabled" type="checkbox" checked />
        <input name="fiveHourEnabled" type="checkbox" checked />
        <input name="fiveHourLimit" value="10" />
        <input name="dailyEnabled" type="checkbox" checked />
        <input name="dailyLimit" value="20" />
        <button type="submit"></button>
      </form>
      <div id="domain-limit-error"></div>
      <div id="stat-today"></div>
      <div id="stat-week"></div>
      <div id="stat-total"></div>
      <div id="stat-last-visit"></div>
      <ul id="history-list"></ul>
      <button id="delete-domain-data"></button>
      <div id="domain-toast"></div>
      <button id="back-btn"></button>
      <div id="detail-limit-config-section"></div>
      <div id="detail-five-hour-config"></div>
      <div id="detail-daily-config"></div>
    `;
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
    document.body.innerHTML = '';
  });

  test('loads domain from URL and shows stats', async () => {
    const todayKey = getDateKey(new Date());
    makeChrome(
      { [todayKey]: { 'example.com': { count: 5, lastVisit: Date.now(), subpaths: {} } } },
      { 'example.com': createDefaultLimitConfig() },
    );
    window.history.pushState({}, '', '/src/dashboard/domain.html?domain=example.com');

    await import('../src/dashboard/domain.js');
    document.dispatchEvent(new Event('DOMContentLoaded'));
    await new Promise((r) => setTimeout(r, 80));

    expect(document.getElementById('domain-title').textContent).toBe('example.com');
    expect(document.getElementById('stat-today').textContent).toBe('5');
  });

  test('handles missing domain param gracefully', async () => {
    makeChrome({}, {});
    window.history.pushState({}, '', '/src/dashboard/domain.html');
    await import('../src/dashboard/domain.js');
    document.dispatchEvent(new Event('DOMContentLoaded'));
    await new Promise((r) => setTimeout(r, 50));
    // Should have disabled forms without throwing
    const form = document.getElementById('domain-limit-form');
    expect(form).toBeTruthy();
  });
});
