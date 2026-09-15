import { getTodayKey, normalizeLimitConfig } from '../background/storage.js';
import { getNextMidnight } from '../common/date-utils.js';

/**
 * FocusPaw Blocked Page Script
 */

// Playful message variations - brand-aligned (supportive, not shameful)
const messages = [
  {
    heading: 'Whoa there, friend!',
    subtext: "Maybe it's time for a breather? Your focus bear thinks so.",
  },
  {
    heading: 'Hold up!',
    subtext: 'Your brain deserves a break from this rabbit hole. How about a walk?',
  },
  {
    heading: 'Limit reached!',
    subtext: "You set this limit for a reason. Future you says 'thank you!'",
  },
  {
    heading: 'Nope, not today!',
    subtext: 'This site has had enough of your time today. Go do something awesome!',
  },
  {
    heading: 'Bear wall activated!',
    subtext: "Time to redirect that focus energy elsewhere. You've got this!",
  },
  {
    heading: 'Your limit, your rules!',
    subtext: "You decided this boundary. Stick with it—you'll thank yourself later.",
  },
];

// Get domain from URL params
const urlParams = new URLSearchParams(window.location.search);
let domain = urlParams.get('domain') || null;
let count = urlParams.get('count') || null;
let limit = urlParams.get('limit') || null;
let limitType = urlParams.get('limitType') || 'daily';
const oldestTimestamp = urlParams.get('oldestTimestamp')
  ? parseInt(urlParams.get('oldestTimestamp'), 10)
  : null;

// Fetch data from storage if URL params are missing
async function loadBlockedPageData() {
  try {
    const data = await chrome.storage.local.get(['visits', 'limits', 'settings', 'blockedDomains']);

    // If we don't have domain from URL, try to detect it from referrer or storage
    if (!domain) {
      // Try to get from document.referrer
      if (document.referrer) {
        try {
          const referrerUrl = new URL(document.referrer);
          domain = referrerUrl.hostname.replace(/^www\./, '');
        } catch {
          domain = 'this site';
        }
      } else {
        domain = 'this site';
      }
    }

    // First, try to get data from blockedDomains storage (most reliable)
    const blockedDomains = data.blockedDomains || {};
    if (blockedDomains[domain]) {
      console.log('Found blocked domain info in storage:', blockedDomains[domain]);
      if (!count || count === '?') {
        count = blockedDomains[domain].count;
      }
      if (!limit || limit === '?') {
        limit = blockedDomains[domain].limit;
      }
      if (blockedDomains[domain].limitType) {
        limitType = blockedDomains[domain].limitType;
      }
    }

    // Fallback to visits and limits if still not found
    if (!count || count === '?' || !limit || limit === '?') {
      const visits = data.visits || {};
      const limits = data.limits || {};
      const todayKey = getTodayKey();
      const todayVisits = visits[todayKey] || {};

      if (!count || count === '?') {
        const domainVisits = todayVisits[domain];
        count = domainVisits ? domainVisits.count : 0;
      }

      if (!limit || limit === '?') {
        const limitConfig = limits[domain] ? normalizeLimitConfig(limits[domain]) : null;
        if (limitConfig) {
          if (limitType === 'fiveHour' && limitConfig.fiveHour.enabled) {
            limit = limitConfig.fiveHour.limit;
          } else if (limitConfig.daily.enabled) {
            limit = limitConfig.daily.limit;
            limitType = 'daily';
          } else if (limitConfig.fiveHour.enabled) {
            limit = limitConfig.fiveHour.limit;
            limitType = 'fiveHour';
          } else {
            limit = '?';
          }
        } else {
          limit = '?';
        }
      }
    }

    // Select random message
    const randomMessage = messages[Math.floor(Math.random() * messages.length)];

    // Update page content
    document.getElementById('page-heading').textContent = randomMessage.heading;
    document.getElementById('subtext').textContent = randomMessage.subtext;
    document.getElementById('domain-name').textContent = domain;
    document.getElementById('visit-count').textContent = count;
    document.getElementById('limit-value').textContent = limit;

    // Update limit type text
    const limitTypeText = limitType === 'fiveHour' ? '5-hour window' : 'daily';
    document.getElementById('limit-type').textContent = limitTypeText;
  } catch (error) {
    console.error('Error loading blocked page data:', error);
    // Fallback to defaults
    document.getElementById('page-heading').textContent = messages[0].heading;
    document.getElementById('subtext').textContent = messages[0].subtext;
    document.getElementById('domain-name').textContent = domain || 'this site';
    document.getElementById('visit-count').textContent = count || '?';
    document.getElementById('limit-value').textContent = limit || '?';
  }
}

