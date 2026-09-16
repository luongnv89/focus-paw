/**
 * FocusPaw Data Storage Module
 * Handles all interactions with chrome.storage.local
 *
 * Data Schema:
 * {
 *   visits: {
 *     "2025-11-14": {
 *       "example.com": {
 *         count: 5,
 *         lastVisit: 1700000000000,
 *         timestamps: [1700000000000, 1700000001000, ...],
 *         subpaths: {
 *           "/path1": { count: 2, lastVisit: 1700000000000 },
 *           "/path2": { count: 3, lastVisit: 1700000000000 }
 *         }
 *       },
 *       "twitter.com": {
 *         count: 12,
 *         lastVisit: 1700000000000,
 *         timestamps: [...],
 *         subpaths: {}
 *       }
 *     }
 *   },
 *   limits: {
 *     "example.com": {
 *       enabled: true,
 *       fiveHour: { enabled: true, limit: 10 },
 *       daily: { enabled: true, limit: 20 }
 *     },
 *     "twitter.com": {
 *       enabled: true,
 *       fiveHour: { enabled: true, limit: 10 },
 *       daily: { enabled: true, limit: 20 }
 *     }
 *   },
 *   settings: {
 *     onboardingComplete: false,
 *     geoLookupEnabled: false
 *   },
 *   geoLookupCache: {
 *     "example.com": { lat: 1.2, lon: 3.4, country: "SG", fetchedAt: 1700000000000, ok: true }
 *   }
 * }
 */

import {
  getTodayKey,
  getDateKey,
  parseDateKey,
  aggregateVisitsInRange,
} from '../common/date-utils.js';
import { canonicalizeDomain } from '../common/domain-utils.js';

const defaultSettings = {
  onboardingComplete: false,
  geoLookupEnabled: false,
};

export const GEO_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
export const GEO_CACHE_MAX_ENTRIES = 200;
export const GEO_CACHE_STORAGE_KEY = 'geoLookupCache';

let geoCacheQueue = Promise.resolve();

/**
 * Reset geo-cache write queue (test-only)
 */
export function resetGeoCacheQueueForTests() {
  geoCacheQueue = Promise.resolve();
}

/**
 * Drop expired geo cache entries, then oldest when over the size cap.
 * @param {Object} cache
 * @param {number} [now]
 * @param {number} [ttlMs]
 * @param {number} [maxEntries]
 * @returns {Object}
 */
export function pruneGeoCacheEntries(
  cache,
  now = Date.now(),
  ttlMs = GEO_CACHE_TTL_MS,
  maxEntries = GEO_CACHE_MAX_ENTRIES,
) {
  const next = {};
  Object.entries(cache || {}).forEach(([domain, entry]) => {
    if (!entry || typeof entry.fetchedAt !== 'number') return;
    if (now - entry.fetchedAt > ttlMs) return;
    next[domain] = entry;
  });
  const keys = Object.keys(next);
  if (keys.length <= maxEntries) return next;
  keys
    .sort((a, b) => next[a].fetchedAt - next[b].fetchedAt)
    .slice(0, keys.length - maxEntries)
    .forEach((key) => {
      delete next[key];
    });
  return next;
}

const limitDefaults = {
  enabled: true,
  fiveHour: { enabled: true, limit: 10 },
  daily: { enabled: true, limit: 20 },
};

// eslint-disable-next-line object-curly-newline
export { getTodayKey, getDateKey, parseDateKey, aggregateVisitsInRange };

/**
 * Create a normalized limit config merged with defaults
 * @param {Object} overrides - Partial configuration to override defaults
 * @returns {Object} Normalized limit configuration
 */
export function createDefaultLimitConfig(overrides = {}) {
  return {
    enabled: overrides.enabled ?? limitDefaults.enabled,
    fiveHour: {
      enabled: overrides.fiveHour?.enabled ?? limitDefaults.fiveHour.enabled,
      limit: overrides.fiveHour?.limit ?? limitDefaults.fiveHour.limit,
    },
    daily: {
      enabled: overrides.daily?.enabled ?? limitDefaults.daily.enabled,
      limit: overrides.daily?.limit ?? limitDefaults.daily.limit,
    },
  };
}

