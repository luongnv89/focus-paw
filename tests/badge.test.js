/**
 * Tests for badge module
 * Tests extension badge update logic
 */

import { updateVisitBadge, initializeBadge } from '../src/background/badge.js';
import { getTodayKey } from '../src/background/storage.js';

// Mock chrome.action and chrome.storage APIs
global.chrome = {
  action: {
    badgeText: '',
    badgeColor: '',
    setBadgeText({ text }) {
      this.badgeText = text;
      return Promise.resolve();
    },
    setBadgeBackgroundColor({ color }) {
      this.badgeColor = color;
      return Promise.resolve();
    },
  },
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
    },
  },
};

describe('Badge Module', () => {
  beforeEach(() => {
    // Clear storage and badge state before each test
    chrome.storage.local.data = {};
    chrome.action.badgeText = '';
    chrome.action.badgeColor = '';
  });

  describe('updateVisitBadge', () => {
    test('sets empty badge when no visits recorded', async () => {
      chrome.storage.local.data.visits = {};

      await updateVisitBadge();

      expect(chrome.action.badgeText).toBe('');
      expect(chrome.action.badgeColor).toBe('#1BFF6E');
    });

    test('shows total visits when visits recorded today', async () => {
      const todayKey = getTodayKey();
      chrome.storage.local.data.visits = {
        [todayKey]: {
          'example.com': { count: 5, lastVisit: Date.now(), subpaths: {} },
          'twitter.com': { count: 3, lastVisit: Date.now(), subpaths: {} },
          'github.com': { count: 8, lastVisit: Date.now(), subpaths: {} },
        },
      };

      await updateVisitBadge();

      expect(chrome.action.badgeText).toBe('16');
      expect(chrome.action.badgeColor).toBe('#1BFF6E');
    });

    test('shows total visits for a single domain', async () => {
      const todayKey = getTodayKey();
      chrome.storage.local.data.visits = {
        [todayKey]: {
          'example.com': { count: 10, lastVisit: Date.now(), subpaths: {} },
        },
      };

      await updateVisitBadge();

      expect(chrome.action.badgeText).toBe('10');
      expect(chrome.action.badgeColor).toBe('#1BFF6E');
    });

    test('ignores visits from previous days', async () => {
      const todayKey = getTodayKey();
      const yesterdayKey = new Date(Date.now() - 86400000).toISOString().split('T')[0];

      chrome.storage.local.data.visits = {
        [todayKey]: {
          'example.com': { count: 5, lastVisit: Date.now(), subpaths: {} },
        },
        [yesterdayKey]: {
          'twitter.com': { count: 10, lastVisit: Date.now() - 86400000, subpaths: {} },
          'github.com': { count: 15, lastVisit: Date.now() - 86400000, subpaths: {} },
        },
      };

      await updateVisitBadge();

      expect(chrome.action.badgeText).toBe('5');
    });

    test('handles large visit totals', async () => {
      const todayKey = getTodayKey();
      const visits = {};

      // Create 50 domains
      for (let i = 0; i < 50; i++) {
        visits[`domain${i}.com`] = { count: i + 1, lastVisit: Date.now(), subpaths: {} };
      }

      chrome.storage.local.data.visits = {
        [todayKey]: visits,
      };

      await updateVisitBadge();

      expect(chrome.action.badgeText).toBe('1275');
      expect(chrome.action.badgeColor).toBe('#1BFF6E');
    });

    test('uses Bear Blue brand color for badge background', async () => {
      const todayKey = getTodayKey();
      chrome.storage.local.data.visits = {
        [todayKey]: {
          'example.com': { count: 1, lastVisit: Date.now(), subpaths: {} },
        },
      };

      await updateVisitBadge();

      // Bear Blue from brand guidelines
      expect(chrome.action.badgeColor).toBe('#1BFF6E');
    });

    test('handles missing visits object gracefully', async () => {
      chrome.storage.local.data = {};

      await updateVisitBadge();

      expect(chrome.action.badgeText).toBe('');
      expect(chrome.action.badgeColor).toBe('#1BFF6E');
    });

    test('handles null visits gracefully', async () => {
      chrome.storage.local.data.visits = null;

      await updateVisitBadge();

      expect(chrome.action.badgeText).toBe('');
    });

    test('shows count for exactly 10 visits across domains', async () => {
      const todayKey = getTodayKey();
      const visits = {};

      for (let i = 0; i < 10; i++) {
        visits[`site${i}.com`] = { count: 1, lastVisit: Date.now(), subpaths: {} };
      }

      chrome.storage.local.data.visits = {
        [todayKey]: visits,
      };

      await updateVisitBadge();

      expect(chrome.action.badgeText).toBe('10');
    });

    test('updates badge text as visits are added', async () => {
      const todayKey = getTodayKey();

      // Start with 1 domain
      chrome.storage.local.data.visits = {
        [todayKey]: {
          'example.com': { count: 5, lastVisit: Date.now(), subpaths: {} },
        },
      };

      await updateVisitBadge();
      expect(chrome.action.badgeText).toBe('5');

      // Add another domain
      chrome.storage.local.data.visits[todayKey]['twitter.com'] = {
        count: 3,
        lastVisit: Date.now(),
        subpaths: {},
      };

      await updateVisitBadge();
      expect(chrome.action.badgeText).toBe('8');

      // Add a third domain
      chrome.storage.local.data.visits[todayKey]['github.com'] = {
        count: 7,
        lastVisit: Date.now(),
        subpaths: {},
      };

      await updateVisitBadge();
      expect(chrome.action.badgeText).toBe('15');
    });

    test('handles error when setBadgeText fails', async () => {
      const todayKey = getTodayKey();
      chrome.storage.local.data.visits = {
        [todayKey]: {
          'example.com': { count: 1, lastVisit: Date.now(), subpaths: {} },
        },
      };

      // Mock setBadgeText to throw an error
      const originalSetBadgeText = chrome.action.setBadgeText;
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      chrome.action.setBadgeText = jest.fn().mockRejectedValue(new Error('API error'));

      await updateVisitBadge();

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error updating visit badge:',
        expect.any(Error),
      );

      // Restore
      chrome.action.setBadgeText = originalSetBadgeText;
      consoleErrorSpy.mockRestore();
    });

    test('handles error when setBadgeBackgroundColor fails', async () => {
      const todayKey = getTodayKey();
      chrome.storage.local.data.visits = {
        [todayKey]: {
          'example.com': { count: 1, lastVisit: Date.now(), subpaths: {} },
        },
      };

      // Mock setBadgeBackgroundColor to throw an error
      const originalSetBadgeBackgroundColor = chrome.action.setBadgeBackgroundColor;
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      chrome.action.setBadgeBackgroundColor = jest.fn().mockRejectedValue(new Error('API error'));

      await updateVisitBadge();

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error updating visit badge:',
        expect.any(Error),
      );

      // Restore
      chrome.action.setBadgeBackgroundColor = originalSetBadgeBackgroundColor;
      consoleErrorSpy.mockRestore();
    });
  });

  describe('initializeBadge', () => {
    test('calls updateVisitBadge and logs initialization', async () => {
      const todayKey = getTodayKey();
      chrome.storage.local.data.visits = {
        [todayKey]: {
          'example.com': { count: 5, lastVisit: Date.now(), subpaths: {} },
        },
      };

      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

      await initializeBadge();

      expect(consoleLogSpy).toHaveBeenCalledWith('Initializing visit counter badge...');
      expect(consoleLogSpy).toHaveBeenCalledWith('Visit counter badge initialized');
      expect(chrome.action.badgeText).toBe('5');
      expect(chrome.action.badgeColor).toBe('#1BFF6E');

      consoleLogSpy.mockRestore();
    });

    test('initializes badge with zero visits', async () => {
      chrome.storage.local.data.visits = {};

      await initializeBadge();

      expect(chrome.action.badgeText).toBe('');
      expect(chrome.action.badgeColor).toBe('#1BFF6E');
    });

    test('initializes badge with multiple domains worth of visits', async () => {
      const todayKey = getTodayKey();
      chrome.storage.local.data.visits = {
        [todayKey]: {
          'example.com': { count: 5, lastVisit: Date.now(), subpaths: {} },
          'twitter.com': { count: 3, lastVisit: Date.now(), subpaths: {} },
          'github.com': { count: 8, lastVisit: Date.now(), subpaths: {} },
        },
      };

      await initializeBadge();

      expect(chrome.action.badgeText).toBe('16');
    });
  });
});
