/**
 * FocusPaw Focus-Switch Tracking Module
 * Monitors tab activation and updates to track focus switches
 */

import { incrementVisit } from './storage.js';
import { checkLimit, getBlockedPageUrl } from './limits.js';
import { updateVisitBadge } from './badge.js';
import { checkLimitWarnings, showAchievementUnlocked } from './notifications.js';
import { checkAchievements } from './achievements.js';
import { canonicalizeDomain } from '../common/domain-utils.js';

/**
 * Extract domain and subpath from URL
 * @param {string} url - Full URL
 * @returns {{domain: string, subpath: string}|null} Parsed URL parts or null
 */
export function parseUrl(url) {
  try {
    // Skip non-http(s) URLs
    if (!url || (!url.startsWith('http://') && !url.startsWith('https://'))) {
      return null;
    }

    const urlObj = new URL(url);

    const domain = canonicalizeDomain(urlObj.hostname);

    // Skip localhost and 127.0.0.1
    if (domain === 'localhost' || domain === '127.0.0.1') {
      return null;
    }

    // Extract subpath (path without query string or hash)
    const subpath = urlObj.pathname;

    return { domain, subpath };
  } catch (error) {
    console.error('Error parsing URL:', url, error);
    return null;
  }
}

/**
 * Track that user focused on a specific tab
 * @param {number} tabId - Chrome tab ID
 */
async function trackTabFocus(tabId) {
  try {
    // Get tab details
    const tab = await chrome.tabs.get(tabId);

    // Parse URL
    const parsed = parseUrl(tab.url);
    if (!parsed) {
      return; // Skip non-trackable URLs
    }

    const { domain, subpath } = parsed;

    // Increment visit count
    const newCount = await incrementVisit(domain, subpath);

    console.log(`Focus switch recorded: ${domain}${subpath} (count: ${newCount})`);

    // Update visit counter badge
    await updateVisitBadge();

    // DNR rules are installed after storage changes, so immediately redirect the
    // threshold-triggering tab as well (including SPA navigations).
    const limitStatus = await checkLimit(domain);
    if (limitStatus.exceeded) {
      const currentTab = await chrome.tabs.get(tabId);
      const currentUrl = parseUrl(currentTab.url);
      if (currentUrl?.domain === domain) {
        await chrome.tabs.update(tabId, {
          url: getBlockedPageUrl(
            domain,
            limitStatus.count,
            limitStatus.limit,
            limitStatus.limitType,
            limitStatus.oldestTimestamp,
          ),
        });
      }
      return;
    }

    // Check if this domain has a limit and show countdown toast
    await showCountdownToastIfNeeded(tabId, domain, limitStatus);

    // Check for limit warnings (when close to limit)
    await checkLimitWarnings(domain, newCount);

    // Check for newly unlocked achievements
    const newlyUnlocked = await checkAchievements();
    if (newlyUnlocked.length > 0) {
      console.log('[Tracking] New achievements unlocked:', newlyUnlocked);
      // Show notification for the first unlocked achievement
      await showAchievementUnlocked(newlyUnlocked[0]);
    }

    // Blocking rules are refreshed by the chrome.storage.onChanged listener in
    // limits.js, which fires whenever visits/limits are written. No need for an
    // explicit per-visit call here.
  } catch (error) {
    // Tab might have been closed or URL inaccessible
    console.debug('Could not track tab:', error.message);
  }
}

/**
 * Show countdown toast if domain has a limit
 * @param {number} tabId - Chrome tab ID
 * @param {string} domain - Domain name
 * @param {number} currentCount - Current visit count
 */
async function showCountdownToastIfNeeded(tabId, domain, status = null) {
  try {
    const limitStatus = status || (await checkLimit(domain));

    // Only show toast if domain has a limit
    if (!limitStatus.limit || !limitStatus.limitType) {
      return;
    }

    const isFiveHourLimit = limitStatus.limitType === 'fiveHour';
    const relevantCount = isFiveHourLimit ? limitStatus.fiveHourCount : limitStatus.dailyCount;
    const remaining = Math.max(0, limitStatus.limit - relevantCount);

    // Send message to content script to show toast
    await chrome.tabs.sendMessage(tabId, {
      type: 'SHOW_COUNTDOWN_TOAST',
      domain,
      remaining,
      limit: limitStatus.limit,
      limitType: limitStatus.limitType,
      fiveHourCount: limitStatus.fiveHourCount,
      dailyCount: limitStatus.dailyCount,
    });
  } catch (error) {
    // Content script might not be injected yet or tab doesn't support it
    console.debug('Could not show countdown toast:', error.message);
  }
}

/**
 * Initialize tab event listeners
 */
export function initializeTracking() {
  console.log('Initializing focus-switch tracking...');

  // Track when user switches to a different tab
  chrome.tabs.onActivated.addListener(({ tabId }) => {
    console.log('Tab activated:', tabId);
    trackTabFocus(tabId);
  });

  // Track when tab URL changes (navigation within tab)
  chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    // Only track when URL actually changes and tab is active
    if (changeInfo.url && tab.active) {
      console.log('Tab updated with new URL:', tabId, changeInfo.url);
      trackTabFocus(tabId);
    }
  });

  console.log('Focus-switch tracking initialized');
}

/**
 * Get current active tab and track it
 * Useful for initial extension load
 */
export async function trackCurrentTab() {
  try {
    const [activeTab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });

    if (activeTab) {
      await trackTabFocus(activeTab.id);
    }
  } catch (error) {
    console.error('Error tracking current tab:', error);
  }
}
