/**
 * FocusPaw Limits Enforcement Module
 * Handles per-site time-based limits (5-hour and daily) and blocking
 */

import { getTodayKey, normalizeLimitConfig } from './storage.js';
import { canonicalizeDomain } from '../common/domain-utils.js';

// One rolling 5-hour window used for the per-window visit counter.
const FIVE_HOURS_MS = 5 * 60 * 60 * 1000;

function getNextActiveLimit(normalizedConfig, fiveHourCount, dailyCount) {
  const candidates = [];
  if (normalizedConfig.fiveHour.enabled) {
    candidates.push({
      type: 'fiveHour',
      limit: normalizedConfig.fiveHour.limit,
      count: fiveHourCount,
      remaining: normalizedConfig.fiveHour.limit - fiveHourCount,
    });
  }
  if (normalizedConfig.daily.enabled) {
    candidates.push({
      type: 'daily',
      limit: normalizedConfig.daily.limit,
      count: dailyCount,
      remaining: normalizedConfig.daily.limit - dailyCount,
    });
  }

  if (candidates.length === 0) {
    return null;
  }

  candidates.sort((a, b) => a.remaining - b.remaining);
  return candidates[0];
}

/**
 * Count visits within a time window
 * @param {Array<number>} timestamps - Array of visit timestamps
 * @param {number} windowMs - Time window in milliseconds
 * @returns {number} Number of visits within the window
 */
function countVisitsInWindow(timestamps, windowMs) {
  if (!timestamps || !Array.isArray(timestamps)) {
    return 0;
  }

  const now = Date.now();
  const windowStart = now - windowMs;

  return timestamps.filter((ts) => ts >= windowStart).length;
}

/**
 * Get the oldest timestamp in a time window (for calculating when limit resets)
 * @param {Array<number>} timestamps - Array of visit timestamps
 * @param {number} windowMs - Time window in milliseconds
 * @returns {number|null} Oldest timestamp in the window, or null if no visits
 */
function getOldestTimestampInWindow(timestamps, windowMs) {
  if (!timestamps || !Array.isArray(timestamps) || timestamps.length === 0) {
    return null;
  }

  const now = Date.now();
  const windowStart = now - windowMs;

  const visitsInWindow = timestamps.filter((ts) => ts >= windowStart);
  if (visitsInWindow.length === 0) {
    return null;
  }

  return Math.min(...visitsInWindow);
}

/**
 * Check if domain has exceeded its limits (5-hour or daily)
 * @param {string} domain - Domain name
 * @returns {Promise<{
 *   exceeded: boolean,
 *   count: number,
 *   limit: number|null,
 *   limitType: string|null,
 *   fiveHourCount: number,
 *   dailyCount: number,
 *   oldestTimestamp?: number|null,
 * }>}
 */
export async function checkLimit(domain) {
  const canonicalDomain = canonicalizeDomain(domain);
  return new Promise((resolve) => {
    chrome.storage.local.get(['visits', 'limits'], (data) => {
      const visits = data.visits || {};
      const limits = data.limits || {};

      const todayKey = getTodayKey();
      const todayVisits = visits[todayKey] || {};
      const domainVisits = todayVisits[canonicalDomain] || todayVisits[domain];
      const dailyCount = domainVisits ? domainVisits.count : 0;
      const timestamps = domainVisits ? domainVisits.timestamps || [] : [];

      let limitConfig = limits[canonicalDomain] || limits[`www.${canonicalDomain}`];

      // No limit set = unlimited
      if (!limitConfig) {
        resolve({
          exceeded: false,
          count: dailyCount,
          limit: null,
          limitType: null,
          fiveHourCount: 0,
          dailyCount,
        });
        return;
      }

      // Normalize legacy format
      limitConfig = normalizeLimitConfig(limitConfig);

      // If limits are globally disabled for this domain
      if (!limitConfig.enabled) {
        resolve({
          exceeded: false,
          count: dailyCount,
          limit: null,
          limitType: null,
          fiveHourCount: 0,
          dailyCount,
        });
        return;
      }

      // Check 5-hour window limit
      const fiveHourCount = countVisitsInWindow(timestamps, FIVE_HOURS_MS);

      if (limitConfig.fiveHour.enabled && fiveHourCount >= limitConfig.fiveHour.limit) {
        resolve({
          exceeded: true,
          count: fiveHourCount,
          limit: limitConfig.fiveHour.limit,
          limitType: 'fiveHour',
          fiveHourCount,
          dailyCount,
          oldestTimestamp: getOldestTimestampInWindow(timestamps, FIVE_HOURS_MS),
        });
        return;
      }

      // Check daily limit
      if (limitConfig.daily.enabled && dailyCount >= limitConfig.daily.limit) {
        resolve({
          exceeded: true,
          count: dailyCount,
          limit: limitConfig.daily.limit,
          limitType: 'daily',
          fiveHourCount,
          dailyCount,
        });
        return;
      }

      const nextLimit = getNextActiveLimit(limitConfig, fiveHourCount, dailyCount);

      // No limits exceeded
      resolve({
        exceeded: false,
        count: nextLimit ? nextLimit.count : dailyCount,
        limit: nextLimit ? nextLimit.limit : null,
        limitType: nextLimit ? nextLimit.type : null,
        fiveHourCount,
        dailyCount,
      });
    });
  });
}

