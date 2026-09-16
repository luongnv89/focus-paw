/**
 * Shared visualization controller used by both the popup and dashboard views
 */

import { renderRadialGraph } from '../popup/graph.js';
import { isFeatureEnabled } from './feature-flags.js';
import {
  updateSettings,
  getLimits,
  setLimitForDomain,
  clearAllData,
  calculateFocusHeroBadges,
  normalizeLimitConfig,
  createDefaultLimitConfig,
} from '../background/storage.js';
import { updateBlockingRules } from '../background/limits.js';
import { getTodayKey, aggregateVisitsInRange } from './date-utils.js';
import { validateLimitConfig, validateDomain } from './limit-validation.js';
import { csvRow } from './csv-escape.js';
import { ensureBlockingHostPermission } from './blocking-permission.js';
import { initMapViewTabs, bindMapChrome, updateMapView } from '../dashboard/map-view.js';

// "Near limit" threshold: 80% of a configured limit triggers the near-limit warning.
const NEAR_LIMIT_THRESHOLD = 0.8;

/**
 * Load aggregated stats for a given time range
 * Recreates the getAggregatedStats function from storage.js for use in the UI
 * @param {string} range
 * @returns {Promise<Object>}
 */
export async function loadAggregatedStats(range = 'today') {
  const now = new Date();
  let startDate;

  switch (range) {
    case 'hour':
      startDate = new Date(now.getTime() - 60 * 60 * 1000);
      break;
    case 'today': {
      const today = new Date(now);
      today.setHours(0, 0, 0, 0);
      startDate = today;
      break;
    }
    case 'week':
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case 'month':
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    default: {
      const today = new Date(now);
      today.setHours(0, 0, 0, 0);
      startDate = today;
      break;
    }
  }

  const data = await chrome.storage.local.get(['visits']);
  const visits = data.visits || {};
  return aggregateVisitsInRange(visits, startDate, now);
}

function getTitleForRange(range) {
  const titles = {
    hour: "Last Hour's Focus Switches",
    today: "Today's Focus Switches",
    week: "This Week's Focus Switches",
    month: "This Month's Focus Switches",
  };
  return titles[range] || "Today's Focus Switches";
}

/**
 * Show or hide a node. Chromium maps [hidden] to `display: none !important`,
 * so toggling only `style.display` cannot reveal elements that use the
 * HTML `hidden` attribute (popup empty-state/content/list/quick-limits).
 * Keep `style.display` in sync for dashboard nodes that start as inline none.
 * @param {HTMLElement|null} el
 * @param {boolean} shown
 * @param {string} [displayWhenShown='block']
 */
function setShown(el, shown, displayWhenShown = 'block') {
  if (!el) return;
  el.hidden = !shown;
  el.style.display = shown ? displayWhenShown : 'none';
}

/**
 * Load previous period data for comparison
 * @param {string} range - Current time range
 * @returns {Promise<Object>} - Previous period aggregated data
 */
async function loadPreviousPeriodData(range) {
  const now = new Date();
  let startDate;
  let endDate;

  switch (range) {
    case 'hour': {
      endDate = new Date(now.getTime() - 60 * 60 * 1000);
      startDate = new Date(endDate.getTime() - 60 * 60 * 1000);
      break;
    }
    case 'today': {
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);
      startDate = yesterday;
      endDate = new Date(yesterday);
      endDate.setHours(23, 59, 59, 999);
      break;
    }
    case 'week': {
      endDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    }
    case 'month': {
      endDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    }
    default: {
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);
      startDate = yesterday;
      endDate = new Date(yesterday);
      endDate.setHours(23, 59, 59, 999);
      break;
    }
  }

  const data = await chrome.storage.local.get(['visits']);
  const visits = data.visits || {};
  return aggregateVisitsInRange(visits, startDate, endDate);
}

/**
 * Generate insights summary text from aggregated data
 * @param {Object} aggregatedData - Domain visit data
 * @param {Object} limits - User-configured limits
 * @param {string} range - Time range (today/week/month)
 * @param {Object} previousData - Previous period data for comparison
 * @returns {string} - Natural language summary
 */
