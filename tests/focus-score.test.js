import {
  calculateDailyFocusScoreWithData,
  getFocusScoreBreakdown,
  getFocusScoreHistory,
  getPreviousDates,
  getDateRange,
} from '../src/background/focus-score.js';
import { getDateKey, getTodayKey } from '../src/common/date-utils.js';

function chromeStorageMock(visits = {}, limits = {}, overallStreak = { current: 0, best: 0 }) {
  global.chrome = {
    storage: {
      local: {
        data: { visits, limits, overallStreak },
        get(keys, cb) {
          if (keys === null || Array.isArray(keys)) {
            const res = {};
            const list = keys === null ? Object.keys(this.data) : keys;
            list.forEach((k) => {
              if (this.data[k] !== undefined) res[k] = this.data[k];
            });
            cb(res);
          } else {
            cb({ [keys]: this.data[keys] });
          }
        },
        set(items, cb) {
          Object.assign(this.data, items);
          if (cb) cb();
        },
      },
    },
    runtime: {},
  };
}

describe('focus-score', () => {
  describe('getPreviousDates / getDateRange helpers', () => {
    test('getPreviousDates returns n dates before', () => {
      const dates = getPreviousDates('2025-01-10', 3);
      expect(dates).toHaveLength(3);
      expect(dates[0]).toBe('2025-01-09');
      expect(dates[1]).toBe('2025-01-08');
      expect(dates[2]).toBe('2025-01-07');
    });

    test('getDateRange inclusive', () => {
      const range = getDateRange('2025-01-01', '2025-01-03');
      expect(range).toEqual(['2025-01-01', '2025-01-02', '2025-01-03']);
    });
  });

  describe('calculateDailyFocusScoreWithData (pure)', () => {
    test('returns 0-100 for empty day with no limits', () => {
      const score = calculateDailyFocusScoreWithData('2025-01-10', {}, {}, 0);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    test('compliance score: staying under limit yields higher score than exceeding', () => {
      const date = '2025-01-10';
      const limits = {
        'example.com': {
          enabled: true,
          fiveHour: { enabled: true, limit: 10 },
          daily: { enabled: true, limit: 5 },
        },
      };
      const visitsUnder = { [date]: { 'example.com': { count: 2 } } };
      const visitsOver = { [date]: { 'example.com': { count: 20 } } };
      const under = calculateDailyFocusScoreWithData(date, visitsUnder, limits, 0);
      const over = calculateDailyFocusScoreWithData(date, visitsOver, limits, 0);
      expect(under).toBeGreaterThan(over);
    });

    test('streak bonus increases score but caps at 20, and focus domains penalty', () => {
      const date = '2025-01-10';
      const visits = { [date]: { 'example.com': { count: 1 } } };
      const limits = {};
      const noStreak = calculateDailyFocusScoreWithData(date, visits, limits, 0);
      const withStreak = calculateDailyFocusScoreWithData(date, visits, limits, 10);
      expect(withStreak).toBeGreaterThanOrEqual(noStreak);
    });

    test('many domains reduces focus score component', () => {
      const date = '2025-01-10';
      const many = {};
      for (let i = 0; i < 25; i += 1) many[`site${i}.com`] = { count: 1 };
      const few = { 'a.com': { count: 1 }, 'b.com': { count: 1 } };
      const scoreMany = calculateDailyFocusScoreWithData(date, { [date]: many }, {}, 0);
      const scoreFew = calculateDailyFocusScoreWithData(date, { [date]: few }, {}, 0);
      expect(scoreFew).toBeGreaterThan(scoreMany);
    });

    test('reduction score rewards fewer visits than previous average', () => {
      const date = '2025-01-10';
      const previousDates = getPreviousDates(date, 7);
      const visits = {};
      previousDates.forEach((d) => {
        visits[d] = { 'example.com': { count: 10 } };
      });
      visits[date] = { 'example.com': { count: 1 } };
      const lowToday = calculateDailyFocusScoreWithData(date, visits, {}, 0);
      visits[date] = { 'example.com': { count: 20 } };
      const highToday = calculateDailyFocusScoreWithData(date, visits, {}, 0);
      expect(lowToday).toBeGreaterThan(highToday);
    });

    test('handles legacy numeric limit via normalization not throwing', () => {
      const date = '2025-01-10';
      const visits = { [date]: { 'example.com': { count: 2 } } };
      const limits = { 'example.com': 10 };
      expect(() => calculateDailyFocusScoreWithData(date, visits, limits, 0)).not.toThrow();
    });
  });

  describe('getFocusScoreBreakdown and history (storage read path)', () => {
    beforeEach(() => {
      chromeStorageMock();
    });

    test('getFocusScoreBreakdown returns total and components', async () => {
      const today = getTodayKey();
      const visits = { [today]: { 'example.com': { count: 3 } } };
      const limits = {
        'example.com': {
          enabled: true,
          fiveHour: { enabled: true, limit: 10 },
          daily: { enabled: true, limit: 10 },
        },
      };
      chromeStorageMock(visits, limits, { current: 2, best: 2 });
      const breakdown = await getFocusScoreBreakdown(today);
      expect(breakdown).toHaveProperty('total');
      expect(breakdown).toHaveProperty('compliance');
      expect(breakdown).toHaveProperty('reduction');
      expect(breakdown).toHaveProperty('streak');
      expect(breakdown).toHaveProperty('focus');
      expect(breakdown).toHaveProperty('metadata');
      expect(breakdown.total).toBeGreaterThanOrEqual(0);
      expect(breakdown.total).toBeLessThanOrEqual(100);
    });

    test('getFocusScoreHistory returns array of length days', async () => {
      chromeStorageMock({}, {}, { current: 0, best: 0 });
      const history = await getFocusScoreHistory(7);
      expect(history).toHaveLength(7);
      history.forEach((entry) => {
        expect(entry).toHaveProperty('date');
        expect(entry).toHaveProperty('score');
        expect(typeof entry.score).toBe('number');
      });
    });

    test('getFocusScoreHistory with 0 returns empty', async () => {
      chromeStorageMock({}, {}, { current: 0, best: 0 });
      const history = await getFocusScoreHistory(0);
      expect(history).toHaveLength(0);
    });
  });
});
