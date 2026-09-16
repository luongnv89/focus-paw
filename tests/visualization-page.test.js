import { generateWeeklyInsights, loadAggregatedStats } from '../src/common/visualization-page.js';
import { getDateKey } from '../src/common/date-utils.js';

function makeChrome(visits = {}) {
  global.chrome = {
    storage: {
      local: {
        data: { visits },
        get(keys, cb) {
          let res = {};
          if (Array.isArray(keys)) {
            keys.forEach((k) => {
              if (this.data[k] !== undefined) res[k] = this.data[k];
            });
          } else if (typeof keys === 'string') {
            res = { [keys]: this.data[keys] };
          } else if (keys === null) {
            res = this.data;
          }
          if (typeof cb === 'function') {
            cb(res);
            return undefined;
          }
          return Promise.resolve(res);
        },
        set(items, cb) {
          Object.assign(this.data, items);
          if (typeof cb === 'function') cb();
          return Promise.resolve();
        },
      },
    },
    runtime: {},
  };
  global.chrome.action = { setBadgeText: async () => {}, setBadgeBackgroundColor: async () => {} };
  global.chrome.declarativeNetRequest = {
    updateDynamicRules: async () => {},
    getDynamicRules: async () => [],
  };
}

describe('visualization-page', () => {
  test('exports remain available after Map view wiring', () => {
    expect(typeof generateWeeklyInsights).toBe('function');
    expect(typeof loadAggregatedStats).toBe('function');
  });

  describe('generateWeeklyInsights', () => {
    test('returns empty for no data', () => {
      expect(generateWeeklyInsights({}, {})).toEqual([]);
    });

    test('most visited insight present', () => {
      const weekData = {
        'example.com': { count: 20, lastVisit: Date.now(), subpaths: {} },
        'other.com': { count: 5, lastVisit: Date.now(), subpaths: {} },
      };
      const insights = generateWeeklyInsights(weekData, {});
      expect(insights.some((i) => i.title.includes('Most Visited'))).toBe(true);
      expect(insights[0].text).toContain('example.com');
    });

    test('limit violation warning when over daily limit', () => {
      const weekData = { 'example.com': { count: 100, lastVisit: Date.now(), subpaths: {} } };
      const limits = { 'example.com': { enabled: true, daily: { enabled: true, limit: 5 } } };
      const insights = generateWeeklyInsights(weekData, limits);
      expect(
        insights.some((i) => i.type === 'warning' && i.title.includes('Limits Exceeded')),
      ).toBe(true);
    });

    test('success when within limits', () => {
      const weekData = { 'example.com': { count: 1, lastVisit: Date.now(), subpaths: {} } };
      const limits = { 'example.com': { enabled: true, daily: { enabled: true, limit: 10 } } };
      const insights = generateWeeklyInsights(weekData, limits);
      expect(insights.some((i) => i.type === 'success')).toBe(true);
    });

    test('activity summary always present', () => {
      const weekData = { 'a.com': { count: 10 }, 'b.com': { count: 5 } };
      const insights = generateWeeklyInsights(weekData, {});
      expect(insights.some((i) => i.title.includes('Activity Summary'))).toBe(true);
    });

    test('recommendation when top 3 dominate', () => {
      const weekData = {
        'a.com': { count: 50 },
        'b.com': { count: 40 },
        'c.com': { count: 30 },
        'd.com': { count: 2 },
      };
      const insights = generateWeeklyInsights(weekData, {});
      expect(insights.some((i) => i.title.includes('Recommendation'))).toBe(true);
    });

    test('no recommendation when distributed', () => {
      const weekData = {
        'a.com': { count: 10 },
        'b.com': { count: 10 },
        'c.com': { count: 10 },
        'd.com': { count: 10 },
        'e.com': { count: 10 },
      };
      const insights = generateWeeklyInsights(weekData, {});
      expect(insights.some((i) => i.title.includes('Recommendation'))).toBe(false);
    });
  });

  describe('loadAggregatedStats', () => {
    test('aggregates today visits from storage', async () => {
      const todayKey = getDateKey(new Date());
      makeChrome({
        [todayKey]: { 'example.com': { count: 5, lastVisit: Date.now(), subpaths: {} } },
      });
      const stats = await loadAggregatedStats('today');
      expect(stats['example.com'].count).toBe(5);
    });

    test('handles empty visits', async () => {
      makeChrome({});
      const stats = await loadAggregatedStats('week');
      expect(Object.keys(stats)).toHaveLength(0);
    });

    test('supports hour range', async () => {
      makeChrome({});
      const stats = await loadAggregatedStats('hour');
      expect(typeof stats).toBe('object');
    });

    test('supports month range', async () => {
      makeChrome({});
      const stats = await loadAggregatedStats('month');
      expect(typeof stats).toBe('object');
    });

    test('defaults to today for unknown range', async () => {
      makeChrome({});
      const stats = await loadAggregatedStats('unknown');
      expect(typeof stats).toBe('object');
    });
  });
});