export const RETENTION_DAYS = 30;
export const MAX_TIMESTAMPS_PER_DOMAIN = 1000;

/**
 * Get retention cutoff date key (YYYY-MM-DD) — entries older than this are compacted
 * @returns {string} Cutoff date key
 */
export function getRetentionCutoffKey() {
  const d = new Date();
  d.setDate(d.getDate() - RETENTION_DAYS);
  return getDateKey(d);
}

/**
 * Compact visits history: remove date buckets older than retention window and trim per-domain timestamp arrays.
 * Mutates the visits object in place.
 * @param {Object} visits - Visits object keyed by date
 */
export function compactVisits(visits) {
  const cutoff = getRetentionCutoffKey();
  Object.keys(visits).forEach((dateKey) => {
    if (dateKey < cutoff) {
      delete visits[dateKey];
    } else {
      const dayVisits = visits[dateKey];
      Object.values(dayVisits).forEach((domainData) => {
        if (domainData.timestamps && domainData.timestamps.length > MAX_TIMESTAMPS_PER_DOMAIN) {
          domainData.timestamps = domainData.timestamps.slice(-MAX_TIMESTAMPS_PER_DOMAIN);
        }
      });
    }
  });
}

// Serialized write queue — ensures per-domain mutations are not lost under concurrent calls
let writeQueue = Promise.resolve();

/**
 * Reset internal write queue (test-only)
 */
export function resetWriteQueueForTests() {
  writeQueue = Promise.resolve();
}

// Back-compat alias for earlier underscore name (kept for any external import)
// eslint-disable-next-line no-underscore-dangle
export const _resetWriteQueueForTests = resetWriteQueueForTests;

/**
 * Get all stored data
 * @returns {Promise<Object>} All storage data
 */
export async function getAllData() {
  return new Promise((resolve) => {
    chrome.storage.local.get(null, (data) => {
      resolve(data);
    });
  });
}

/**
 * Get visits data
 * @returns {Promise<Object>} Visits object
 */
export async function getVisits() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['visits'], (data) => {
      resolve(data.visits || {});
    });
  });
}

/**
 * Get visits for a specific date
 * @param {string} dateKey - Date in YYYY-MM-DD format
 * @returns {Promise<Object>} Visits for that date
 */
export async function getVisitsForDate(dateKey) {
  const visits = await getVisits();
  return visits[dateKey] || {};
}

/**
 * Get visits for today
 * @returns {Promise<Object>} Today's visits
 */
export async function getTodayVisits() {
  return getVisitsForDate(getTodayKey());
}

/**
 * Get count of unique domains visited today
 * @returns {Promise<number>} Number of unique domains
 */
export async function getTodayDomainCount() {
  const todayVisits = await getTodayVisits();
  return Object.keys(todayVisits).length;
}

/**
 * Get total visits recorded today across all domains
 * @returns {Promise<number>} Total visit count
 */
export async function getTodayVisitCount() {
  const todayVisits = await getTodayVisits();
  return Object.values(todayVisits).reduce(
    (total, domainData) => total + (domainData.count || 0),
    0,
  );
}

