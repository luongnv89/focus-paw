/**
 * Tests for limits module
 * Tests limit checking and blocking logic
 */

import { checkLimit, getBlockedPageUrl, updateBlockingRules } from '../src/background/limits.js';
import { createDefaultLimitConfig } from '../src/background/storage.js';
import { getTodayKey, getDateKey } from '../src/common/date-utils.js';

// Mock chrome APIs
global.chrome = {
  storage: {
    local: {
      data: {},
      get(keys, callback) {
        let result;
        if (keys === null || keys === undefined) {
          result = this.data;
        } else if (Array.isArray(keys)) {
          result = {};
          keys.forEach((key) => {
            if (this.data[key] !== undefined) {
              result[key] = this.data[key];
            }
          });
        } else {
          result = { [keys]: this.data[keys] };
        }
        if (callback) callback(result);
        return Promise.resolve(result);
      },
      set(items, callback) {
        Object.assign(this.data, items);
        if (callback) callback();
        return Promise.resolve();
      },
    },
  },
  notifications: {
    create(id, options, callback) {
      if (callback) callback(id);
    },
  },
  declarativeNetRequest: {
    dynamicRules: [],
    async updateDynamicRules(options) {
      // Remove old rules first
      if (options.removeRuleIds && options.removeRuleIds.length > 0) {
        this.dynamicRules = this.dynamicRules.filter(
          (rule) => !options.removeRuleIds.includes(rule.id),
        );
      }
      // Then add new rules
      if (options.addRules && options.addRules.length > 0) {
        this.dynamicRules.push(...options.addRules);
      }
      return Promise.resolve();
    },
    async getDynamicRules() {
      return [...this.dynamicRules];
    },
  },
  permissions: {
    contains: async () => true,
  },
  runtime: {
    getURL(path) {
      return `chrome-extension://test-extension-id/${path}`;
    },
    id: 'test-extension-id',
  },
};

const todayKey = getTodayKey;

const buildDailyLimit = (limit = 10) =>
  createDefaultLimitConfig({
    fiveHour: { enabled: false, limit: 10 },
    daily: { enabled: true, limit },
  });

