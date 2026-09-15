import { setupVisualizationPage } from '../src/common/visualization-page.js';

function makeChrome(visits = {}, limits = {}) {
  global.chrome = {
    storage: {
      local: {
        data: { visits, limits, settings: {} },
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
    notifications: { create: jest.fn() },
  };
  global.chrome.action = { setBadgeText: async () => {}, setBadgeBackgroundColor: async () => {} };
}

describe('visualization-page setup', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div id="loading">Loading</div>
      <div id="main-view"></div>
      <div id="settings-view" hidden></div>
      <button id="settings-btn"></button>
      <button id="settings-back-btn"></button>
      <form id="limit-form">
        <input name="domain" />
        <input name="enabled" type="checkbox" />
        <input name="fiveHourEnabled" type="checkbox" />
        <input name="fiveHourLimit" value="10" />
        <input name="dailyEnabled" type="checkbox" />
        <input name="dailyLimit" value="20" />
      </form>
      <div id="limit-error"></div>
      <ul id="limit-list"></ul>
      <div id="limits-empty" hidden></div>
      <div id="settings-toast"></div>
      <button id="reset-data-btn">Reset</button>
      <div id="graph-container"></div>
      <div id="domain-list" hidden></div>
      <div id="empty-state" hidden></div>
      <div id="content" hidden></div>
      <div id="stats-title"></div>
      <div id="summary-content"></div>
      <input type="checkbox" id="comparison-toggle-input" />
      <button class="time-filter-btn" data-range="today"></button>
      <button class="time-filter-btn" data-range="week"></button>
      <button id="refresh-btn"></button>
      <div id="quick-limits-panel" hidden><ul id="quick-limits-list"></ul></div>
      <button id="export-json-btn"></button>
      <button id="export-csv-btn"></button>
    `;
    window.d3 = undefined;
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
    document.body.innerHTML = '';
    delete window.d3;
  });

  test('setupVisualizationPage renders without throwing (empty visits)', async () => {
    makeChrome({}, {});
    await expect(
      setupVisualizationPage({ defaultRange: 'today', fullPage: false }),
    ).resolves.toBeUndefined();
    // After setup, loading should be hidden
    const loading = document.getElementById('loading');
    expect(loading.style.display).toBe('none');
  });

  test('clears hidden on empty-state so Chromium [hidden] display:none !important does not win', async () => {
    makeChrome({}, {});
    await setupVisualizationPage({ defaultRange: 'today', fullPage: false });
    const emptyState = document.getElementById('empty-state');
    const content = document.getElementById('content');
    expect(emptyState.hidden).toBe(false);
    expect(emptyState.style.display).toBe('block');
    expect(content.hidden).toBe(true);
    expect(content.style.display).toBe('none');
  });

  test('setupVisualizationPage handles visits data', async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    makeChrome(
      { [todayKey]: { 'example.com': { count: 5, lastVisit: Date.now(), subpaths: {} } } },
      {},
    );
    await setupVisualizationPage({ defaultRange: 'today' });
    // Should have rendered content or empty-state correctly without throwing
    expect(document.getElementById('loading').style.display).toBe('none');
    const emptyState = document.getElementById('empty-state');
    const content = document.getElementById('content');
    expect(content.hidden).toBe(false);
    expect(content.style.display).toBe('block');
    expect(emptyState.hidden).toBe(true);
    expect(emptyState.style.display).toBe('none');
  });

  test('Escape closes settings and restores focus to the settings button', async () => {
    makeChrome({}, {});
    await setupVisualizationPage({ defaultRange: 'today', fullPage: false });
    const settingsBtn = document.getElementById('settings-btn');
    const settingsView = document.getElementById('settings-view');
    settingsBtn.click();
    await new Promise((resolve) => {
      setTimeout(resolve, 20);
    });
    expect(settingsView.hidden).toBe(false);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(settingsView.hidden).toBe(true);
    expect(document.activeElement).toBe(settingsBtn);
  });
});