async function incrementVisitInternal(domain, subpath = null) {
  const dateKey = getTodayKey();
  const timestamp = Date.now();

  return new Promise((resolve, reject) => {
    chrome.storage.local.get(['visits'], (data) => {
      if (chrome.runtime?.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      const visits = data.visits || {};

      // Initialize date if not exists
      if (!visits[dateKey]) {
        visits[dateKey] = {};
      }

      // Initialize domain if not exists
      if (!visits[dateKey][domain]) {
        visits[dateKey][domain] = {
          count: 0,
          lastVisit: timestamp,
          timestamps: [],
          subpaths: {},
        };
      }

      // Increment domain count
      visits[dateKey][domain].count += 1;
      visits[dateKey][domain].lastVisit = timestamp;

      // Store timestamp for time-window calculations
      if (!visits[dateKey][domain].timestamps) {
        visits[dateKey][domain].timestamps = [];
      }
      visits[dateKey][domain].timestamps.push(timestamp);
      if (visits[dateKey][domain].timestamps.length > MAX_TIMESTAMPS_PER_DOMAIN) {
        const trimmed = visits[dateKey][domain].timestamps.slice(-MAX_TIMESTAMPS_PER_DOMAIN);
        visits[dateKey][domain].timestamps = trimmed;
      }

      // Handle subpath if provided
      if (subpath) {
        if (!visits[dateKey][domain].subpaths[subpath]) {
          visits[dateKey][domain].subpaths[subpath] = {
            count: 0,
            lastVisit: timestamp,
          };
        }
        visits[dateKey][domain].subpaths[subpath].count += 1;
        visits[dateKey][domain].subpaths[subpath].lastVisit = timestamp;
      }

      // Compact history before write so write volume does not scale with unbounded history
      compactVisits(visits);

      // Save to storage — surface quota/lastError instead of silently resolving
      chrome.storage.local.set({ visits }, () => {
        if (chrome.runtime?.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        resolve(visits[dateKey][domain].count);
      });
    });
  });
}

/**
 * Increment visit count for a domain — serialized via internal queue to prevent lost updates
 * @param {string} domain - Domain name (e.g., "example.com")
 * @param {string} [subpath] - Optional subpath (e.g., "/page1")
 * @returns {Promise<number>} New count for domain
 */
export function incrementVisit(domain, subpath = null) {
  const task = () => incrementVisitInternal(domain, subpath);
  const result = writeQueue.then(task, task);
  // Keep queue flowing even if task rejects — swallow for queue continuity, caller still sees rejection via `result`
  writeQueue = result.catch(() => {});
  return result;
}

/**
 * Get limits configuration — normalizes legacy numeric limits at the getter boundary
 * @returns {Promise<Object>} Limits object with normalized configs
 */
export async function getLimits() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['limits'], (data) => {
      const raw = data.limits || {};
      const normalized = {};
      Object.entries(raw).forEach(([domain, cfg]) => {
        normalized[domain] = normalizeLimitConfig(cfg);
      });
      resolve(normalized);
    });
  });
}

/**
 * Get limit for a specific domain
 * @param {string} domain - Domain name
 * @returns {Promise<number|null>} Limit or null if unlimited
 */
export async function getLimitForDomain(domain) {
  const limits = await getLimits();
  return limits[domain] || null;
}

/**
 * Set limit for a domain
 * @param {string} domain - Domain name
 * @param {Object|null} limitConfig - Limit configuration object or null for unlimited
 * @param {boolean} limitConfig.enabled - Whether limits are enabled for this domain
 * @param {Object} limitConfig.fiveHour - 5-hour window limit config
 * @param {boolean} limitConfig.fiveHour.enabled - Whether 5-hour limit is enabled
 * @param {number} limitConfig.fiveHour.limit - Number of visits allowed in 5 hours
 * @param {Object} limitConfig.daily - Daily limit config
 * @param {boolean} limitConfig.daily.enabled - Whether daily limit is enabled
 * @param {number} limitConfig.daily.limit - Number of visits allowed per day
 * @returns {Promise<void>}
 */
export async function setLimitForDomain(domain, limitConfig) {
  const canonicalDomain = canonicalizeDomain(domain);
  return new Promise((resolve) => {
    chrome.storage.local.get(['limits'], (data) => {
      const limits = data.limits || {};

      // Remove a legacy www-prefixed key whenever this rule is edited.
      delete limits[domain];
      delete limits[`www.${canonicalDomain}`];
      if (limitConfig === null) {
        delete limits[canonicalDomain];
      } else {
        limits[canonicalDomain] = createDefaultLimitConfig(limitConfig);
      }

      chrome.storage.local.set({ limits }, resolve);
    });
  });
}