function generateInsightsSummary(aggregatedData, limits, range, previousData = null) {
  const domains = Object.entries(aggregatedData);

  if (domains.length === 0) {
    return 'No data to analyze yet. Start browsing to see insights!';
  }

  // Sort by visit count
  const sorted = domains
    .map(([domain, data]) => ({ domain, count: data.count }))
    .sort((a, b) => b.count - a.count);

  // Get top 3 domains
  const top3 = sorted.slice(0, 3);

  // Count domains over limit (checking both daily and 5-hour limits)
  let overLimitCount = 0;
  let nearLimitCount = 0;

  // Helper to count visits in last 5 hours
  const FIVE_HOUR_MS = 5 * 60 * 60 * 1000;
  const fiveHoursAgo = Date.now() - FIVE_HOUR_MS;

  Object.entries(limits).forEach(([domain, limitConfig]) => {
    if (!limitConfig || !limitConfig.enabled) return;

    const domainData = aggregatedData[domain];
    if (!domainData) return;

    const todayCount = domainData.count || 0;

    // Check 5-hour limit
    const fiveHourLimit = limitConfig.fiveHour?.enabled ? limitConfig.fiveHour.limit : null;
    let fiveHourCount = 0;
    if (fiveHourLimit && domainData.timestamps) {
      fiveHourCount = domainData.timestamps.filter((t) => t >= fiveHoursAgo).length;
    }

    // Check daily limit
    const dailyLimit = limitConfig.daily?.enabled ? limitConfig.daily?.limit : null;

    // Determine if over or near limit (check both)
    const overFiveHour = fiveHourLimit && fiveHourCount >= fiveHourLimit;
    const overDaily = dailyLimit && todayCount >= dailyLimit;
    const nearFiveHour = fiveHourLimit && fiveHourCount >= fiveHourLimit * NEAR_LIMIT_THRESHOLD;
    const nearDaily = dailyLimit && todayCount >= dailyLimit * NEAR_LIMIT_THRESHOLD;

    if (overFiveHour || overDaily) {
      overLimitCount += 1;
    } else if (nearFiveHour || nearDaily) {
      nearLimitCount += 1;
    }
  });

  // Build summary text
  const parts = [];

  // Range prefix
  const rangeLabels = {
    hour: 'in the last hour',
    today: 'today',
    week: 'this week',
    month: 'this month',
  };
  const rangeText = rangeLabels[range] || 'today';

  // Top distractions
  if (top3.length > 0) {
    const topList = top3.map((d) => `${d.domain} (${d.count} visits)`).join(', ');
    const distractionsLabel = top3.length === 1 ? 'distraction' : 'distractions';
    parts.push(`Your top ${distractionsLabel} ${rangeText}: ${topList}`);
  }

  // Limit status
  if (overLimitCount > 0) {
    const domainLabel = overLimitCount === 1 ? 'domain' : 'domains';
    parts.push(`You exceeded limits on ${overLimitCount} ${domainLabel}`);
  } else if (nearLimitCount > 0) {
    const domainLabel = nearLimitCount === 1 ? 'domain' : 'domains';
    parts.push(`You're approaching limits on ${nearLimitCount} ${domainLabel}`);
  } else if (Object.keys(limits).length > 0) {
    parts.push('All limits under control');
  }

  // Total domains
  const totalDomains = domains.length;
  const totalVisits = sorted.reduce((sum, d) => sum + d.count, 0);

  // Add comparison insights if previous data available
  if (previousData) {
    const previousTotalVisits = Object.values(previousData).reduce(
      (sum, d) => sum + (d.count || 0),
      0,
    );
    const visitChange = totalVisits - previousTotalVisits;
    const hasPreviousVisits = previousTotalVisits > 0;
    const changePercent = hasPreviousVisits
      ? Math.round((visitChange / previousTotalVisits) * 100)
      : 0;

    if (visitChange > 0) {
      const prefix = changePercent > 0 ? '+' : '';
      const warningText = [
        `${visitChange} more visits (${prefix}${changePercent}%)`,
        'than previous period',
      ].join(' ');
      parts.push(warningText);
    } else if (visitChange < 0) {
      const successText = [
        `${Math.abs(visitChange)} fewer visits (${changePercent}%)`,
        'than previous period',
      ].join(' ');
      parts.push(successText);
    } else {
      parts.push('No change from previous period');
    }
  }

  const totalDomainLabel = totalDomains === 1 ? 'domain' : 'domains';
  parts.push(`Tracked ${totalDomains} ${totalDomainLabel} with ${totalVisits} total visits`);

  return `${parts.join('. ')}.`;
}

/**
 * Generate weekly insights from aggregated data
 * @param {Object} weekData - Week's visit data
 * @param {Object} limits - User-configured limits
 * @returns {Array} - Array of insight objects
 */
export function generateWeeklyInsights(weekData, limits) {
  const insights = [];
  const domains = Object.entries(weekData);

  if (domains.length === 0) return insights;

  // Sort by count
  const sorted = domains
    .map(([domain, data]) => ({ domain, count: data.count }))
    .sort((a, b) => b.count - a.count);

  // Insight 1: Most visited domain
  const topDomain = sorted[0];
  const mostVisitedText = `You visited ${topDomain.domain} the most this week with ${topDomain.count} visits.`;
  insights.push({
    type: 'info',
    title: 'Most Visited',
    text: mostVisitedText,
  });

  // Insight 2: Limit violations
  const overLimitDomains = Object.entries(limits).filter(([domain, limitConfig]) => {
    if (!limitConfig || !limitConfig.enabled || !limitConfig.daily?.enabled) return false;
    const domainData = weekData[domain];
    if (!domainData) return false;
    return domainData.count / 7 > limitConfig.daily.limit; // Average per day
  });

  if (overLimitDomains.length > 0) {
    const domainWord = overLimitDomains.length === 1 ? 'domain' : 'domains';
    const limitTextParts = [
      `You exceeded daily limits on ${overLimitDomains.length} ${domainWord} this week.`,
      'Consider adjusting your limits or reducing usage.',
    ].join(' ');
    insights.push({
      type: 'warning',
      title: 'Limits Exceeded',
      text: limitTextParts,
    });
  } else if (Object.keys(limits).length > 0) {
    insights.push({
      type: 'success',
      title: 'Great Self-Control',
      text: 'You stayed within all your limits this week. Keep up the good work!',
    });
  }

  // Insight 3: Total focus switches
  const totalVisits = sorted.reduce((sum, d) => sum + d.count, 0);
  const avgPerDay = Math.round(totalVisits / 7);
  const activityText = `You switched focus ${totalVisits} times this week, averaging ${avgPerDay} switches/day.`;
  insights.push({
    type: 'info',
    title: 'Activity Summary',
    text: activityText,
  });

  // Insight 4: Recommendations
  if (sorted.length >= 3) {
    const top3Total = sorted.slice(0, 3).reduce((sum, d) => sum + d.count, 0);
    const percentageOfTotal = Math.round((top3Total / totalVisits) * 100);

    if (percentageOfTotal > 60) {
      const recommendationText = [
        `Your top 3 sites account for ${percentageOfTotal}% of your focus switches.`,
        'Consider setting limits to improve focus distribution.',
      ].join(' ');
      insights.push({
        type: 'warning',
        title: 'Recommendation',
        text: recommendationText,
      });
    }
  }

  return insights;
}