/**
 * Calculate time until limit resets
 * For 5-hour limits: time until oldest visit in window + 5 hours
 * For daily limits: time until midnight
 */
function calculateTimeUntilReset() {
  if (limitType === 'fiveHour' && oldestTimestamp) {
    // For 5-hour window, reset is 5 hours after the oldest visit in the window
    const fiveHourMs = 5 * 60 * 60 * 1000;
    const resetTime = oldestTimestamp + fiveHourMs;
    return resetTime;
  }
  if (limitType === 'fiveHour') {
    // Fallback if oldestTimestamp is not available: estimate as 5 hours from now
    const now = new Date();
    const resetTime = new Date(now.getTime() + 5 * 60 * 60 * 1000);
    return resetTime.getTime();
  }
  // For daily limit, reset is at local midnight (same as storage)
  return getNextMidnight().getTime();
}

/**
 * Format a reset timestamp as a local time string (e.g. 12:00 AM)
 * @param {number} ts - milliseconds
 * @returns {string}
 */
function formatResetTime(ts) {
  return new Date(ts).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

/**
 * Update countdown timer showing time until limit resets
 * Supports both 5-hour window and daily limits
 */
function updateCountdownTimer() {
  const now = Date.now();
  const resetTime = calculateTimeUntilReset();
  const timeRemaining = resetTime - now;

  // Handle edge case where time has already passed
  if (timeRemaining < 0) {
    document.getElementById('countdown-hours').textContent = '00';
    document.getElementById('countdown-minutes').textContent = '00';
    document.getElementById('countdown-seconds').textContent = '00';
    return;
  }

  const hours = Math.floor((timeRemaining / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((timeRemaining / (1000 * 60)) % 60);
  const seconds = Math.floor((timeRemaining / 1000) % 60);

  // Format with leading zeros
  const formatTime = (num) => String(num).padStart(2, '0');

  document.getElementById('countdown-hours').textContent = formatTime(hours);
  document.getElementById('countdown-minutes').textContent = formatTime(minutes);
  document.getElementById('countdown-seconds').textContent = formatTime(seconds);

  // Show actual reset time alongside countdown (F-UX-003)
  const resetTimeStr = formatResetTime(resetTime);
  const sublabelEl = document.getElementById('countdown-sublabel');
  if (limitType === 'fiveHour') {
    sublabelEl.textContent = `resets at ${resetTimeStr} (5-hour window)`;
  } else {
    sublabelEl.textContent = `until midnight (${resetTimeStr})`;
  }
  const footerEl = document.getElementById('reset-footer');
  if (footerEl) {
    if (limitType === 'fiveHour') {
      footerEl.textContent = `Resets at ${resetTimeStr} — 5 hours after your oldest visit. You got this!`;
    } else {
      footerEl.textContent = `Resets at midnight (${resetTimeStr}). You got this!`;
    }
  }
}

// Load data when page loads
loadBlockedPageData();

// Start countdown timer and update every second
updateCountdownTimer();
setInterval(updateCountdownTimer, 1000);

const container = document.querySelector('.container');
const settingsHelp = document.createElement('section');
settingsHelp.id = 'settings-help';
settingsHelp.className = 'settings-help';
settingsHelp.setAttribute('role', 'status');
settingsHelp.hidden = true;
settingsHelp.tabIndex = -1;

const helpTitle = document.createElement('p');
helpTitle.className = 'settings-help-title';
helpTitle.textContent = 'To adjust limits:';

const instructionsList = document.createElement('ol');
[
  'Click the FocusPaw icon in your toolbar',
  'Click the settings button',
  'Configure your limits',
].forEach((instruction) => {
  const listItem = document.createElement('li');
  listItem.textContent = instruction;
  instructionsList.appendChild(listItem);
});

const alternateInstruction = document.createElement('p');
alternateInstruction.className = 'settings-help-alt';
alternateInstruction.textContent = 'Or right-click the FocusPaw icon and select "Options".';

settingsHelp.append(helpTitle, instructionsList, alternateInstruction);
container.appendChild(settingsHelp);

// Back button - close tab or go to new tab page
document.getElementById('back-btn').addEventListener('click', () => {
  window.close();
  // If window.close() doesn't work (not opened by script), redirect
  setTimeout(() => {
    window.location.href = 'about:blank';
  }, 100);
});

document.getElementById('settings-btn').addEventListener('click', () => {
  if (settingsHelp.hidden) {
    settingsHelp.hidden = false;
    settingsHelp.focus();
    settingsHelp.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
});
