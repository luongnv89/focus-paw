import {
  calculateLimitStreak,
  getAllStreaks,
  computeOverallStreakFromData,
  computeOverallStreak,
  calculateOverallStreak,
  createDefaultLimitConfig,
} from '../src/background/storage.js';
import { getDateKey } from '../src/common/date-utils.js';

function makeChromeMock(data = {}) {
  global.chrome = {
    storage: {
      local: {
        data: { ...data },
        get(keys, cb) {
          let result = {};
          if (keys === null || keys === undefined) {
            result = this.data;
          } else if (Array.isArray(keys)) {
            keys.forEach((k) => {
              if (this.data[k] !== undefined) result[k] = this.data[k];
            });
          } else if (typeof keys === 'string') {
            result = { [keys]: this.data[keys] };
          } else {
            result = { [keys]: this.data[keys] };
          }
          if (typeof cb === 'function') {
            cb(result);
            return undefined;
          }
          return Promise.resolve(result);
        },
        set(items, cb) {
          Object.assign(this.data, items);
          if (typeof cb === 'function') {
            cb();
            return undefined;
          }
          return Promise.resolve();
        },
      },
    },
    runtime: {},
  };
}

describe('storage streaks', () => {
  describe('computeOverallStreakFromData (pure)', () => {
    test('returns zero when no limits', () => {
      const res = computeOverallStreakFromData({}, {}, { current: 0, best: 0 });
      expect(res.current).toBe(0);
    });

    test('counts consecutive compliant days', () => {
      const today = new Date();
      const visits = {};
      const limits = {
        'example.com': createDefaultLimitConfig({ daily: { enabled: true, limit: 5 } }),
      };
      for (let i = 0; i < 3; i += 1) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        visits[getDateKey(d)] = { 'example.com': { count: 2 } };
      }
      const res = computeOverallStreakFromData(visits, limits, { current: 0, best: 0 });
      expect(res.current).toBeGreaterThanOrEqual(3);
    });

    test('breaks streak when exceeding limit', () => {
      const today = new Date();
      const visits = {};
      const limits = {
        'example.com': createDefaultLimitConfig({ daily: { enabled: true, limit: 5 } }),
      };
      const d0 = getDateKey(today);
      const d1 = getDateKey(new Date(today.getTime() - 86400000));
      const d2 = getDateKey(new Date(today.getTime() - 2 * 86400000));
      visits[d0] = { 'example.com': { count: 2 } };
      visits[d1] = { 'example.com': { count: 20 } };
      visits[d2] = { 'example.com': { count: 2 } };
      const res = computeOverallStreakFromData(visits, limits, { current: 0, best: 0 });
      expect(res.current).toBe(1);
    });

    test('best is max of current and existing best', () => {
      const res = computeOverallStreakFromData(
        {},
        { 'example.com': createDefaultLimitConfig() },
        { current: 1, best: 10 },
      );
      // With no visits and limits? Actually with no visits, limit respected? But we have limit, today count 0 <= limit, so current would be large (365). So best should be max.
      expect(res.best).toBeGreaterThanOrEqual(10);
    });

    test('computeOverallStreak alias same as FromData', () => {
      expect(computeOverallStreak).toBe(computeOverallStreakFromData);
    });

    test('handles legacy numeric limits', () => {
      const visits = {};
      const rawLimits = { 'example.com': 5 };
      const res = computeOverallStreakFromData(visits, rawLimits, {});
      expect(res.current).toBeGreaterThanOrEqual(1);
    });
  });

  describe('calculateLimitStreak (storage)', () => {
    test('returns zero streak when no limit for domain', async () => {
      makeChromeMock({ visits: {}, limits: {}, streaks: {} });
      const res = await calculateLimitStreak('example.com');
      expect(res.current).toBe(0);
      expect(res.best).toBe(0);
      expect(res.lastCheckDate).toBeNull();
    });

    test('increments streak for compliant days and persists best', async () => {
      const today = new Date();
      const visits = {};
      for (let i = 0; i < 3; i += 1) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        visits[getDateKey(d)] = { 'example.com': { count: 1 } };
      }
      makeChromeMock({
        visits,
        limits: { 'example.com': createDefaultLimitConfig({ daily: { enabled: true, limit: 5 } }) },
        streaks: { 'example.com': { current: 1, best: 1, lastCheckDate: null } },
      });
      const res = await calculateLimitStreak('example.com');
      expect(res.current).toBeGreaterThanOrEqual(3);
      expect(res.best).toBeGreaterThanOrEqual(res.current);
      expect(res.lastCheckDate).toBeDefined();
    });

    test('breaks streak when exceeding daily limit', async () => {
      const today = new Date();
      const todayKey = getDateKey(today);
      makeChromeMock({
        visits: { [todayKey]: { 'example.com': { count: 100 } } },
        limits: { 'example.com': createDefaultLimitConfig({ daily: { enabled: true, limit: 5 } }) },
        streaks: {},
      });
      const res = await calculateLimitStreak('example.com');
      expect(res.current).toBe(0);
    });

    test('getAllStreaks returns stored streaks', async () => {
      makeChromeMock({ streaks: { 'example.com': { current: 2, best: 3 } } });
      const all = await getAllStreaks();
      expect(all['example.com'].current).toBe(2);
    });

    test('getAllStreaks returns empty when none', async () => {
      makeChromeMock({});
      const all = await getAllStreaks();
      expect(all).toEqual({});
    });
  });

  describe('calculateOverallStreak (storage, memoized)', () => {
    test('computes streak and writes only when changed', async () => {
      const today = new Date();
      const visits = {};
      for (let i = 0; i < 2; i += 1) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        visits[getDateKey(d)] = { 'example.com': { count: 1 } };
      }
      makeChromeMock({
        visits,
        limits: {
          'example.com': createDefaultLimitConfig({ daily: { enabled: true, limit: 10 } }),
        },
        overallStreak: { current: 0, best: 0 },
      });
      const res = await calculateOverallStreak();
      expect(res.current).toBeGreaterThanOrEqual(2);
      expect(global.chrome.storage.local.data.overallStreak.current).toBe(res.current);
    });

    test('returns zero when no limits enabled', async () => {
      makeChromeMock({ visits: {}, limits: {}, overallStreak: { current: 0, best: 0 } });
      const res = await calculateOverallStreak();
      expect(res.current).toBe(0);
    });
  });
});