/**
 * Build the shared DOM/UI context used by the three `wireVisualization*` helpers.
 * All mutable state (current range, pending graph cleanup, toast timer) lives here
 * so each helper stays small and single-purpose.
 * @param {Object} options - setupVisualizationPage options
 * @returns {Object} shared context passed to helpers
 */
function buildVisualizationContext(options) {
  return {
    // Mutable state
    currentRange: options.defaultRange || 'today',
    cleanupGraph: null,
    toastTimeout: null,
    resetConfirmTimeout: null,
    // Static options consumed by render
    graphWidth: options.graphDimensions?.width || 400,
    graphHeight: options.graphDimensions?.height || 450,
    listLimit: options.listLimit || 10,
    onDataLoaded: options.onDataLoaded || null,
    // Cached DOM refs
    dom: {
      loading: document.getElementById('loading'),
      mainView: document.getElementById('main-view'),
      settingsView: document.getElementById('settings-view'),
      settingsBtn: document.getElementById('settings-btn'),
      settingsBackBtn: document.getElementById('settings-back-btn'),
      settingsToast: document.getElementById('settings-toast'),
      limitForm: document.getElementById('limit-form'),
      limitErrorEl: document.getElementById('limit-error'),
      limitList: document.getElementById('limit-list'),
      limitsEmpty: document.getElementById('limits-empty'),
      resetDataBtn: document.getElementById('reset-data-btn'),
      exportJsonBtn: document.getElementById('export-json-btn'),
      exportCsvBtn: document.getElementById('export-csv-btn'),
    },
  };
}

/**
 * Wire the render side: simple list, quick-limits panel, and the main render
 * pipeline that drives the radial graph (or the fallback list) for a given range.
 * @param {Object} ctx - shared visualization context
 */