/**
 * Get blocked page URL with params
 * @param {string} domain - Domain name
 * @param {number} count - Current visit count
 * @param {number} limit - Visit limit
 * @param {string} limitType - Type of limit exceeded ('fiveHour' or 'daily')
 * @param {number|null} oldestTimestamp - Oldest timestamp in 5-hour window (optional, for 5-hour limits)
 * @returns {string} Blocked page URL
 */
export function getBlockedPageUrl(
  domain,
  count,
  limit,
  limitType = 'daily',
  oldestTimestamp = null,
) {
  const blockedPageUrl = chrome.runtime.getURL('src/blocked/blocked.html');
  const params = new URLSearchParams({
    domain,
    count: count.toString(),
    limit: limit.toString(),
    limitType,
  });

  // Include oldest timestamp for 5-hour limits so we can calculate exact reset time
  if (limitType === 'fiveHour' && oldestTimestamp) {
    params.set('oldestTimestamp', oldestTimestamp.toString());
  }

  return `${blockedPageUrl}?${params.toString()}`;
}

/**
 * Check whether the user has granted the optional <all_urls> host permission.
 * Without it, DNR redirect rules that touch arbitrary origins cannot be installed.
 * @returns {Promise<boolean>}
 */
export async function hasHostAccess() {
  if (!chrome.permissions || !chrome.permissions.contains) return true;
  try {
    return await chrome.permissions.contains({ origins: ['<all_urls>'] });
  } catch (error) {
    console.debug('[Limits] permissions.contains failed; assuming granted', error);
    return true;
  }
}

/**
 * Update declarativeNetRequest rules based on current limits and visit counts
 * This replaces the blocking webRequest API which is deprecated in MV3
 */