describe('Limits Module', () => {
  beforeEach(() => {
    chrome.storage.local.data = {};
  });

  describe('checkLimit', () => {
    test('returns exceeded=false when no limit is set', async () => {
      chrome.storage.local.data = {
        visits: {
          [todayKey()]: {
            'example.com': { count: 100, lastVisit: Date.now(), subpaths: {} },
          },
        },
        limits: {},
      };

      const result = await checkLimit('example.com');
      expect(result.exceeded).toBe(false);
      expect(result.count).toBe(100);
      expect(result.limit).toBe(null);
      expect(result.limitType).toBe(null);
    });

    test('matches a legacy www-prefixed limit to canonical visit data', async () => {
      chrome.storage.local.data = {
        visits: {
          [todayKey()]: {
            'x.com': { count: 3, lastVisit: Date.now(), subpaths: {}, timestamps: [] },
          },
        },
        limits: {
          'www.x.com': buildDailyLimit(3),
        },
      };

      const result = await checkLimit('x.com');
      expect(result.exceeded).toBe(true);
      expect(result.count).toBe(3);
    });

    test('returns countdown info when under daily limit', async () => {
      chrome.storage.local.data = {
        visits: {
          [todayKey()]: {
            'example.com': {
              count: 5,
              lastVisit: Date.now(),
              subpaths: {},
              timestamps: [Date.now() - 60 * 60 * 1000],
            },
          },
        },
        limits: {
          'example.com': buildDailyLimit(10),
        },
      };

      const result = await checkLimit('example.com');
      expect(result.exceeded).toBe(false);
      expect(result.count).toBe(5);
      expect(result.limit).toBe(10);
      expect(result.limitType).toBe('daily');
    });

    test('returns exceeded=true when daily limit is exceeded', async () => {
      chrome.storage.local.data = {
        visits: {
          [todayKey()]: {
            'example.com': { count: 15, lastVisit: Date.now(), subpaths: {} },
          },
        },
        limits: {
          'example.com': buildDailyLimit(10),
        },
      };

      const result = await checkLimit('example.com');
      expect(result.exceeded).toBe(true);
      expect(result.count).toBe(15);
      expect(result.limit).toBe(10);
      expect(result.limitType).toBe('daily');
    });

    test('returns exceeded=true when at exact daily limit', async () => {
      chrome.storage.local.data = {
        visits: {
          [todayKey()]: {
            'example.com': { count: 10, lastVisit: Date.now(), subpaths: {} },
          },
        },
        limits: {
          'example.com': buildDailyLimit(10),
        },
      };

      const result = await checkLimit('example.com');
      expect(result.exceeded).toBe(true);
      expect(result.count).toBe(10);
      expect(result.limit).toBe(10);
      expect(result.limitType).toBe('daily');
    });

    test('handles missing visit data', async () => {
      chrome.storage.local.data = {
        visits: {},
        limits: {
          'example.com': buildDailyLimit(12),
        },
      };

      const result = await checkLimit('example.com');
      expect(result.exceeded).toBe(false);
      expect(result.count).toBe(0);
      expect(result.limit).toBe(12);
      expect(result.limitType).toBe('daily');
    });

    test('handles domain not visited today', async () => {
      const yesterdayDate = new Date();
      yesterdayDate.setDate(yesterdayDate.getDate() - 1);
      const yesterdayKey = getDateKey(yesterdayDate);
      chrome.storage.local.data = {
        visits: {
          [yesterdayKey]: {
            'example.com': { count: 20, lastVisit: Date.now(), subpaths: {} },
          },
        },
        limits: {
          'example.com': buildDailyLimit(10),
        },
      };

      const result = await checkLimit('example.com');
      expect(result.exceeded).toBe(false);
      expect(result.count).toBe(0);
      expect(result.limit).toBe(10);
      expect(result.limitType).toBe('daily');
    });

    test('detects five-hour limit breaches before daily limit', async () => {
      const now = Date.now();
      chrome.storage.local.data = {
        visits: {
          [todayKey()]: {
            'example.com': {
              count: 50,
              lastVisit: now,
              subpaths: {},
              timestamps: [now - 60 * 60 * 1000, now - 30 * 60 * 1000],
            },
          },
        },
        limits: {
          'example.com': createDefaultLimitConfig({
            fiveHour: { enabled: true, limit: 2 },
            daily: { enabled: true, limit: 100 },
          }),
        },
      };

      const result = await checkLimit('example.com');
      expect(result.exceeded).toBe(true);
      expect(result.limitType).toBe('fiveHour');
      expect(result.limit).toBe(2);
      expect(result.count).toBe(2);
      expect(result.oldestTimestamp).toBe(now - 60 * 60 * 1000);
    });

    test('returns countdown info for five-hour limit when under threshold', async () => {
      const now = Date.now();
      chrome.storage.local.data = {
        visits: {
          [todayKey()]: {
            'example.com': {
              count: 3,
              lastVisit: now,
              subpaths: {},
              timestamps: [
                now - 30 * 60 * 1000,
                now - 4 * 60 * 60 * 1000,
                now - 7 * 60 * 60 * 1000,
              ],
            },
          },
        },
        limits: {
          'example.com': createDefaultLimitConfig({
            fiveHour: { enabled: true, limit: 5 },
            daily: { enabled: false, limit: 20 },
          }),
        },
      };

      const result = await checkLimit('example.com');
      expect(result.exceeded).toBe(false);
      expect(result.limitType).toBe('fiveHour');
      expect(result.limit).toBe(5);
      expect(result.count).toBe(2); // Only timestamps inside last 5 hours
    });

    test('supports legacy numeric limits', async () => {
      chrome.storage.local.data = {
        visits: {
          [todayKey()]: {
            'example.com': { count: 4, lastVisit: Date.now(), subpaths: {} },
          },
        },
        limits: {
          'example.com': 7,
        },
      };

      const result = await checkLimit('example.com');
      expect(result.limit).toBe(7);
      expect(result.limitType).toBe('daily');
    });
  });

  describe('getBlockedPageUrl', () => {
    test('generates blocked page URL with query parameters', () => {
      const url = getBlockedPageUrl('example.com', 15, 10, 'daily');

      expect(url).toContain('chrome-extension://test-extension-id/src/blocked/blocked.html');
      expect(url).toContain('domain=example.com');
      expect(url).toContain('count=15');
      expect(url).toContain('limit=10');
      expect(url).toContain('limitType=daily');
    });

    test('generates URL with fiveHour limit type', () => {
      const url = getBlockedPageUrl('twitter.com', 5, 3, 'fiveHour');

      expect(url).toContain('domain=twitter.com');
      expect(url).toContain('count=5');
      expect(url).toContain('limit=3');
      expect(url).toContain('limitType=fiveHour');
    });

    test('uses default limitType of daily if not specified', () => {
      const url = getBlockedPageUrl('example.com', 10, 5);

      expect(url).toContain('limitType=daily');
    });

    test('properly URL encodes domain with special characters', () => {
      const url = getBlockedPageUrl('my-site.co.uk', 10, 5, 'daily');

      expect(url).toContain('domain=my-site.co.uk');
    });

    test('handles large count and limit numbers', () => {
      const url = getBlockedPageUrl('example.com', 1000, 999, 'daily');

      expect(url).toContain('count=1000');
      expect(url).toContain('limit=999');
    });
  });

  describe('updateBlockingRules', () => {
    beforeEach(() => {
      chrome.storage.local.data = {};
      chrome.declarativeNetRequest.dynamicRules = [];
    });

    test('creates blocking rules for domains exceeding daily limit', async () => {
      chrome.storage.local.data = {
        visits: {
          [todayKey()]: {
            'example.com': { count: 15, lastVisit: Date.now(), subpaths: {}, timestamps: [] },
          },
        },
        limits: {
          'example.com': buildDailyLimit(10),
        },
      };

      await updateBlockingRules();

      const rules = chrome.declarativeNetRequest.dynamicRules;
      expect(rules.length).toBeGreaterThan(0);
      const hasDomainRule = rules.some((r) => r.condition?.regexFilter);
      expect(hasDomainRule).toBe(true);
    });

    test('creates canonical rules for a legacy www-prefixed limit', async () => {
      chrome.storage.local.data = {
        visits: {
          [todayKey()]: {
            'x.com': { count: 3, lastVisit: Date.now(), subpaths: {}, timestamps: [] },
          },
        },
        limits: {
          'www.x.com': buildDailyLimit(3),
        },
      };

      await updateBlockingRules();

      const regexRule = chrome.declarativeNetRequest.dynamicRules.find(
        (rule) => rule.condition.regexFilter,
      );
      expect(regexRule.condition.regexFilter).toContain('x\\.com');
      expect(regexRule.condition.regexFilter).not.toContain('www\\.x\\.com');
    });

    test('creates regex rule that covers domain and subdomains', async () => {
      chrome.storage.local.data = {
        visits: {
          [todayKey()]: {
            'example.com': { count: 12, lastVisit: Date.now(), subpaths: {}, timestamps: [] },
          },
        },
        limits: {
          'example.com': buildDailyLimit(10),
        },
      };

      await updateBlockingRules();

      const rules = chrome.declarativeNetRequest.dynamicRules;
      const regexRule = rules.find((r) => r.condition.regexFilter);

      expect(regexRule).toBeDefined();
      expect(regexRule.condition.regexFilter).toContain('example\\.com');
    });

    test('does not create rules for domains under limit', async () => {
      chrome.storage.local.data = {
        visits: {
          [todayKey()]: {
            'example.com': { count: 5, lastVisit: Date.now(), subpaths: {}, timestamps: [] },
          },
        },
        limits: {
          'example.com': buildDailyLimit(10),
        },
      };

      await updateBlockingRules();

      const rules = chrome.declarativeNetRequest.dynamicRules;
      expect(rules.length).toBe(0);
    });

    test('removes old rules when updating', async () => {
      // Add some existing rules for a different domain
      chrome.declarativeNetRequest.dynamicRules = [
        {
          id: 999,
          action: { type: 'redirect' },
          condition: { urlFilter: '*://old.com/*', resourceTypes: ['main_frame'] },
        },
      ];

      chrome.storage.local.data = {
        visits: {
          [todayKey()]: {
            'example.com': { count: 15, lastVisit: Date.now(), subpaths: {}, timestamps: [] },
          },
        },
        limits: {
          'example.com': buildDailyLimit(10),
        },
      };

      await updateBlockingRules();

      // Old rules should be removed
      const oldRule = chrome.declarativeNetRequest.dynamicRules.find(
        (r) =>
          r.condition?.regexFilter === '^https?://([^/]*\\.)?old\\.com/' ||
          r.condition?.urlFilter === '*://old.com/*',
      );
      expect(oldRule).toBeUndefined();

      // New rules should be present
      expect(chrome.declarativeNetRequest.dynamicRules.length).toBeGreaterThan(0);
    });

    test('blocks domains exceeding five-hour limit before daily limit', async () => {
      const now = Date.now();
      // Create 15 timestamps, all within the last 5 hours
      const timestamps = Array.from({ length: 15 }, (_, i) => now - i * 60 * 1000); // 1 minute apart

      chrome.storage.local.data = {
        visits: {
          [todayKey()]: {
            'example.com': {
              count: 15,
              lastVisit: now,
              subpaths: {},
              timestamps,
            },
          },
        },
        limits: {
          'example.com': createDefaultLimitConfig({
            fiveHour: { enabled: true, limit: 5 },
            daily: { enabled: true, limit: 100 },
          }),
        },
      };

      await updateBlockingRules();

      const rules = chrome.declarativeNetRequest.dynamicRules;
      expect(rules.length).toBeGreaterThan(0);

      const blockedDomainsMap = chrome.storage.local.data.blockedDomains;
      expect(blockedDomainsMap['example.com']).toBeDefined();
      expect(blockedDomainsMap['example.com'].limitType).toBe('fiveHour');
    });

    test('does not block domains when limits are disabled', async () => {
      chrome.storage.local.data = {
        visits: {
          [todayKey()]: {
            'example.com': { count: 100, lastVisit: Date.now(), subpaths: {}, timestamps: [] },
          },
        },
        limits: {
          'example.com': createDefaultLimitConfig({
            enabled: false,
            daily: { enabled: true, limit: 10 },
          }),
        },
      };

      await updateBlockingRules();

      const rules = chrome.declarativeNetRequest.dynamicRules;
      expect(rules.length).toBe(0);
    });

    test('stores blocked domains info in storage', async () => {
      chrome.storage.local.data = {
        visits: {
          [todayKey()]: {
            'example.com': { count: 15, lastVisit: Date.now(), subpaths: {}, timestamps: [] },
            'twitter.com': { count: 10, lastVisit: Date.now(), subpaths: {}, timestamps: [] },
          },
        },
        limits: {
          'example.com': buildDailyLimit(10),
          'twitter.com': buildDailyLimit(5),
        },
      };

      await updateBlockingRules();

      const blockedDomains = chrome.storage.local.data.blockedDomains;
      expect(blockedDomains['example.com']).toBeDefined();
      expect(blockedDomains['twitter.com']).toBeDefined();
      expect(blockedDomains['example.com'].count).toBe(15);
      expect(blockedDomains['twitter.com'].count).toBe(10);
      expect(blockedDomains['example.com'].blockedAt).toBeDefined();
    });

    test('handles empty visits gracefully', async () => {
      chrome.storage.local.data = {
        visits: {},
        limits: {
          'example.com': buildDailyLimit(10),
        },
      };

      await updateBlockingRules();

      const rules = chrome.declarativeNetRequest.dynamicRules;
      expect(rules.length).toBe(0);
    });

    test('handles error during rule update gracefully', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      const originalUpdateRules = chrome.declarativeNetRequest.updateDynamicRules;

      chrome.declarativeNetRequest.updateDynamicRules = jest
        .fn()
        .mockRejectedValue(new Error('API error'));

      chrome.storage.local.data = {
        visits: {
          [todayKey()]: {
            'example.com': { count: 15, lastVisit: Date.now(), subpaths: {}, timestamps: [] },
          },
        },
        limits: {
          'example.com': buildDailyLimit(10),
        },
      };

      await updateBlockingRules();

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error updating blocking rules:',
        expect.any(Error),
      );

      // Restore
      chrome.declarativeNetRequest.updateDynamicRules = originalUpdateRules;
      consoleErrorSpy.mockRestore();
    });
  });
});