function wireVisualizationRender(ctx) {
  const renderSimpleList = (aggregatedVisits, domainListEl) => {
    const sortedDomains = Object.keys(aggregatedVisits).sort(
      (a, b) => aggregatedVisits[b].count - aggregatedVisits[a].count,
    );
    domainListEl.innerHTML = '';
    sortedDomains.slice(0, ctx.listLimit).forEach((domain) => {
      const domainData = aggregatedVisits[domain];
      const item = document.createElement('div');
      item.className = 'domain-item';
      const info = document.createElement('div');
      info.className = 'domain-info';
      const name = document.createElement('div');
      name.className = 'domain-name';
      name.textContent = domain;
      info.appendChild(name);
      if (domainData.subpaths && Object.keys(domainData.subpaths).length > 0) {
        const [topSubpath] = Object.entries(domainData.subpaths).sort(
          (a, b) => b[1].count - a[1].count,
        );
        const subpathEl = document.createElement('div');
        subpathEl.className = 'domain-subpath';
        subpathEl.textContent = `Top: ${topSubpath[0]} (${topSubpath[1].count})`;
        info.appendChild(subpathEl);
      }
      const count = document.createElement('div');
      count.className = 'domain-count';
      count.textContent = domainData.count;
      count.setAttribute('aria-label', `${domainData.count} visits`);
      item.append(info, count);
      domainListEl.appendChild(item);
    });
  };

  const renderQuickLimits = async (aggregatedVisits) => {
    const panel = document.getElementById('quick-limits-panel');
    const list = document.getElementById('quick-limits-list');
    if (!panel || !list) return;
    const topDomains = Object.entries(aggregatedVisits)
      .sort(([, a], [, b]) => b.count - a.count)
      .slice(0, 5)
      .map(([d]) => d);
    if (topDomains.length === 0) {
      setShown(panel, false);
      return;
    }
    setShown(panel, true);
    list.innerHTML = '';
    const limits = await getLimits();
    const defaultConfig = createDefaultLimitConfig();
    topDomains.forEach((domain) => {
      const limitConfig = limits[domain] ? normalizeLimitConfig(limits[domain]) : null;
      const hasLimit = limitConfig !== null;
      const isEnabled = hasLimit && limitConfig.enabled;
      const visitCount = aggregatedVisits[domain].count;

      const item = document.createElement('li');
      item.className = 'quick-limit-item';
      const info = document.createElement('div');
      info.className = 'quick-limit-info';
      const domainDiv = document.createElement('div');
      domainDiv.className = 'quick-limit-domain';
      domainDiv.textContent = domain;
      const statsDiv = document.createElement('div');
      statsDiv.className = 'quick-limit-stats';
      const visitSpan = document.createElement('span');
      visitSpan.className = 'visit-count';
      visitSpan.textContent = `${visitCount} visits`;
      statsDiv.appendChild(visitSpan);
      const statusSpan = document.createElement('span');
      if (!hasLimit) {
        statusSpan.className = 'limit-status no-limit';
        statusSpan.textContent = `Default ${defaultConfig.fiveHour.limit}/5h \u00B7 ${defaultConfig.daily.limit}/day`;
      } else if (!isEnabled) {
        statusSpan.className = 'limit-status disabled';
        statusSpan.textContent = 'Disabled';
      } else {
        const parts = [];
        if (limitConfig.fiveHour.enabled) parts.push(`${limitConfig.fiveHour.limit}/5h`);
        if (limitConfig.daily.enabled) parts.push(`${limitConfig.daily.limit}/day`);
        statusSpan.className = 'limit-status active';
        statusSpan.textContent = parts.join(', ');
      }
      statsDiv.appendChild(document.createTextNode(' '));
      statsDiv.appendChild(statusSpan);
      info.append(domainDiv, statsDiv);

      const actions = document.createElement('div');
      actions.className = 'quick-limit-actions';
      const toggleWrapper = document.createElement('label');
      toggleWrapper.className = 'quick-limit-toggle';
      toggleWrapper.setAttribute('aria-label', `Toggle limit for ${domain}`);
      const toggleInput = document.createElement('input');
      toggleInput.type = 'checkbox';
      toggleInput.checked = isEnabled;
      toggleInput.dataset.domain = domain;
      toggleInput.dataset.action = 'quick-toggle';
      toggleInput.dataset.state = hasLimit ? 'configured' : 'default';
      toggleWrapper.appendChild(toggleInput);
      actions.appendChild(toggleWrapper);
      const customizeBtn = document.createElement('button');
      customizeBtn.type = 'button';
      customizeBtn.className = 'pill-button pill-button-secondary pill-button-small';
      customizeBtn.dataset.domain = domain;
      customizeBtn.dataset.action = 'quick-customize';
      customizeBtn.textContent = 'Customize';
      customizeBtn.setAttribute('aria-label', `Customize limit for ${domain}`);
      actions.appendChild(customizeBtn);
      item.append(info, actions);
      list.appendChild(item);
    });
  };

  ctx.renderVisualization = async (range = ctx.currentRange) => {
    const graphContainer = document.getElementById('graph-container');
    const domainListEl = document.getElementById('domain-list');
    const emptyState = document.getElementById('empty-state');
    const content = document.getElementById('content');
    const title = document.getElementById('stats-title');

    try {
      if (title) title.textContent = getTitleForRange(range);
      const aggregatedVisits = await loadAggregatedStats(range);
      const domains = Object.keys(aggregatedVisits);
      if (domains.length === 0) {
        setShown(emptyState, true);
        setShown(content, false);
        if (ctx.onDataLoaded) ctx.onDataLoaded({});
        await updateMapView({});
        return;
      }
      setShown(emptyState, false);
      setShown(content, true);
      if (ctx.onDataLoaded) ctx.onDataLoaded(aggregatedVisits);
      await updateMapView(aggregatedVisits);
      await renderQuickLimits(aggregatedVisits);

      if (ctx.cleanupGraph) {
        ctx.cleanupGraph();
        ctx.cleanupGraph = null;
      }

      if (isFeatureEnabled('RADIAL_GRAPH')) {
        setShown(graphContainer, true);
        setShown(domainListEl, false);
        const badges = await calculateFocusHeroBadges();
        const limits = await getLimits();
        // Measure the container now that #content is displayed; the SVG uses a
        // viewBox so it stays responsive afterwards — these dimensions only set
        // the initial aspect ratio and the force-layout bounds.
        const containerRect = graphContainer.getBoundingClientRect();
        const graphWidth = containerRect.width > 0 ? containerRect.width : ctx.graphWidth;
        const graphHeight = containerRect.height > 0 ? containerRect.height : ctx.graphHeight;
        ctx.cleanupGraph = renderRadialGraph(graphContainer, aggregatedVisits, {
          width: graphWidth,
          height: graphHeight,
          badges,
          limits,
          onZoomChange: (k) => {
            const el = document.getElementById('zoom-level');
            if (el) el.textContent = `${Math.round(k * 100)}%`;
          },
        });
        const summaryElement = document.getElementById('summary-content');
        if (summaryElement) {
          const comparisonToggle = document.getElementById('comparison-toggle-input');
          const isComparisonEnabled = comparisonToggle && comparisonToggle.checked;
          const previousData = isComparisonEnabled
            ? await loadPreviousPeriodData(ctx.currentRange)
            : null;
          const summaryText = generateInsightsSummary(
            aggregatedVisits,
            limits,
            ctx.currentRange,
            previousData,
          );
          summaryElement.classList.add('updating');
          summaryElement.textContent = summaryText;
          setTimeout(() => summaryElement.classList.remove('updating'), 300);
        }
      } else if (graphContainer && domainListEl) {
        setShown(graphContainer, false);
        setShown(domainListEl, true);
        renderSimpleList(aggregatedVisits, domainListEl);
      }
    } catch (error) {
      console.error('Error rendering visualization:', error);
      console.error('Error stack:', error.stack);
      if (graphContainer) {
        graphContainer.replaceChildren();
        const errorDiv = document.createElement('div');
        errorDiv.className = 'graph-error';
        errorDiv.appendChild(document.createTextNode('Error loading visualization'));
        errorDiv.appendChild(document.createElement('br'));
        const small = document.createElement('small');
        small.style.fontSize = '11px';
        small.style.opacity = '0.7';
        small.textContent = error.message;
        errorDiv.appendChild(small);
        graphContainer.appendChild(errorDiv);
      }
    }
  };
}

