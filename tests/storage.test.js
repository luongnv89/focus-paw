/**
 * Tests for storage module
 * Tests focus tracking, aggregation, and badge calculation logic
 */

import {
  getTodayKey,
  getDateKey,
  incrementVisit,
  getAggregatedStats,
  calculateFocusHeroBadges,
  createDefaultLimitConfig,
  deleteDomainData,
  getAllData,
  getVisits,
  getLimits,
  getLimitForDomain,
  setLimitForDomain,
  normalizeLimitConfig,
  getSettings,
  updateSettings,
  clearAllData,
  getVisitsInRange,
  pruneGeoCacheEntries,
  putGeoLookupEntries,
  getGeoLookupCache,
  clearGeoLookupCache,
  resetGeoCacheQueueForTests,
  GEO_CACHE_TTL_MS,
} from '../src/background/storage.js';

// Mock chrome.storage.local
global.chrome = {
  runtime: { lastError: undefined },
  storage: {
    local: {
      data: {},
      get(keys, callback) {
        if (keys === null || keys === undefined) {
          callback(this.data);
        } else if (Array.isArray(keys)) {
          const result = {};
          keys.forEach((key) => {
            if (this.data[key] !== undefined) {
              result[key] = this.data[key];
            }
          });
          callback(result);
        } else {
          callback({ [keys]: this.data[keys] });
        }
      },
      set(items, callback) {
        Object.assign(this.data, items);
        if (callback) callback();
      },
      remove(keys, callback) {
        const list = Array.isArray(keys) ? keys : [keys];
        list.forEach((key) => {
          delete this.data[key];
        });
        if (callback) callback();
      },
      clear(callback) {
        this.data = {};
        if (callback) callback();
      },
    },
  },
};