export async function updateBlockingRules() {
  try {
    // DNR redirect rules need host access; bail out cleanly if the user has not
    // granted the optional <all_urls> permission yet. Tracking & toasts still work.
    if (!(await hasHostAccess())) {
      console.debug('[Limits] host permission not granted; skipping DNR rule install');
      return;
    }
    const data = await chrome.storage.local.get(['visits', 'limits']);
    const visits = data.visits || {};
    const limits = data.limits || {};
    const todayKey = getTodayKey();
    const todayVisits = visits[todayKey] || {};

    const escapeForRegex = (domain) => domain.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    // Get all currently blocked domains
    const blockedDomains = [];

    Object.entries(limits).forEach(([storedDomain, limitConfig]) => {
      const domain = canonicalizeDomain(storedDomain);
      const domainVisits = todayVisits[domain] || todayVisits[storedDomain];
      const dailyCount = domainVisits ? domainVisits.count : 0;
      const timestamps = domainVisits ? domainVisits.timestamps || [] : [];

      // Normalize legacy format
      const normalizedConfig = normalizeLimitConfig(limitConfig);

      // Skip if limits are disabled
      if (!normalizedConfig.enabled) {
        console.debug('[Limits] Skipping disabled limit', { domain });
        return;
      }

      // Check 5-hour window
      const fiveHourCount = countVisitsInWindow(timestamps, FIVE_HOURS_MS);

      if (normalizedConfig.fiveHour.enabled && fiveHourCount >= normalizedConfig.fiveHour.limit) {
        const oldestTimestamp = getOldestTimestampInWindow(timestamps, FIVE_HOURS_MS);
        console.info('[Limits] Blocking domain due to 5h limit', {
          domain,
          fiveHourCount,
          fiveHourLimit: normalizedConfig.fiveHour.limit,
          oldestTimestamp,
        });
        blockedDomains.push({
          domain,
          count: fiveHourCount,
          limit: normalizedConfig.fiveHour.limit,
          limitType: 'fiveHour',
          oldestTimestamp,
        });
        return;
      }

      // Check daily limit
      if (normalizedConfig.daily.enabled && dailyCount >= normalizedConfig.daily.limit) {
        console.info('[Limits] Blocking domain due to daily limit', {
          domain,
          dailyCount,
          dailyLimit: normalizedConfig.daily.limit,
        });
        blockedDomains.push({
          domain,
          count: dailyCount,
          limit: normalizedConfig.daily.limit,
          limitType: 'daily',
        });
      } else {
        console.debug('[Limits] Domain under limits', {
          domain,
          dailyCount,
          dailyLimit: normalizedConfig.daily.limit,
          fiveHourCount,
          fiveHourLimit: normalizedConfig.fiveHour.limit,
        });
      }
    });

    // Store blocked domains info in storage for the blocked page to access
    // This is a fallback in case URL parameters don't work properly
    const blockedDomainsMap = {};
    blockedDomains.forEach((item) => {
      blockedDomainsMap[item.domain] = {
        count: item.count,
        limit: item.limit,
        limitType: item.limitType,
        blockedAt: Date.now(),
      };
    });
    await chrome.storage.local.set({ blockedDomains: blockedDomainsMap });

    // Get existing rule IDs to remove them
    const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
    const ruleIdsToRemove = existingRules.map((rule) => rule.id);

    // Create new rules for blocked domains (cover root + any subdomain)
    const regexRules = blockedDomains.map((item, index) => {
      const blockedPageUrl = getBlockedPageUrl(
        item.domain,
        item.count,
        item.limit,
        item.limitType,
        item.oldestTimestamp,
      );
      const escapedDomain = escapeForRegex(item.domain);
      const regexFilter = `^https?://([^/]*\\.)?${escapedDomain}/`;

      console.debug('[Limits] Building regex rule', { domain: item.domain, regexFilter });

      return {
        id: index + 1, // Rule IDs must be positive integers
        priority: 1,
        action: {
          type: 'redirect',
          redirect: { url: blockedPageUrl },
        },
        condition: {
          regexFilter,
          resourceTypes: ['main_frame'],
        },
      };
    });

    // Provide explicit urlFilter fallbacks for host and www host
    const explicitHostRules = blockedDomains.flatMap((item, index) => {
      const blockedPageUrl = getBlockedPageUrl(
        item.domain,
        item.count,
        item.limit,
        item.limitType,
        item.oldestTimestamp,
      );
      return [
        {
          id: 10000 + index + 1,
          priority: 1,
          action: {
            type: 'redirect',
            redirect: { url: blockedPageUrl },
          },
          condition: {
            urlFilter: `*://${item.domain}/*`,
            resourceTypes: ['main_frame'],
          },
        },
        {
          id: 20000 + index + 1,
          priority: 1,
          action: {
            type: 'redirect',
            redirect: { url: blockedPageUrl },
          },
          condition: {
            urlFilter: `*://www.${item.domain}/*`,
            resourceTypes: ['main_frame'],
          },
        },
      ];
    });

    const allNewRules = [...regexRules, ...explicitHostRules];

    // Update dynamic rules
    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: ruleIdsToRemove,
      addRules: allNewRules,
    });

    console.log(`Updated blocking rules: ${blockedDomains.length} domains blocked`);
    console.log('Blocked domains stored:', Object.keys(blockedDomainsMap));
  } catch (error) {
    console.error('Error updating blocking rules:', error);
  }
}

/**
 * Initialize limit enforcement via declarativeNetRequest
 */
export function initializeLimitEnforcement() {
  // Update blocking rules on startup
  updateBlockingRules();

  console.log('Limit enforcement initialized (using declarativeNetRequest)');

  // Recompute rules whenever visits or limits change
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;
    if (changes.visits || changes.limits) {
      updateBlockingRules();
    }
  });
}