/**
 * Wire the settings view: limit list, limit form, toasts, view navigation, and
 * the destructive reset-data button. Returns helpers the other wirers call.
 * @param {Object} ctx - shared visualization context
 */
function wireVisualizationSettings(ctx) {
  const { dom } = ctx;

  const showSettingsToast = (message) => {
    if (!dom.settingsToast) return;
    dom.settingsToast.textContent = message;
    dom.settingsToast.classList.add('visible');
    if (ctx.toastTimeout) clearTimeout(ctx.toastTimeout);
    ctx.toastTimeout = setTimeout(() => {
      dom.settingsToast.classList.remove('visible');
    }, 3500);
  };

  const applyLimitConfigToForm = (domainValue, config) => {
    if (!dom.limitForm) return;
    const resolved = config ? normalizeLimitConfig(config) : createDefaultLimitConfig();
    dom.limitForm.elements.domain.value = domainValue || '';
    dom.limitForm.elements.enabled.checked = resolved.enabled;
    dom.limitForm.elements.fiveHourEnabled.checked = resolved.fiveHour.enabled;
    dom.limitForm.elements.fiveHourLimit.value = resolved.fiveHour.limit;
    dom.limitForm.elements.dailyEnabled.checked = resolved.daily.enabled;
    dom.limitForm.elements.dailyLimit.value = resolved.daily.limit;
  };

  const resetLimitFormToDefaults = () => {
    applyLimitConfigToForm('', createDefaultLimitConfig());
  };

  const refreshLimitList = async () => {
    if (!dom.limitList) return;
    const limits = await getLimits();
    const entries = Object.entries(limits);
    dom.limitList.innerHTML = '';
    if (dom.limitsEmpty) dom.limitsEmpty.hidden = entries.length > 0;
    if (entries.length === 0) return;

    entries.forEach(([domain, limitConfig]) => {
      const normalized = normalizeLimitConfig(limitConfig);
      const item = document.createElement('li');
      const info = document.createElement('div');
      info.className = 'limit-item-info';
      const domainStrong = document.createElement('strong');
      domainStrong.textContent = domain;
      info.appendChild(domainStrong);
      info.appendChild(document.createElement('br'));
      const limitSpan = document.createElement('span');
      if (!normalized.enabled) {
        limitSpan.textContent = 'Disabled';
        limitSpan.classList.add('is-muted');
      } else {
        const parts = [];
        if (normalized.fiveHour.enabled) parts.push(`${normalized.fiveHour.limit} per 5h`);
        if (normalized.daily.enabled) parts.push(`${normalized.daily.limit} per day`);
        if (parts.length === 0) {
          limitSpan.textContent = 'No limits active';
          limitSpan.classList.add('is-muted');
        } else {
          limitSpan.textContent = parts.join(', ');
        }
      }
      info.appendChild(limitSpan);

      const toggleWrapper = document.createElement('label');
      toggleWrapper.className = 'limit-item-toggle';
      toggleWrapper.setAttribute('aria-label', `Toggle limit for ${domain}`);
      const toggleInput = document.createElement('input');
      toggleInput.type = 'checkbox';
      toggleInput.checked = normalized.enabled;
      toggleInput.dataset.domain = domain;
      toggleInput.dataset.action = 'toggle';
      toggleWrapper.appendChild(toggleInput);

      const editBtn = document.createElement('button');
      editBtn.type = 'button';
      editBtn.className = 'pill-button pill-button-secondary pill-button-small';
      editBtn.dataset.domain = domain;
      editBtn.dataset.action = 'edit';
      editBtn.textContent = 'Edit';
      editBtn.setAttribute('aria-label', `Edit limit for ${domain}`);

      const removeBtn = document.createElement('button');
      removeBtn.type = 'button';
      removeBtn.className = 'pill-button pill-button-secondary pill-button-small';
      removeBtn.dataset.domain = domain;
      removeBtn.dataset.action = 'remove';
      removeBtn.textContent = 'Remove';
      removeBtn.setAttribute('aria-label', `Remove limit for ${domain}`);

      const btnGroup = document.createElement('div');
      btnGroup.className = 'limit-item-actions';
      btnGroup.append(toggleWrapper, editBtn, removeBtn);
      item.append(info, btnGroup);
      dom.limitList.appendChild(item);
    });
  };

  const showSettingsView = async () => {
    if (!dom.settingsView || !dom.mainView) return;
    dom.mainView.style.display = 'none';
    dom.settingsView.hidden = false;
    dom.settingsView.setAttribute('aria-hidden', 'false');
    dom.settingsView.focus();
    await refreshLimitList();
  };

  const showMainView = () => {
    if (!dom.settingsView || !dom.mainView) return;
    if (dom.settingsView.hidden) return;
    dom.settingsView.hidden = true;
    dom.settingsView.setAttribute('aria-hidden', 'true');
    // '' restores the stylesheet display (dashboard main view is flex, not block)
    dom.mainView.style.display = '';
    dom.settingsBtn?.focus();
  };

  // Settings/main view navigation
  if (dom.settingsBtn && dom.settingsView && dom.mainView) {
    dom.settingsBtn.addEventListener('click', showSettingsView);
  }
  if (dom.settingsBackBtn) {
    dom.settingsBackBtn.addEventListener('click', showMainView);
  }

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    if (!dom.settingsView || dom.settingsView.hidden) return;
    event.preventDefault();
    event.stopPropagation();
    showMainView();
  });

  // Limit list interactions (toggle / remove / edit)
  if (dom.limitList) {
    dom.limitList.addEventListener('click', async (event) => {
      const { domain, action } = event.target.dataset || {};
      if (!domain || !action) return;
      if (action === 'toggle') {
        try {
          const limits = await getLimits();
          const limitConfig = normalizeLimitConfig(limits[domain]);
          const newEnabled = event.target.checked;
          if (newEnabled && !(await ensureBlockingHostPermission())) {
            event.target.checked = false;
            showSettingsToast('Website access is required to enable blocking.');
            return;
          }
          limitConfig.enabled = newEnabled;
          await setLimitForDomain(domain, limitConfig);
          await updateBlockingRules();
          await refreshLimitList();
          showSettingsToast(`${domain} limits ${newEnabled ? 'enabled' : 'disabled'}`);
        } catch (error) {
          console.error('Unable to toggle limit:', error);
          event.target.checked = !event.target.checked;
          showSettingsToast('Unable to toggle that limit.');
        }
      } else if (action === 'remove') {
        try {
          await setLimitForDomain(domain, null);
          await updateBlockingRules();
          await refreshLimitList();
          showSettingsToast(`Removed limit for ${domain}`);
        } catch (error) {
          console.error('Unable to remove limit:', error);
          showSettingsToast('Unable to remove that limit.');
        }
      } else if (action === 'edit' && dom.limitForm) {
        const limits = await getLimits();
        const limitConfig = normalizeLimitConfig(limits[domain]);
        applyLimitConfigToForm(domain, limitConfig);
        dom.limitForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
        dom.limitForm.elements.domain.focus();
      }
    });
  }

  // Limit form (create/update) interactions + destructive reset button are
  // delegated to a dedicated wirer to keep this function under ~200 lines.
  if (dom.limitForm || dom.resetDataBtn) {
    wireLimitFormAndReset({
      ctx,
      dom,
      resetLimitFormToDefaults,
      refreshLimitList,
      showSettingsToast,
    });
  }

  // Expose helpers consumed by the actions wirer
  ctx.showSettingsView = showSettingsView;
  ctx.applyLimitConfigToForm = applyLimitConfigToForm;
  ctx.showSettingsToast = showSettingsToast;
}