describe('Storage Module', () => {
  beforeEach(() => {
    // Clear storage before each test
    chrome.storage.local.data = {};
    if (chrome.runtime) chrome.runtime.lastError = undefined;
    resetGeoCacheQueueForTests();
  });

  describe('getTodayKey', () => {
    test('returns date in YYYY-MM-DD format', () => {
      const dateKey = getTodayKey();
      expect(dateKey).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    test("returns today's date", () => {
      expect(getTodayKey()).toMatch(/\d{4}-\d{2}-\d{2}/);
    });
  });

  describe('incrementVisit', () => {
    test('creates new visit entry for domain', async () => {
      const count = await incrementVisit('example.com');
      expect(count).toBe(1);

      const visits = chrome.storage.local.data.visits;
      const todayKey = getTodayKey();
      expect(visits[todayKey]['example.com'].count).toBe(1);
    });

    test('increments existing domain count', async () => {
      await incrementVisit('example.com');
      await incrementVisit('example.com');
      const count = await incrementVisit('example.com');

      expect(count).toBe(3);
    });

    test('tracks subpath visits separately', async () => {
      await incrementVisit('reddit.com', '/r/programming');
      await incrementVisit('reddit.com', '/r/programming');
      await incrementVisit('reddit.com', '/r/javascript');

      const visits = chrome.storage.local.data.visits;
      const todayKey = getTodayKey();
      const redditData = visits[todayKey]['reddit.com'];

      expect(redditData.count).toBe(3);
      expect(redditData.subpaths['/r/programming'].count).toBe(2);
      expect(redditData.subpaths['/r/javascript'].count).toBe(1);
    });

    test('stores lastVisit timestamp', async () => {
      const before = Date.now();
      await incrementVisit('example.com');
      const after = Date.now();

      const visits = chrome.storage.local.data.visits;
      const todayKey = getTodayKey();
      const lastVisit = visits[todayKey]['example.com'].lastVisit;

      expect(lastVisit).toBeGreaterThanOrEqual(before);
      expect(lastVisit).toBeLessThanOrEqual(after);
    });
  });

  describe('getAggregatedStats', () => {
    beforeEach(async () => {
      // Set up test data for multiple days
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const twoDaysAgo = new Date(today);
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

      const todayKey = getDateKey(today);
      const yesterdayKey = getDateKey(yesterday);
      const twoDaysAgoKey = getDateKey(twoDaysAgo);

      chrome.storage.local.data.visits = {
        [todayKey]: {
          'example.com': { count: 5, lastVisit: Date.now(), subpaths: {} },
          'twitter.com': { count: 10, lastVisit: Date.now(), subpaths: {} },
        },
        [yesterdayKey]: {
          'example.com': { count: 3, lastVisit: Date.now() - 86400000, subpaths: {} },
          'facebook.com': { count: 7, lastVisit: Date.now() - 86400000, subpaths: {} },
        },
        [twoDaysAgoKey]: {
          'example.com': { count: 2, lastVisit: Date.now() - 172800000, subpaths: {} },
        },
      };
    });

    test("aggregates today's visits", async () => {
      const stats = await getAggregatedStats('today');
      expect(stats['example.com'].count).toBe(5);
      expect(stats['twitter.com'].count).toBe(10);
      expect(stats['facebook.com']).toBeUndefined();
    });

    test("aggregates week's visits", async () => {
      const stats = await getAggregatedStats('week');
      expect(stats['example.com'].count).toBe(10); // 5 + 3 + 2
      expect(stats['twitter.com'].count).toBe(10);
      expect(stats['facebook.com'].count).toBe(7);
    });

    test('handles empty visits gracefully', async () => {
      chrome.storage.local.data.visits = {};
      const stats = await getAggregatedStats('today');
      expect(Object.keys(stats).length).toBe(0);
    });

    test('aggregates subpaths correctly', async () => {
      const todayKey = getTodayKey();
      chrome.storage.local.data.visits = {
        [todayKey]: {
          'reddit.com': {
            count: 5,
            lastVisit: Date.now(),
            subpaths: {
              '/r/programming': { count: 3, lastVisit: Date.now() },
              '/r/javascript': { count: 2, lastVisit: Date.now() },
            },
          },
        },
      };

      const stats = await getAggregatedStats('today');
      expect(stats['reddit.com'].subpaths['/r/programming'].count).toBe(3);
      expect(stats['reddit.com'].subpaths['/r/javascript'].count).toBe(2);
    });
  });

  describe('calculateFocusHeroBadges', () => {
    beforeEach(() => {
      // Set up test data with limits
      const buildDailyLimit = (limit) =>
        createDefaultLimitConfig({
          fiveHour: { enabled: false, limit: 10 },
          daily: { enabled: true, limit },
        });

      chrome.storage.local.data.limits = {
        'example.com': buildDailyLimit(10),
        'twitter.com': buildDailyLimit(5),
      };
    });

    test('awards badge for 3+ consecutive days under limit', async () => {
      const today = new Date();
      const visits = {};

      // Create 3 days of data under limit (function checks 7 days, missing days count as 0)
      for (let i = 0; i < 3; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateKey = getDateKey(date);
        visits[dateKey] = {
          'example.com': { count: 8, lastVisit: Date.now(), subpaths: {} }, // Under limit of 10
        };
      }

      chrome.storage.local.data.visits = visits;

      const badges = await calculateFocusHeroBadges();
      expect(badges['example.com']).toBeDefined();
      expect(badges['example.com'].earned).toBe(true);
      // Function checks 7 days, missing days count as 0 (under limit), so streak is 7
      expect(badges['example.com'].streak).toBe(7);
    });

    test('still awards badge when some days have no data (treated as 0 visits)', async () => {
      const today = new Date();
      const visits = {};

      // Create only 2 days of data under limit, other 5 days missing (counted as 0)
      for (let i = 0; i < 2; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateKey = getDateKey(date);
        visits[dateKey] = {
          'example.com': { count: 8, lastVisit: Date.now(), subpaths: {} },
        };
      }

      chrome.storage.local.data.visits = visits;

      const badges = await calculateFocusHeroBadges();
      // Missing days count as 0 visits (under limit), so 7 consecutive days under limit
      expect(badges['example.com']).toBeDefined();
      expect(badges['example.com'].streak).toBe(7);
    });

    test('breaks streak when limit is exceeded', async () => {
      const today = new Date();
      const visits = {};

      for (let i = 0; i < 5; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateKey = getDateKey(date);
        const count = i === 2 ? 15 : 8; // Exceed limit on day 2
        visits[dateKey] = {
          'example.com': { count, lastVisit: Date.now(), subpaths: {} },
        };
      }

      chrome.storage.local.data.visits = visits;

      const badges = await calculateFocusHeroBadges();
      // Should only count days 0 and 1 (2 days), not enough for badge
      expect(badges['example.com']).toBeUndefined();
    });

    test('calculates correct streak length', async () => {
      const today = new Date();
      const visits = {};

      // Create 5 days of data under limit (+ 2 missing days = 7 total)
      for (let i = 0; i < 5; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateKey = getDateKey(date);
        visits[dateKey] = {
          'twitter.com': { count: 4, lastVisit: Date.now(), subpaths: {} }, // Under limit of 5
        };
      }

      chrome.storage.local.data.visits = visits;

      const badges = await calculateFocusHeroBadges();
      // 5 days with data + 2 missing days (counted as 0) = 7 days streak
      expect(badges['twitter.com'].streak).toBe(7);
    });

    test('handles missing visit data gracefully', async () => {
      chrome.storage.local.data.visits = {};

      const badges = await calculateFocusHeroBadges();
      // Should still award badge if no visits (under limit by default)
      expect(badges['example.com']).toBeDefined();
      expect(badges['twitter.com']).toBeDefined();
    });

    test('only checks domains with limits', async () => {
      const todayKey = getTodayKey();
      chrome.storage.local.data.visits = {
        [todayKey]: {
          'no-limit-site.com': { count: 100, lastVisit: Date.now(), subpaths: {} },
        },
      };

      const badges = await calculateFocusHeroBadges();
      expect(badges['no-limit-site.com']).toBeUndefined();
    });
  });

  describe('deleteDomainData', () => {
    test('removes visits and limits for the specified domain', async () => {
      const today = getTodayKey();
      const yesterdayDate = new Date();
      yesterdayDate.setDate(yesterdayDate.getDate() - 1);
      const yesterday = getDateKey(yesterdayDate);

      chrome.storage.local.data = {
        visits: {
          [today]: {
            'example.com': { count: 5, lastVisit: Date.now(), subpaths: {} },
            'other.com': { count: 2, lastVisit: Date.now(), subpaths: {} },
          },
          [yesterday]: {
            'example.com': { count: 3, lastVisit: Date.now() - 86400000, subpaths: {} },
          },
        },
        limits: {
          'example.com': createDefaultLimitConfig(),
          'other.com': createDefaultLimitConfig({ daily: { enabled: true, limit: 5 } }),
        },
      };

      await deleteDomainData('example.com');

      expect(chrome.storage.local.data.limits['example.com']).toBeUndefined();
      expect(chrome.storage.local.data.limits['other.com']).toBeDefined();
      expect(chrome.storage.local.data.visits[today]['example.com']).toBeUndefined();
      expect(chrome.storage.local.data.visits[today]['other.com']).toBeDefined();
      expect(chrome.storage.local.data.visits[yesterday]).toBeUndefined();
    });
  });

  describe('getAllData', () => {
    test('returns all storage data', async () => {
      chrome.storage.local.data = {
        visits: { '2025-11-17': { 'example.com': { count: 5 } } },
        limits: { 'example.com': createDefaultLimitConfig() },
        settings: { highContrastMode: true },
      };

      const data = await getAllData();

      expect(data.visits).toBeDefined();
      expect(data.limits).toBeDefined();
      expect(data.settings).toBeDefined();
    });

    test('returns empty object when storage is empty', async () => {
      const data = await getAllData();
      expect(data).toEqual({});
    });
  });

  describe('getVisits', () => {
    test('returns visits object', async () => {
      const todayKey = getTodayKey();
      chrome.storage.local.data.visits = {
        [todayKey]: {
          'example.com': { count: 5, lastVisit: Date.now(), subpaths: {} },
        },
      };

      const visits = await getVisits();
      expect(visits[todayKey]).toBeDefined();
      expect(visits[todayKey]['example.com'].count).toBe(5);
    });

    test('returns empty object when no visits', async () => {
      const visits = await getVisits();
      expect(visits).toEqual({});
    });
  });

  describe('getLimits', () => {
    test('returns limits object', async () => {
      chrome.storage.local.data.limits = {
        'example.com': createDefaultLimitConfig(),
        'twitter.com': createDefaultLimitConfig({ daily: { enabled: true, limit: 5 } }),
      };

      const limits = await getLimits();
      expect(limits['example.com']).toBeDefined();
      expect(limits['twitter.com']).toBeDefined();
      expect(limits['twitter.com'].daily.limit).toBe(5);
    });

    test('returns empty object when no limits', async () => {
      const limits = await getLimits();
      expect(limits).toEqual({});
    });
  });

  describe('getLimitForDomain', () => {
    test('returns limit config for domain', async () => {
      const config = createDefaultLimitConfig({ daily: { enabled: true, limit: 10 } });
      chrome.storage.local.data.limits = {
        'example.com': config,
      };

      const limit = await getLimitForDomain('example.com');
      expect(limit).toEqual(config);
      expect(limit.daily.limit).toBe(10);
    });

    test('returns null for domain without limit', async () => {
      chrome.storage.local.data.limits = {};
      const limit = await getLimitForDomain('example.com');
      expect(limit).toBeNull();
    });
  });

  describe('setLimitForDomain', () => {
    test('sets limit for domain', async () => {
      await setLimitForDomain('example.com', {
        enabled: true,
        daily: { enabled: true, limit: 15 },
      });

      const limits = chrome.storage.local.data.limits;
      expect(limits['example.com']).toBeDefined();
      expect(limits['example.com'].daily.limit).toBe(15);
    });

    test('updates existing limit', async () => {
      chrome.storage.local.data.limits = {
        'example.com': createDefaultLimitConfig({ daily: { enabled: true, limit: 10 } }),
      };

      await setLimitForDomain('example.com', {
        enabled: true,
        daily: { enabled: true, limit: 20 },
      });

      expect(chrome.storage.local.data.limits['example.com'].daily.limit).toBe(20);
    });

    test('removes limit when set to null', async () => {
      chrome.storage.local.data.limits = {
        'example.com': createDefaultLimitConfig(),
      };

      await setLimitForDomain('example.com', null);

      expect(chrome.storage.local.data.limits['example.com']).toBeUndefined();
    });

    test('normalizes partial config with defaults', async () => {
      await setLimitForDomain('example.com', {
        daily: { enabled: true, limit: 5 },
      });

      const config = chrome.storage.local.data.limits['example.com'];
      expect(config.enabled).toBe(true);
      expect(config.fiveHour.enabled).toBe(true);
      expect(config.fiveHour.limit).toBe(10);
    });
  });

  describe('normalizeLimitConfig', () => {
    test('returns config as-is if already normalized', () => {
      const config = createDefaultLimitConfig({ daily: { enabled: true, limit: 15 } });
      const normalized = normalizeLimitConfig(config);
      expect(normalized).toEqual(config);
    });

    test('converts legacy number format to new format', () => {
      const normalized = normalizeLimitConfig(10);
      expect(normalized.enabled).toBe(true);
      expect(normalized.daily.enabled).toBe(true);
      expect(normalized.daily.limit).toBe(10);
    });

    test('returns default config for invalid input', () => {
      const normalized = normalizeLimitConfig(null);
      expect(normalized.enabled).toBe(true);
      expect(normalized.daily.limit).toBe(20);
    });

    test('converts legacy number to normalized config', () => {
      const normalized = normalizeLimitConfig(25);
      expect(normalized.daily.limit).toBe(25);
      expect(normalized.fiveHour.enabled).toBe(true);
    });
  });

  describe('getSettings', () => {
    test('returns settings object', async () => {
      chrome.storage.local.data.settings = {
        onboardingComplete: true,
      };

      const settings = await getSettings();
      expect(settings.onboardingComplete).toBe(true);
    });

    test('returns default settings when none exist', async () => {
      const settings = await getSettings();
      expect(settings.onboardingComplete).toBe(false);
      expect(settings.geoLookupEnabled).toBe(false);
    });

    test('migrates legacy colorBlindMode to highContrastMode once', async () => {
      chrome.storage.local.data.colorBlindMode = true;
      const settings = await getSettings();
      expect(settings.highContrastMode).toBe(true);
      expect(chrome.storage.local.data.settings.highContrastMode).toBe(true);
      expect(chrome.storage.local.data.colorBlindMode).toBeUndefined();
    });

    test('does not override an explicit highContrastMode from colorBlindMode', async () => {
      chrome.storage.local.data.settings = { highContrastMode: false };
      chrome.storage.local.data.colorBlindMode = true;
      const settings = await getSettings();
      expect(settings.highContrastMode).toBe(false);
      expect(chrome.storage.local.data.colorBlindMode).toBe(true);
    });
  });

  describe('updateSettings', () => {
    test('updates settings', async () => {
      await updateSettings({ highContrastMode: true });

      expect(chrome.storage.local.data.settings.highContrastMode).toBe(true);
    });

    test('merges with existing settings', async () => {
      chrome.storage.local.data.settings = {
        highContrastMode: false,
        onboardingComplete: true,
      };

      await updateSettings({ highContrastMode: true });

      expect(chrome.storage.local.data.settings.highContrastMode).toBe(true);
      expect(chrome.storage.local.data.settings.onboardingComplete).toBe(true);
    });

    test('updates multiple settings at once', async () => {
      await updateSettings({
        highContrastMode: true,
        onboardingComplete: true,
      });

      expect(chrome.storage.local.data.settings.highContrastMode).toBe(true);
      expect(chrome.storage.local.data.settings.onboardingComplete).toBe(true);
    });
  });

  describe('clearAllData', () => {
    test('clears all storage data', async () => {
      chrome.storage.local.data = {
        visits: { '2025-11-17': { 'example.com': { count: 5 } } },
        limits: { 'example.com': createDefaultLimitConfig() },
        settings: { highContrastMode: true },
      };

      await clearAllData();

      expect(chrome.storage.local.data).toEqual({});
    });

    test('works when storage is already empty', async () => {
      await clearAllData();
      expect(chrome.storage.local.data).toEqual({});
    });
  });

  describe('getVisitsInRange', () => {
    test('returns visits within date range', async () => {
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const twoDaysAgo = new Date(today);
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
      const threeDaysAgo = new Date(today);
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

      const todayKey = getDateKey(today);
      const yesterdayKey = getDateKey(yesterday);
      const twoDaysAgoKey = getDateKey(twoDaysAgo);
      const threeDaysAgoKey = getDateKey(threeDaysAgo);

      chrome.storage.local.data.visits = {
        [todayKey]: { 'example.com': { count: 5 } },
        [yesterdayKey]: { 'example.com': { count: 3 } },
        [twoDaysAgoKey]: { 'example.com': { count: 2 } },
        [threeDaysAgoKey]: { 'example.com': { count: 1 } },
      };

      const visits = await getVisitsInRange(yesterday, today);

      expect(visits[todayKey]).toBeDefined();
      expect(visits[yesterdayKey]).toBeDefined();
      expect(visits[twoDaysAgoKey]).toBeUndefined();
      expect(visits[threeDaysAgoKey]).toBeUndefined();
    });

    test('returns empty object when no visits in range', async () => {
      const futureStart = new Date('2099-01-01');
      const futureEnd = new Date('2099-01-31');

      chrome.storage.local.data.visits = {
        '2025-11-17': { 'example.com': { count: 5 } },
      };

      const visits = await getVisitsInRange(futureStart, futureEnd);
      expect(Object.keys(visits).length).toBe(0);
    });

    test('handles single day range', async () => {
      const today = new Date();
      const todayKey = getDateKey(today);

      chrome.storage.local.data.visits = {
        [todayKey]: { 'example.com': { count: 5 } },
      };

      const visits = await getVisitsInRange(today, today);
      expect(visits[todayKey]).toBeDefined();
    });
  });

  describe('geo lookup cache', () => {
    test('put/get/clear round-trip', async () => {
      await putGeoLookupEntries({
        'news.example': { lat: 40.7, lon: -74, fetchedAt: Date.now(), ok: true },
      });
      const cache = await getGeoLookupCache();
      expect(cache['news.example'].lat).toBe(40.7);
      await clearGeoLookupCache();
      expect(await getGeoLookupCache()).toEqual({});
    });

    test('pruneGeoCacheEntries removes expired coordinates', () => {
      const now = Date.now();
      const pruned = pruneGeoCacheEntries(
        {
          'keep.com': { lat: 1, lon: 1, fetchedAt: now, ok: true },
          'drop.com': { lat: 2, lon: 2, fetchedAt: now - GEO_CACHE_TTL_MS - 1000, ok: true },
        },
        now,
      );
      expect(pruned['keep.com']).toBeDefined();
      expect(pruned['drop.com']).toBeUndefined();
    });
  });
});
