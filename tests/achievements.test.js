import {
  ACHIEVEMENTS,
  checkAchievements,
  getAchievementProgress,
  getAllAchievements,
  initializeAchievements,
} from '../src/background/achievements.js';
import { createDefaultLimitConfig } from '../src/background/storage.js';
import { getDateKey } from '../src/common/date-utils.js';

function makeChrome(data = {}) {
  global.chrome = {
    storage: {
      local: {
        data: { ...data },
        get(keys, cb) {
          let res = {};
          if (keys === null || keys === undefined) {
            res = this.data;
          } else if (Array.isArray(keys)) {
            keys.forEach((k) => {
              if (this.data[k] !== undefined) res[k] = this.data[k];
            });
          } else if (typeof keys === 'string') {
            res = { [keys]: this.data[keys] };
          } else {
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

describe('achievements', () => {
  test('ACHIEVEMENTS map contains expected keys', () => {
    expect(ACHIEVEMENTS['first-step']).toBeDefined();
    expect(ACHIEVEMENTS['three-day-streak']).toBeDefined();
    expect(ACHIEVEMENTS['hundred-visits']).toBeDefined();
  });

  describe('initializeAchievements', () => {
    test('seeds achievements when missing', async () => {
      makeChrome({});
      await initializeAchievements();
      expect(global.chrome.storage.local.data.achievements).toEqual({ unlocked: [], progress: {} });
    });

    test('does not overwrite existing', async () => {
      makeChrome({ achievements: { unlocked: ['first-step'], progress: {} } });
      await initializeAchievements();
      expect(global.chrome.storage.local.data.achievements.unlocked).toContain('first-step');
    });
  });

  describe('checkAchievements', () => {
    test('unlocks first-step when a limit exists', async () => {
      makeChrome({
        limits: { 'example.com': createDefaultLimitConfig() },
        achievements: { unlocked: [], progress: {} },
        visits: {},
      });
      const unlocked = await checkAchievements();
      expect(unlocked).toContain('first-step');
    });

    test('does not re-unlock already unlocked', async () => {
      makeChrome({
        limits: { 'example.com': createDefaultLimitConfig() },
        achievements: { unlocked: ['first-step'], progress: {} },
        visits: {},
      });
      const unlocked = await checkAchievements();
      expect(unlocked).not.toContain('first-step');
    });

    test('unlocks five-limits when 5 domains configured', async () => {
      const limits = {};
      for (let i = 0; i < 5; i += 1) limits[`site${i}.com`] = createDefaultLimitConfig();
      makeChrome({ limits, achievements: { unlocked: [], progress: {} }, visits: {} });
      const unlocked = await checkAchievements();
      expect(unlocked).toContain('five-limits');
    });
  });

  describe('getAchievementProgress', () => {
    test('returns null for unknown id', async () => {
      makeChrome({});
      const p = await getAchievementProgress('unknown');
      expect(p).toBeNull();
    });

    test('reports limit count progress for first-step', async () => {
      makeChrome({ limits: { 'example.com': createDefaultLimitConfig() } });
      const p = await getAchievementProgress('first-step');
      expect(p.current).toBe(1);
      expect(p.target).toBe(1);
    });

    test('reports visit count progress for hundred-visits', async () => {
      const today = getDateKey(new Date());
      makeChrome({ visits: { [today]: { 'example.com': { count: 50 } } } });
      const p = await getAchievementProgress('hundred-visits');
      expect(p.current).toBe(50);
      expect(p.target).toBe(100);
    });

    test('reports week-warrior consecutive days', async () => {
      const today = new Date();
      const visits = {};
      for (let i = 0; i < 7; i += 1) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        visits[getDateKey(d)] = { 'example.com': { count: 1 } };
      }
      makeChrome({ visits });
      const p = await getAchievementProgress('week-warrior');
      expect(p.current).toBeGreaterThanOrEqual(7);
      expect(p.target).toBe(7);
    });

    test('zero-violations progress returns 0/1 or 1/1 based on limits', async () => {
      makeChrome({ visits: {}, limits: {} });
      const p = await getAchievementProgress('zero-violations');
      expect(p.current).toBe(0);
      expect(p.target).toBe(1);
    });
  });

  describe('getAllAchievements', () => {
    test('returns sorted list with unlocked flag', async () => {
      makeChrome({ limits: {}, achievements: { unlocked: [], progress: {} }, visits: {} });
      const list = await getAllAchievements();
      expect(Array.isArray(list)).toBe(true);
      expect(list.length).toBeGreaterThan(0);
      list.forEach((a) => {
        expect(a).toHaveProperty('unlocked');
        expect(a).toHaveProperty('progress');
      });
    });
  });
});