/**
 * Wire the create/update limit form and the destructive reset-data button.
 * Kept separate from `wireVisualizationSettings` so each named responsibility
 * stays under ~200 lines.
 * @param {Object} deps
 * @param {Object} deps.ctx - shared visualization context
 * @param {Object} deps.dom - cached DOM refs from ctx
 * @param {Function} deps.resetLimitFormToDefaults
 * @param {Function} deps.refreshLimitList
 * @param {Function} deps.showSettingsToast
 */
function wireLimitFormAndReset({
  ctx,
  dom,
  resetLimitFormToDefaults,
  refreshLimitList,
  showSettingsToast,
}) {
  if (dom.limitForm) {
    resetLimitFormToDefaults();
    const limitEnabledToggle = dom.limitForm.elements.enabled;
    const fiveHourEnabledToggle = dom.limitForm.elements.fiveHourEnabled;
    const dailyEnabledToggle = dom.limitForm.elements.dailyEnabled;
    const limitConfigSection = document.getElementById('limit-config-section');
    const fiveHourConfig = document.getElementById('five-hour-config');
    const dailyConfig = document.getElementById('daily-config');
    if (limitEnabledToggle && limitConfigSection) {
      limitEnabledToggle.addEventListener('change', () => {
        limitConfigSection.style.opacity = limitEnabledToggle.checked ? '1' : '0.5';
      });
    }
    if (fiveHourEnabledToggle && fiveHourConfig) {
      fiveHourEnabledToggle.addEventListener('change', () => {
        fiveHourConfig.style.opacity = fiveHourEnabledToggle.checked ? '1' : '0.5';
      });
    }
    if (dailyEnabledToggle && dailyConfig) {
      dailyEnabledToggle.addEventListener('change', () => {
        dailyConfig.style.opacity = dailyEnabledToggle.checked ? '1' : '0.5';
      });
    }
    dom.limitForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const rawDomain = dom.limitForm.elements.domain.value;
      const enabled = dom.limitForm.elements.enabled.checked;
      const fiveHourEnabled = dom.limitForm.elements.fiveHourEnabled.checked;
      const fiveHourLimit = dom.limitForm.elements.fiveHourLimit.value;
      const dailyEnabled = dom.limitForm.elements.dailyEnabled.checked;
      const dailyLimit = dom.limitForm.elements.dailyLimit.value;

      const domainRes = validateDomain(rawDomain);
      if (!domainRes.valid) {
        if (dom.limitErrorEl) dom.limitErrorEl.textContent = domainRes.error;
        return;
      }
      const limitRes = validateLimitConfig({
        fiveHourEnabled,
        fiveHourLimit,
        dailyEnabled,
        dailyLimit,
      });
      if (!limitRes.valid) {
        if (dom.limitErrorEl) dom.limitErrorEl.textContent = limitRes.error;
        return;
      }
      if (dom.limitErrorEl) dom.limitErrorEl.textContent = '';

      try {
        const limitConfig = {
          enabled,
          fiveHour: {
            enabled: fiveHourEnabled,
            limit: fiveHourEnabled ? Number(fiveHourLimit) : 10,
          },
          daily: {
            enabled: dailyEnabled,
            limit: dailyEnabled ? Number(dailyLimit) : 20,
          },
        };
        if (limitConfig.enabled && !(await ensureBlockingHostPermission())) {
          if (dom.limitErrorEl) {
            dom.limitErrorEl.textContent = 'Website access is required to enable blocking.';
          }
          return;
        }
        await setLimitForDomain(domainRes.normalized, limitConfig);
        await updateBlockingRules();
        dom.limitForm.reset();
        resetLimitFormToDefaults();
        await refreshLimitList();
        showSettingsToast(`Limit saved for ${domainRes.normalized}`);
      } catch (error) {
        console.error('Unable to save limit:', error);
        showSettingsToast('Unable to save that limit.');
      }
    });
  }

  if (dom.resetDataBtn) {
    const defaultResetLabel = dom.resetDataBtn.textContent;
    dom.resetDataBtn.addEventListener('click', async () => {
      if (dom.resetDataBtn.dataset.confirming === 'true') {
        dom.resetDataBtn.dataset.confirming = 'false';
        dom.resetDataBtn.textContent = defaultResetLabel;
        if (ctx.resetConfirmTimeout) clearTimeout(ctx.resetConfirmTimeout);
        try {
          await clearAllData();
          await updateBlockingRules();
          await updateSettings({ onboardingComplete: false, defaultTimeRange: 'today' });
          await refreshLimitList();
          await ctx.renderVisualization(ctx.currentRange);
          showSettingsToast('All focus data cleared.');
        } catch (error) {
          console.error('Unable to reset data:', error);
          showSettingsToast('Unable to reset data. Try again.');
        }
        return;
      }
      dom.resetDataBtn.dataset.confirming = 'true';
      dom.resetDataBtn.textContent = 'Tap again to confirm reset';
      showSettingsToast('Tap again to confirm reset.');
      ctx.resetConfirmTimeout = setTimeout(() => {
        dom.resetDataBtn.dataset.confirming = 'false';
        dom.resetDataBtn.textContent = defaultResetLabel;
      }, 4000);
    });
  }
}