/**
 * Normalize legacy limit format to new format
 * Converts old number-based limits to new object-based format
 * @param {number|Object} limit - Legacy number or new object format
 * @returns {Object} Normalized limit configuration
 */
export function normalizeLimitConfig(limit) {
  // If already in new format, return as-is
  if (typeof limit === 'object' && limit !== null && limit.enabled !== undefined) {
    return createDefaultLimitConfig(limit);
  }

  // If legacy number format, convert to new format
  if (typeof limit === 'number') {
    return createDefaultLimitConfig({
      daily: { enabled: true, limit },
    });
  }

  // Default config
  return createDefaultLimitConfig();
}

/**
 * Delete all visit data and limits for a specific domain
 * @param {string} domain - Domain name to delete
 * @returns {Promise<void>}
 */
export async function deleteDomainData(domain) {
  if (!domain) return;

  return new Promise((resolve) => {
    chrome.storage.local.get(['visits', 'limits'], (data) => {
      const visits = data.visits || {};
      const limits = data.limits || {};

      Object.keys(visits).forEach((dateKey) => {
        if (visits[dateKey]?.[domain]) {
          delete visits[dateKey][domain];
          if (Object.keys(visits[dateKey]).length === 0) {
            delete visits[dateKey];
          }
        }
      });

      if (limits[domain]) {
        delete limits[domain];
      }

      chrome.storage.local.set({ visits, limits }, resolve);
    });
  });
}

/**
 * Get settings
 * @returns {Promise<Object>} Settings object
 */
export async function getSettings() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['settings', 'colorBlindMode'], (data) => {
      const settings = { ...(data.settings || defaultSettings) };
      const hasHcKey = Boolean(
        data.settings && Object.prototype.hasOwnProperty.call(data.settings, 'highContrastMode'),
      );
      // Legacy dashboard stored a top-level colorBlindMode flag.
      if (!hasHcKey && data.colorBlindMode) {
        settings.highContrastMode = true;
        chrome.storage.local.set({ settings }, () => {
          chrome.storage.local.remove('colorBlindMode', () => resolve(settings));
        });
        return;
      }
      resolve(settings);
    });
  });
}

/**
 * Update settings
 * @param {Object} newSettings - Settings to update
 * @returns {Promise<void>}
 */
export async function updateSettings(newSettings) {
  return new Promise((resolve) => {
    chrome.storage.local.get(['settings'], (data) => {
      const settings = { ...(data.settings || {}), ...newSettings };
      chrome.storage.local.set({ settings }, resolve);
    });
  });
}

/**
 * Read the domain→lat/lon lookup cache (pruned).
 * @returns {Promise<Object>}
 */
export async function getGeoLookupCache() {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get([GEO_CACHE_STORAGE_KEY], (data) => {
      if (chrome.runtime?.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      resolve(pruneGeoCacheEntries(data[GEO_CACHE_STORAGE_KEY] || {}));
    });
  });
}

async function putGeoLookupEntriesInternal(entries) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get([GEO_CACHE_STORAGE_KEY], (data) => {
      if (chrome.runtime?.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      const merged = {
        ...pruneGeoCacheEntries(data[GEO_CACHE_STORAGE_KEY] || {}),
        ...(entries || {}),
      };
      const next = pruneGeoCacheEntries(merged);
      chrome.storage.local.set({ [GEO_CACHE_STORAGE_KEY]: next }, () => {
        if (chrome.runtime?.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        resolve(next);
      });
    });
  });
}

/**
 * Merge entries into the geo lookup cache (serialized, lastError, TTL + size bound).
 * @param {Object} entries
 * @returns {Promise<Object>}
 */
export function putGeoLookupEntries(entries) {
  const task = () => putGeoLookupEntriesInternal(entries);
  const result = geoCacheQueue.then(task, task);
  geoCacheQueue = result.catch(() => {});
  return result;
}

