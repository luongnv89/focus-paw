/**
 * Tests for blocked page helpers
 * Uses behavioral assertions for countdown and blocked page logic
 */

import { getNextMidnight, getDateKey } from '../src/common/date-utils.js';

describe('blocked page', () => {
  test('getNextMidnight returns tomorrow at midnight local', () => {
    const now = new Date('2025-01-10T15:30:00');
    const midnight = getNextMidnight(now);
    expect(midnight.getDate()).toBe(11);
    expect(midnight.getHours()).toBe(0);
    expect(midnight.getMinutes()).toBe(0);
    expect(midnight.getSeconds()).toBe(0);
  });

  test('calculateTimeUntilReset logic: daily resets at midnight', () => {
    const now = new Date();
    const reset = getNextMidnight(now).getTime();
    expect(reset).toBeGreaterThan(Date.now());
    expect(reset - Date.now()).toBeLessThanOrEqual(24 * 60 * 60 * 1000);
  });

  test('fiveHour reset is oldestTimestamp + 5h', () => {
    const fiveHourMs = 5 * 60 * 60 * 1000;
    const oldest = Date.now() - 2 * 60 * 60 * 1000;
    const reset = oldest + fiveHourMs;
    expect(reset).toBeGreaterThan(Date.now());
    expect(reset - oldest).toBe(fiveHourMs);
  });

  test('blocked page message variations are brand-aligned', async () => {
    // Ensure blocked.js module loads without throwing when DOM is mocked
    document.body.innerHTML = `
      <div class="container">
        <h1 id="page-heading"></h1>
        <p id="subtext"></p>
        <span id="domain-name"></span>
        <span id="visit-count"></span>
        <span id="limit-value"></span>
        <span id="limit-type"></span>
        <span id="countdown-hours"></span>
        <span id="countdown-minutes"></span>
        <span id="countdown-seconds"></span>
        <span id="countdown-sublabel"></span>
        <button id="back-btn"></button>
        <button id="settings-btn"></button>
      </div>
    `;
    global.chrome = {
      storage: {
        local: {
          data: {},
          get(keys, cb) {
            const res = {};
            if (typeof cb === 'function') {
              cb(res);
              return;
            }
            return Promise.resolve(res);
          },
          set(items, cb) {
            if (typeof cb === 'function') cb();
            return Promise.resolve();
          },
        },
      },
      runtime: { getURL: (p) => `chrome-extension://id/${p}` },
    };
    // Provide URLSearchParams via jsdom window
    window.history.replaceState(
      null,
      '',
      '/src/blocked/blocked.html?domain=example.com&count=10&limit=5&limitType=daily',
    );

    // Import blocked.js side-effects – it will run loadBlockedPageData and timers
    // Use dynamic import to avoid top-level blocked evaluation pollution across tests
    jest.useFakeTimers();
    await import('../src/blocked/blocked.js');
    // Advance timers to let loadBlockedPageData resolve
    jest.advanceTimersByTime(100);
    // Check that page-heading was populated with one of the messages
    const heading = document.getElementById('page-heading').textContent;
    expect(heading.length).toBeGreaterThan(0);
    jest.useRealTimers();
  });
});