/**
 * Wire the remaining top-level actions: time-filter, comparison toggle, refresh,
 * quick-limits panel, export buttons, drilldown event, and the initial render
 * + performance log.
 * @param {Object} ctx - shared visualization context
 * @param {Object} options - original setupVisualizationPage options
 */
async function wireVisualizationActions(ctx, _options) {
  const { dom } = ctx;

  // Time filter buttons
  document.querySelectorAll('.time-filter-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const { range } = btn.dataset;
      ctx.currentRange = range;
      document.querySelectorAll('.time-filter-btn').forEach((b) => {
        b.classList.remove('active');
        b.setAttribute('aria-pressed', 'false');
      });
      btn.classList.add('active');
      btn.setAttribute('aria-pressed', 'true');
      await ctx.renderVisualization(range);
    });
  });

  // Comparison toggle
  const comparisonToggle = document.getElementById('comparison-toggle-input');
  if (comparisonToggle) {
    comparisonToggle.addEventListener('change', async () => {
      document.querySelectorAll('.comparison-column').forEach((col) => {
        col.style.display = comparisonToggle.checked ? '' : 'none';
      });
      await ctx.renderVisualization(ctx.currentRange);
    });
  }

  // Refresh button
  const refreshBtn = document.getElementById('refresh-btn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', async () => {
      await ctx.renderVisualization(ctx.currentRange);
    });
  }

  // Quick-limits panel interactions
  const quickLimitsList = document.getElementById('quick-limits-list');
  if (quickLimitsList) {
    quickLimitsList.addEventListener('click', async (event) => {
      const { domain, action } = event.target.dataset || {};
      if (!domain || !action) return;
      if (action === 'quick-toggle') {
        const desiredState = event.target.checked;
        try {
          const limits = await getLimits();
          let limitConfig = limits[domain] ? normalizeLimitConfig(limits[domain]) : null;
          if (!limitConfig && desiredState) limitConfig = createDefaultLimitConfig();
          if (!limitConfig) {
            event.target.checked = false;
            return;
          }
          if (desiredState && !(await ensureBlockingHostPermission())) {
            event.target.checked = false;
            ctx.showSettingsToast('Website access is required to enable blocking.');
            return;
          }
          limitConfig.enabled = desiredState;
          await setLimitForDomain(domain, limitConfig);
          await updateBlockingRules();
          await ctx.renderVisualization(ctx.currentRange);
        } catch (error) {
          console.error('Unable to toggle limit:', error);
          event.target.checked = !desiredState;
        }
      } else if (action === 'quick-customize') {
        await ctx.showSettingsView();
        if (dom.limitForm) {
          const limits = await getLimits();
          const limitConfig = limits[domain]
            ? normalizeLimitConfig(limits[domain])
            : createDefaultLimitConfig();
          ctx.applyLimitConfigToForm(domain, limitConfig);
          dom.limitForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
          dom.limitForm.elements.domain.focus();
        }
      }
    });
  }

  // Export to JSON
  if (dom.exportJsonBtn) {
    dom.exportJsonBtn.addEventListener('click', async () => {
      try {
        const data = await chrome.storage.local.get(['visits', 'limits', 'settings']);
        const jsonString = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const filename = `focuspaw-data-${getTodayKey()}.json`;
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
        ctx.showSettingsToast(`Exported data as ${filename}`);
      } catch (error) {
        console.error('Export JSON error:', error);
        ctx.showSettingsToast('Unable to export JSON. Try again.');
      }
    });
  }

  // Export to CSV
  if (dom.exportCsvBtn) {
    dom.exportCsvBtn.addEventListener('click', async () => {
      try {
        const data = await chrome.storage.local.get(['visits', 'limits']);
        const visits = data.visits || {};
        const limits = data.limits || {};
        // csvRow() escapes each cell for RFC 4180 and prefixes formula-injection
        // starters (= + - @ \t \r) with an apostrophe so spreadsheet apps open
        // the value as text. The visit count and limit are emitted as strings —
        // csvRow's structural escaping still applies if the limit string
        // contains a comma.
        let csv = csvRow(['Date', 'Domain', 'Path', 'Visit Count', 'Daily Limit']);
        Object.entries(visits).forEach(([date, dateVisits]) => {
          Object.entries(dateVisits).forEach(([domainName, domainData]) => {
            const limit = limits[domainName] || 'No limit';
            const count = domainData.count || 0;
            csv += csvRow([date, domainName, '/', count, limit]);
            if (domainData.subpaths) {
              Object.entries(domainData.subpaths).forEach(([subpath, subpathData]) => {
                csv += csvRow([date, domainName, subpath, subpathData.count, limit]);
              });
            }
          });
        });
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const filename = `focuspaw-data-${getTodayKey()}.csv`;
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
        ctx.showSettingsToast(`Exported data as ${filename}`);
      } catch (error) {
        console.error('Export CSV error:', error);
        ctx.showSettingsToast('Unable to export CSV. Try again.');
      }
    });
  }

  // Graph drilldown → open settings for that domain
  window.addEventListener('openDomainSettings', async (event) => {
    const { domain } = event.detail || {};
    if (!domain) return;
    try {
      await ctx.showSettingsView();
      if (dom.limitForm) {
        const limits = await getLimits();
        const limitConfig = limits[domain]
          ? normalizeLimitConfig(limits[domain])
          : createDefaultLimitConfig();
        ctx.applyLimitConfigToForm(domain, limitConfig);
        dom.limitForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
        dom.limitForm.querySelector('input[name="domain"]')?.focus();
      }
    } catch (error) {
      console.error('Failed to open domain settings:', error);
    }
  });

  // Initial render + performance log (awaited so setupVisualizationPage resolves
  // only after `loading` is hidden — matches the contract the tests assert).
  const perfStart = performance.now();
  try {
    await ctx.renderVisualization(ctx.currentRange);
    if (dom.loading) dom.loading.style.display = 'none';
    const loadTime = Math.round(performance.now() - perfStart);
    console.log(`[FocusPaw Performance] Page load time: ${loadTime}ms`);
    if (loadTime > 300) {
      console.warn('[FocusPaw Performance] Load time exceeds target of 300ms');
    }
  } catch (error) {
    console.error('Error initializing visualization page:', error);
    if (dom.loading) dom.loading.textContent = 'Error loading FocusPaw';
  }
}