/**
 * Remove all cached hostname coordinates.
 * @returns {Promise<void>}
 */
export async function clearGeoLookupCache() {
  return new Promise((resolve, reject) => {
    chrome.storage.local.set({ [GEO_CACHE_STORAGE_KEY]: {} }, () => {
      if (chrome.runtime?.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      resolve();
    });
  });
}

/**
 * Clear all data
 * @returns {Promise<void>}
 */
export async function clearAllData() {
  return new Promise((resolve) => {
    chrome.storage.local.clear(resolve);
  });
}

/**
 * Get visits within a date range
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {Promise<Object>} Aggregated visits
 */
export async function getVisitsInRange(startDate, endDate) {
  const visits = await getVisits();
  const result = {};

  // Generate all date keys in range (local)
  const currentDate = new Date(startDate);
  const end = new Date(endDate);
  currentDate.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  while (currentDate <= end) {
    const dateKey = getDateKey(currentDate);
    if (visits[dateKey]) {
      result[dateKey] = visits[dateKey];
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return result;
}

/**
 * Calculate "Focus Hero" badges for domains
 * A domain earns a badge if user stayed under limit for 3+ consecutive days
 * @returns {Promise<Object>} Object with domain names as keys and badge status
 */
export async function calculateFocusHeroBadges() {
  const visits = await getVisits();
  const limits = await getLimits();
  const badges = {};

  // Check last 7 days for each domain with a limit
  const today = new Date();
  const dateKeys = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today);
    date.setDate(date.getDate() - index);
    return getDateKey(date);
  });

  Object.keys(limits).forEach((domain) => {
    const normalizedLimit = normalizeLimitConfig(limits[domain]);

    if (!normalizedLimit.enabled || !normalizedLimit.daily.enabled) {
      return;
    }

    const dailyLimit = normalizedLimit.daily.limit;
    let consecutiveDaysUnderLimit = 0;

    // Check days in reverse chronological order
    dateKeys.some((dateKey) => {
      const dayVisits = visits[dateKey]?.[domain];
      const count = dayVisits ? dayVisits.count : 0;

      if (count <= dailyLimit) {
        consecutiveDaysUnderLimit += 1;
        return false;
      }

      return true; // streak broken
    });

    // Award badge if 3+ consecutive days under limit
    if (consecutiveDaysUnderLimit >= 3) {
      badges[domain] = {
        earned: true,
        streak: consecutiveDaysUnderLimit,
        earnedDate: getTodayKey(),
      };
    }
  });

  return badges;
}

/**
 * Get aggregated domain stats for a time range
 * @param {string} range - "hour" | "today" | "week" | "month"
 * @returns {Promise<Object>} Aggregated domain counts
 */
export async function getAggregatedStats(range = 'today') {
  const now = new Date();
  let startDate;

  switch (range) {
    case 'hour':
      startDate = new Date(now.getTime() - 60 * 60 * 1000);
      break;
    case 'today': {
      startDate = new Date(now);
      startDate.setHours(0, 0, 0, 0);
      break;
    }
    case 'week':
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case 'month':
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    default: {
      startDate = new Date(now);
      startDate.setHours(0, 0, 0, 0);
      break;
    }
  }

  const visits = await getVisits();
  const aggregated = aggregateVisitsInRange(visits, startDate, now);

  return aggregated;
}

/**
 * Calculate streak for staying under limits
 * @param {string} domain - Domain to check streak for
 * @returns {Promise<Object>} - Streak info {current: number, best: number, lastCheckDate: string}
 */