/**
 * Bind the graph zoom controls (#zoom-in/#zoom-out/#zoom-reset) once during
 * setup. The buttons are optional — pages without a zoom bar skip silently.
 * @param {Object} ctx - shared visualization context
 */
function bindZoomControls(ctx) {
  const zoomInBtn = document.getElementById('zoom-in');
  const zoomOutBtn = document.getElementById('zoom-out');
  const zoomResetBtn = document.getElementById('zoom-reset');
  if (zoomInBtn) zoomInBtn.addEventListener('click', () => ctx.cleanupGraph?.zoomIn());
  if (zoomOutBtn) zoomOutBtn.addEventListener('click', () => ctx.cleanupGraph?.zoomOut());
  if (zoomResetBtn) zoomResetBtn.addEventListener('click', () => ctx.cleanupGraph?.resetZoom());
}

/**
 * Wire up the visualization UI by composing the three single-purpose wirers.
 * Public entry point — external callers (dashboard, popup) keep using it.
 * @param {Object} options
 * @param {string} [options.defaultRange='today']
 * @param {{width?:number,height?:number}} [options.graphDimensions]
 * @param {number} [options.listLimit=10]
 * @param {boolean} [options.fullPage=false]
 * @param {(data:Object)=>void} [options.onDataLoaded]
 */
export async function setupVisualizationPage(options = {}) {
  const { fullPage = false } = options;
  if (fullPage) {
    document.body.classList.add('dashboard-view');
  }

  const ctx = buildVisualizationContext(options);
  // Order matters: render first (provides ctx.renderVisualization), then
  // settings (exposes showSettingsView/applyLimitConfigToForm/showSettingsToast),
  // then actions which consumes both and runs the initial render.
  wireVisualizationRender(ctx);
  wireVisualizationSettings(ctx);
  bindZoomControls(ctx);
  initMapViewTabs();
  bindMapChrome();
  await wireVisualizationActions(ctx, options);
}