export async function calculateLimitStreak(domain) {
  const data = await chrome.storage.local.get(['visits', 'limits', 'streaks']);
  const visits = data.visits || {};
  const rawLimits = data.limits || {};
  const limits = Object.fromEntries(
    Object.entries(rawLimits).map(([d, cfg]) => [d, normalizeLimitConfig(cfg)]),
  );
  const streaks = data.streaks || {};

  const limitConfig = limits[domain];
  if (!limitConfig || !limitConfig.enabled || !limitConfig.daily?.enabled) {
    return { current: 0, best: 0, lastCheckDate: null };
  }

  const dailyLimit = limitConfig.daily.limit;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Get existing streak data
  const existingStreak = streaks[domain] || { current: 0, best: 0, lastCheckDate: null };

  // Check consecutive days of staying under limit
  let currentStreak = 0;
  const checkDate = new Date(today);

  for (let i = 0; i < 365; i += 1) {
    const dateKey = getDateKey(checkDate);
    const dayVisits = visits[dateKey]?.[domain]?.count || 0;

    if (dayVisits <= dailyLimit) {
      currentStreak += 1;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }

  const bestStreak = Math.max(currentStreak, existingStreak.best);

  // Save updated streak
  streaks[domain] = {
    current: currentStreak,
    best: bestStreak,
    lastCheckDate: getDateKey(today),
  };

  await chrome.storage.local.set({ streaks });

  return streaks[domain];
}

/**
 * Get all current streaks
 * @returns {Promise<Object>} - All streak data
 */
export async function getAllStreaks() {
  const data = await chrome.storage.local.get(['streaks']);
  return data.streaks || {};
}

/**
 * Pure helper: compute overall streak from in-memory data without touching storage.
 * Normalizes legacy limits internally so callers may pass raw limits.
 * @param {Object} visits - Visits object keyed by date
 * @param {Object} rawLimits - Limits object (raw or normalized)
 * @param {Object} existingStreak - Existing {current, best} for best comparison
 * @returns {Object} - Computed streak {current, best, lastCheckDate}
 */
export function computeOverallStreakFromData(visits = {}, rawLimits = {}, existingStreak = {}) {
  const normalizedLimits = Object.fromEntries(
    Object.entries(rawLimits || {}).map(([d, cfg]) => [d, normalizeLimitConfig(cfg)]),
  );
  const existing = existingStreak || { current: 0, best: 0 };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let currentStreak = 0;
  const checkDate = new Date(today);

  const limitEntries = Object.entries(normalizedLimits).filter(
    ([, limitConfig]) => limitConfig?.enabled && limitConfig.daily?.enabled,
  );

  for (let i = 0; i < 365; i += 1) {
    const dateKey = getDateKey(checkDate);
    const dayVisits = visits[dateKey] || {};

    const allLimitsRespected = limitEntries.every(([domain, limitConfig]) => {
      const visitCount = dayVisits[domain]?.count || 0;
      return visitCount <= limitConfig.daily.limit;
    });

    if (allLimitsRespected && limitEntries.length > 0) {
      currentStreak += 1;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }

  const bestStreak = Math.max(currentStreak, existing.best || 0);

  return {
    current: currentStreak,
    best: bestStreak,
    lastCheckDate: getDateKey(today),
  };
}

// Alias required by 3.2 acceptance — same pure helper under canonical name
export const computeOverallStreak = computeOverallStreakFromData;

/**
 * Calculate overall focus streak (days staying under ALL limits)
 * Memoized: only writes to storage when current/best actually changed.
 * @returns {Promise<Object>} - Overall streak {current: number, best: number, lastCheckDate: string}
 */
export async function calculateOverallStreak() {
  /* eslint-disable implicit-arrow-linebreak, function-paren-newline */
  const data = await new Promise((resolve) => {
    chrome.storage.local.get(['visits', 'limits', 'overallStreak'], (result) =>
      resolve(result || {}),
    );
  });
  /* eslint-enable implicit-arrow-linebreak, function-paren-newline */
  const visits = data.visits || {};
  const rawLimits = data.limits || {};
  const existingStreak = data.overallStreak || { current: 0, best: 0 };

  const computed = computeOverallStreakFromData(visits, rawLimits, existingStreak);

  if (computed.current !== existingStreak.current || computed.best !== existingStreak.best) {
    await new Promise((resolve) => {
      chrome.storage.local.set({ overallStreak: computed }, () => resolve());
    });
  }

  return computed;
}
