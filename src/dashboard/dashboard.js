import {
  setupVisualizationPage,
  generateWeeklyInsights,
  loadAggregatedStats,
} from '../common/visualization-page.js';
import {
  getLimits,
  calculateFocusHeroBadges,
  normalizeLimitConfig,
  calculateOverallStreak,
  getSettings,
  updateSettings,
} from '../background/storage.js';
import { getTodayFocusScore } from '../background/focus-score.js';
import { categorizeDomain } from '../common/categories.js';
import { getTodayKey, FIVE_HOUR_MS } from '../common/date-utils.js';
import { svgIcon } from '../common/icons.js';
import { requestGeoLookupPermission } from './geolocation.js';
import { updateMapView } from './map-view.js';

let currentTableData = [];
let currentLimits = {};
let currentBadges = {};
let currentPage = 1;
let pageSize = 25;
let filteredData = [];
let currentAggregatedData = {};
let todayAggregatedData = {}; // Separate storage for today's data for status badge

/**
 * Get status class based on percentage (for limit progress bars)
 * @param {number} percent - Percentage value (0-100+)
 * @returns {string} CSS modifier class
 */
function getStatusClass(percent) {
  if (percent >= 100) return 'is-bad';
  if (percent > 80) return 'is-warn';
  return 'is-ok';
}
// "Near limit" threshold: 80% of a configured limit triggers the near-limit warning.
const NEAR_LIMIT_THRESHOLD = 0.8;

const tableFilters = {
  query: '',
  sortField: 'count',
  sortOrder: 'desc',
  groupByCategory: true, // Enable grouping by default
};

document.addEventListener('DOMContentLoaded', async () => {
  // Apply high-contrast mode if enabled
  try {
    const s = await getSettings();
    if (s.highContrastMode) document.body.classList.add('high-contrast');
  } catch (err) {
    console.warn('High-contrast init failed', err);
  }
  // Show insights banner on dashboard open (if not dismissed today)
  await showInsightsPopup();

  // Setup table controls early
  setupTableControls();

  // Setup pagination controls
  setupPagination();

  // Setup footer
  setupFooter();
  setupBrandReset();
  // Keep Visits header label in sync with selected range
  document.querySelectorAll('.time-filter-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      // label updates after visualization reloads; also update promptly
      setTimeout(updateVisitsHeaderLabel, 50);
    });
  });

  // Listen for domain drilldown events from graph
  window.addEventListener('domainDrilldown', handleDomainDrilldown);
  window.addEventListener('domainDrilldownExit', handleDrilldownExit);

  // Wait for layout to settle before getting dimensions
  setTimeout(() => {
    const graphDimensions = getGraphDimensions();
    console.log('[Dashboard] Initializing with dimensions:', graphDimensions);

    // Setup visualization page
    setupVisualizationPage({
      defaultRange: 'today', // Default to today view for accurate status
      fullPage: true,
      graphDimensions,
      listLimit: 50,
      onDataLoaded: handleDataLoaded,
    });
  }, 100);
});

/**
 * Show insights as a dismissible banner (non-modal) on dashboard open
 * Checks if insights have been dismissed today and shows banner if not
 */
async function showInsightsPopup() {
  const banner = document.getElementById('insights-popup');
  const closeBtn = document.getElementById('insights-close');

  if (!banner || !closeBtn) return;

  // Check if insights were dismissed today
  const today = getTodayKey();
  const { insightsDismissedDate } = await chrome.storage.local.get('insightsDismissedDate');

  if (insightsDismissedDate === today) {
    // Already dismissed today, don't show
    return;
  }

  // Load and display insights content
  const insightsContent = document.getElementById('insights-content');
  if (insightsContent) {
    const createInsightCard = (type, title, text) => {
      const card = document.createElement('div');
      card.className = `insight-card${type === 'info' ? '' : ` ${type}`}`;
      const titleEl = document.createElement('div');
      titleEl.className = 'insight-card-title';
      titleEl.textContent = title;
      const textEl = document.createElement('div');
      textEl.className = 'insight-card-text';
      textEl.textContent = text;
      card.append(titleEl, textEl);
      return card;
    };

    try {
      const weekData = await loadAggregatedStats('week');
      const limits = await getLimits();
      const insights = generateWeeklyInsights(weekData, limits);

      insightsContent.replaceChildren();
      if (insights.length === 0) {
        const msg = 'No insights available for this week yet. Start browsing to see your patterns!';
        insightsContent.appendChild(createInsightCard('info', '', msg));
      } else {
        insights.forEach((insight) => {
          insightsContent.appendChild(createInsightCard(insight.type, insight.title, insight.text));
        });
      }
    } catch (error) {
      console.error('Error generating weekly insights:', error);
      const errorMsg = 'Unable to load insights at this time.';
      insightsContent.replaceChildren();
      insightsContent.appendChild(createInsightCard('warning', '', errorMsg));
    }
  }

  // Show banner immediately as non-modal inline element (no overlay, no auto-delay)
  banner.style.display = 'block';

  // Close handlers - dismissible banner
  const closeBanner = async () => {
    banner.style.display = 'none';
    // Save dismissal date
    await chrome.storage.local.set({ insightsDismissedDate: today });
  };

  closeBtn.addEventListener('click', closeBanner);

  // Also close on Escape key while banner is visible
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && banner.style.display !== 'none') {
      const settingsView = document.getElementById('settings-view');
      if (settingsView && !settingsView.hidden) return;
      closeBanner();
    }
  });
}

function setupFooter() {
  // Load and display version from manifest
  const manifest = chrome.runtime.getManifest();
  const footerVersion = document.getElementById('footer-version');
  if (footerVersion) {
    footerVersion.textContent = `v${manifest.version_name || manifest.version}`;
  }
}

function getGraphDimensions() {
  const topologyPanel = document.getElementById('topology-panel');
  const viewContainer = document.getElementById('view-container');

  if (!topologyPanel || !viewContainer) {
    console.warn('[Dashboard] Topology panel not found, using default dimensions');
    return { width: 900, height: 600 };
  }

  // Wait for layout to settle
  const rect = topologyPanel.getBoundingClientRect();
  const padding = 48; // Account for panel padding

  const width = Math.max(600, rect.width - padding);
  const height = Math.max(400, rect.height - 120); // Account for panel header

  console.log('[Dashboard] Calculated graph dimensions:', {
    width,
    height,
    panelWidth: rect.width,
    panelHeight: rect.height,
  });

  // Ensure dimensions are valid
  if (width <= 0 || height <= 0 || !Number.isFinite(width) || !Number.isFinite(height)) {
    console.warn('[Dashboard] Invalid dimensions calculated, using defaults');
    return { width: 900, height: 600 };
  }

  return { width, height };
}

function setupBrandReset() {
  const brandTrigger = document.getElementById('dashboard-home-trigger');
  if (!brandTrigger) return;

  const activateReset = () => {
    resetDashboardView();
  };

  brandTrigger.addEventListener('click', activateReset);
  brandTrigger.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      activateReset();
    }
  });
}

function resetDashboardView() {
  // Exit settings view if open
  const mainView = document.getElementById('main-view');
  const settingsView = document.getElementById('settings-view');
  if (settingsView && mainView) {
    settingsView.hidden = true;
    settingsView.setAttribute('aria-hidden', 'true');
    mainView.style.display = '';
  }

  // Reset table header/content state from any drilldown
  handleDrilldownExit();

  // Restore default table filters and pagination
  tableFilters.query = '';
  tableFilters.sortField = 'count';
  tableFilters.sortOrder = 'desc';
  currentPage = 1;
  pageSize = 25;

  const searchInput = document.getElementById('table-search');
  if (searchInput) {
    searchInput.value = '';
  }

  const sortSelect = document.getElementById('table-sort');
  if (sortSelect) {
    sortSelect.value = `${tableFilters.sortField}-${tableFilters.sortOrder}`;
  }

  const paginationSize = document.getElementById('pagination-size');
  const sizeSelect = paginationSize || document.getElementById('table-page-size');
  if (sizeSelect) {
    sizeSelect.value = pageSize.toString();
  }

  updateSortHeaderState(tableFilters.sortField, tableFilters.sortOrder);

  // Ensure comparison toggle is off
  const comparisonToggle = document.getElementById('comparison-toggle-input');
  if (comparisonToggle && comparisonToggle.checked) {
    comparisonToggle.checked = false;
    comparisonToggle.dispatchEvent(new Event('change'));
  }

  // Re-render table with defaults applied
  currentTableData = prepareTableData(currentAggregatedData);
  renderTable();

  // Reset visualization to default time range
  const todayBtn = document.querySelector('.time-filter-btn[data-range="today"]');
  if (todayBtn) {
    todayBtn.click();
  }
}

async function handleDataLoaded(aggregatedData) {
  console.log('[Dashboard] Data loaded:', aggregatedData);

  // Update stats summary
  updateStatsSummary(aggregatedData);

  // Load limits and badges
  currentLimits = await getLimits();
  currentBadges = await calculateFocusHeroBadges();
  currentAggregatedData = aggregatedData;

  // Update streak display
  await updateStreakDisplay();

  // Update focus score display
  await updateFocusScoreDisplay();

  // Load today's aggregated data separately for status badge calculation
  todayAggregatedData = await loadTodayAggregatedStats();

  // Prepare table data
  currentTableData = prepareTableData(aggregatedData);

  // Render table and sync header label to active range
  renderTable();
  updateVisitsHeaderLabel();
}

function updateStatsSummary(data) {
  const domains = Object.keys(data).length;
  const totalVisits = Object.values(data).reduce((sum, d) => sum + (d.count || 0), 0);

  const domainsEl = document.getElementById('total-domains');
  const visitsEl = document.getElementById('total-visits');

  if (domainsEl) domainsEl.textContent = domains;
  if (visitsEl) visitsEl.textContent = totalVisits;
}

/**
 * Load aggregated stats for today only
 * Used to calculate status badge independently from the displayed time range
 */
async function loadTodayAggregatedStats() {
  const now = new Date();
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  const data = await chrome.storage.local.get(['visits']);
  const visits = data.visits || {};
  const aggregated = {};

  Object.entries(visits).forEach(([dateKey, dateVisits]) => {
    // Parse date string as local date to avoid timezone issues
    // dateKey format: "YYYY-MM-DD"
    const [year, month, day] = dateKey.split('-').map(Number);
    const visitDate = new Date(year, month - 1, day); // month is 0-indexed

    // Only include today's visits
    if (visitDate.getTime() === today.getTime()) {
      Object.entries(dateVisits).forEach(([domain, domainData]) => {
        if (!aggregated[domain]) {
          aggregated[domain] = {
            count: 0,
            timestamps: [],
          };
        }
        aggregated[domain].count += domainData.count;
        if (Array.isArray(domainData.timestamps)) {
          aggregated[domain].timestamps.push(...domainData.timestamps);
        }
      });
    }
  });

  return aggregated;
}

function prepareTableData(aggregatedData) {
  const countVisitsInWindow = (timestamps, windowMs) => {
    if (!Array.isArray(timestamps) || timestamps.length === 0) return 0;
    const now = Date.now();
    const windowStart = now - windowMs;
    return timestamps.filter((ts) => ts >= windowStart).length;
  };

  return Object.entries(aggregatedData)
    .filter(([domain]) => domain !== 'localhost' && domain !== '127.0.0.1')
    .map(([domain, data]) => {
      const category = categorizeDomain(domain);
      return {
        domain,
        count: data.count || 0,
        todayCount: todayAggregatedData[domain]?.count || 0, // Add today's count for status badge
        fiveHourCount: countVisitsInWindow(todayAggregatedData[domain]?.timestamps, FIVE_HOUR_MS),
        subpaths: Object.keys(data.subpaths || {}).length,
        lastVisit: data.lastVisit || 0,
        limit: currentLimits[domain] ? normalizeLimitConfig(currentLimits[domain]) : null,
        badge: currentBadges[domain] || null,
        category: category.name,
        categoryColor: category.color,
      };
    });
}

function applyTableFilters(data) {
  let result = [...data];
  if (tableFilters.query) {
    result = result.filter((row) => row.domain.toLowerCase().includes(tableFilters.query));
  }
  result = sortTableData(result, tableFilters.sortField, tableFilters.sortOrder);
  return result;
}

function renderTable() {
  const tbody = document.getElementById('table-body');
  const emptyState = document.getElementById('table-empty');

  if (!tbody) return;

  tbody.innerHTML = '';

  filteredData = applyTableFilters(currentTableData);

  if (filteredData.length === 0) {
    if (emptyState) emptyState.style.display = 'block';
    updatePaginationInfo(0, 0, 0);
    return;
  }

  if (emptyState) emptyState.style.display = 'none';

  // Calculate pagination
  const totalItems = filteredData.length;
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);
  const pageData = filteredData.slice(startIndex, endIndex);

  // Render paginated data
  let lastCategory = null;

  pageData.forEach((row) => {
    // Insert category header if grouping is enabled and category changed
    if (tableFilters.groupByCategory && row.category !== lastCategory) {
      const categoryTr = document.createElement('tr');
      categoryTr.className = 'category-header-row';

      const categoryTd = document.createElement('td');
      categoryTd.colSpan = 6; // Span all columns

      const categoryContent = document.createElement('div');
      categoryContent.className = 'category-header-content';

      const colorDot = document.createElement('span');
      colorDot.className = 'category-dot';
      colorDot.style.backgroundColor = row.categoryColor || 'var(--ink-3)';

      const categoryName = document.createElement('span');
      categoryName.textContent = row.category;

      categoryContent.appendChild(colorDot);
      categoryContent.appendChild(categoryName);
      categoryTd.appendChild(categoryContent);
      categoryTr.appendChild(categoryTd);
      tbody.appendChild(categoryTr);

      lastCategory = row.category;
    }

    const tr = document.createElement('tr');

    // Domain cell with Favicon
    const domainTd = document.createElement('td');
    domainTd.className = 'domain-cell';

    const domainContent = document.createElement('div');
    domainContent.className = 'domain-content';

    // Favicon column removed for privacy — no third-party favicon fetches
    // (see PRIVACY.md "Third-Party Services" and issue #53 / F-SEC-001).
    const domainBtn = document.createElement('button');
    domainBtn.type = 'button';
    domainBtn.className = 'domain-link';
    domainBtn.textContent = row.domain;
    domainBtn.addEventListener('click', () => openDomainDetail(row.domain));
    domainContent.appendChild(domainBtn);

    if (row.badge) {
      const badge = svgIcon('trophy', { size: 14, className: 'icon badge-icon-table' });
      badge.setAttribute('title', `Focus Hero (${row.badge.streak} days!)`);
      domainContent.appendChild(badge);
    }

    domainTd.appendChild(domainContent);
    tr.appendChild(domainTd);

    // Visits cell — show same period as header totals (F-UX-002)
    const visitsTd = document.createElement('td');
    visitsTd.className = 'visits-cell';
    visitsTd.textContent = row.count;
    visitsTd.title = `Visits in selected period: ${row.count} (today: ${row.todayCount})`;
    tr.appendChild(visitsTd);

    // Subpaths cell removed as per feedback

    // Last visit cell
    const lastVisitTd = document.createElement('td');
    if (row.lastVisit) {
      const date = new Date(row.lastVisit);
      lastVisitTd.textContent = formatRelativeTime(date);
      lastVisitTd.title = date.toLocaleString();
    } else {
      lastVisitTd.textContent = 'Never';
    }
    tr.appendChild(lastVisitTd);

    // Limit cell - Show both daily and 5-hour limits
    const limitTd = document.createElement('td');

    if (row.limit && row.limit.enabled) {
      const dailyLimit = row.limit.daily?.limit;
      const todayCount = row.todayCount || 0;
      const fiveHourLimit = row.limit.fiveHour?.enabled ? row.limit.fiveHour.limit : null;
      const fiveHourCount = row.fiveHourCount || 0;

      const hasDaily = dailyLimit != null;
      const hasFiveHour = fiveHourLimit != null;

      if (hasDaily || hasFiveHour) {
        const container = document.createElement('div');
        container.className = 'limit-meter';

        // 5-hour limit (show first if exists, as it's more restrictive)
        if (hasFiveHour) {
          container.appendChild(
            buildLimitMeter({
              prefix: '5h',
              used: fiveHourCount,
              limit: fiveHourLimit,
              title: `5-hour limit: ${fiveHourCount}/${fiveHourLimit} opens`,
            }),
          );
        }

        // Daily limit
        if (hasDaily) {
          container.appendChild(
            buildLimitMeter({
              prefix: 'Daily',
              used: todayCount,
              limit: dailyLimit,
              title: `Daily limit: ${todayCount}/${dailyLimit} opens`,
            }),
          );
        }

        limitTd.appendChild(container);
      } else {
        limitTd.appendChild(buildNoLimitLabel());
      }
    } else {
      limitTd.appendChild(buildNoLimitLabel());
    }
    tr.appendChild(limitTd);

    // Status cell with icons and numeric progress
    const statusTd = document.createElement('td');
    const statusBadge = document.createElement('span');
    statusBadge.className = 'status-badge';

    if (!row.limit || !row.limit.enabled) {
      statusBadge.classList.add('no-limit');
      statusBadge.textContent = 'No Limit';
      statusBadge.title = 'No limits configured for this domain';
    } else {
      // Evaluate five-hour and daily limits independently using today's data
      const dailyLimit = row.limit.daily?.limit;
      const todayCount = row.todayCount || 0;
      const fiveHourLimit = row.limit.fiveHour?.enabled ? row.limit.fiveHour.limit : null;
      const fiveHourCount = row.fiveHourCount || 0;

      const overFiveHour = fiveHourLimit && fiveHourCount >= fiveHourLimit;
      const overDaily = dailyLimit && todayCount >= dailyLimit;
      const nearFiveHour = fiveHourLimit && fiveHourCount >= fiveHourLimit * NEAR_LIMIT_THRESHOLD;
      const nearDaily = dailyLimit && todayCount >= dailyLimit * NEAR_LIMIT_THRESHOLD;

      if (overFiveHour || overDaily) {
        statusBadge.classList.add('over-limit');
        statusBadge.textContent = 'Blocked';
        statusBadge.title = 'Limit exceeded';
      } else if (nearFiveHour || nearDaily) {
        statusBadge.classList.add('near-limit');
        statusBadge.textContent = 'Near Limit';
        statusBadge.title = 'Approaching limit';
      } else if (dailyLimit || fiveHourLimit) {
        statusBadge.classList.add('under-limit');
        statusBadge.textContent = 'On Track';
        statusBadge.title = 'Within limits';
      } else {
        // Limit is enabled but no daily limit configured
        statusBadge.classList.add('no-limit');
        statusBadge.textContent = 'Unlimited';
        statusBadge.title = 'No active limits';
      }
    }

    statusTd.appendChild(statusBadge);
    tr.appendChild(statusTd);

    tbody.appendChild(tr);
  });

  // Update pagination info
  updatePaginationInfo(startIndex + 1, endIndex, totalItems);
}

/**
 * Build one limit meter row (label + progress bar) for the table Limit cell.
 * Width stays a dynamic inline style; colour comes from is-ok/is-warn/is-bad classes.
 */
function buildLimitMeter(opts) {
  const isBlocked = opts.used >= opts.limit;
  const percent = Math.min(100, (opts.used / opts.limit) * 100);

  const meter = document.createElement('div');

  const label = document.createElement('div');
  label.className = `limit-meter-label${isBlocked ? ' is-blocked' : ''}`;
  if (isBlocked) {
    label.appendChild(svgIcon('ban', { size: 12 }));
    label.appendChild(document.createTextNode(`${opts.prefix}: Blocked`));
  } else {
    label.textContent = `${opts.prefix}: ${Math.max(0, opts.limit - opts.used)} left`;
  }
  label.title = opts.title;

  const bar = document.createElement('div');
  bar.className = 'limit-meter-bar';
  const fill = document.createElement('div');
  fill.className = `limit-meter-fill ${getStatusClass(percent)}`;
  fill.style.width = `${percent}%`;
  bar.appendChild(fill);

  meter.append(label, bar);
  return meter;
}

function buildNoLimitLabel() {
  const noLimit = document.createElement('span');
  noLimit.className = 'limit-none';
  noLimit.textContent = '—';
  noLimit.title = 'No limit set';
  return noLimit;
}

function formatRelativeTime(date) {
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

function setupTableControls() {
  const searchInput = document.getElementById('table-search');
  const sortSelect = document.getElementById('table-sort');

  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      tableFilters.query = e.target.value.toLowerCase();
      currentPage = 1;
      renderTable();
    });
  }

  if (sortSelect) {
    sortSelect.addEventListener('change', (e) => {
      const [field, order] = e.target.value.split('-');
      setSort(field, order);
      currentPage = 1;
      renderTable();
      updateSortHeaderState(field, order);
    });
  }

  // Setup sortable table headers (button inside th for keyboard + aria-sort)
  const headers = document.querySelectorAll('.data-table th.sortable');
  headers.forEach((header) => {
    const trigger = header.querySelector('.sort-btn') || header;
    trigger.addEventListener('click', () => {
      const field = header.dataset.sort;
      const isAscending = tableFilters.sortField === field && tableFilters.sortOrder === 'asc';
      const currentOrder = isAscending ? 'desc' : 'asc';
      setSort(field, currentOrder);
      currentPage = 1;
      renderTable();
      updateSortHeaderState(field, currentOrder);
      if (sortSelect) {
        sortSelect.value = `${field}-${currentOrder}`;
      }
    });
  });

  updateSortHeaderState(tableFilters.sortField, tableFilters.sortOrder);
}

function sortTableData(data, field, order = 'desc') {
  return data.sort((a, b) => {
    // Primary sort by category if grouping is enabled
    if (tableFilters.groupByCategory) {
      if (a.category !== b.category) {
        return a.category.localeCompare(b.category);
      }
    }

    let aVal = a[field];
    let bVal = b[field];

    // Handle string comparisons
    if (field === 'domain') {
      aVal = aVal.toLowerCase();
      bVal = bVal.toLowerCase();
      return order === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    }

    // Handle numeric comparisons
    if (order === 'asc') {
      return aVal - bVal;
    }
    return bVal - aVal;
  });
}

function setSort(field, order) {
  tableFilters.sortField = field;
  tableFilters.sortOrder = order;
}

function updateSortHeaderState(field, order) {
  const headers = document.querySelectorAll('.data-table th.sortable');
  headers.forEach((header) => {
    header.classList.remove('sorted-asc', 'sorted-desc');
    if (header.dataset.sort === field) {
      header.classList.add(order === 'asc' ? 'sorted-asc' : 'sorted-desc');
      header.setAttribute('aria-sort', order === 'asc' ? 'ascending' : 'descending');
    } else {
      header.setAttribute('aria-sort', 'none');
    }
  });
}

function updateVisitsHeaderLabel() {
  const active = document.querySelector('.time-filter-btn.active');
  const range = active ? active.dataset.range : 'today';
  const labels = {
    today: 'Visits (Today)',
    week: 'Visits (Week)',
    month: 'Visits (Month)',
  };
  const th = document.querySelector('.data-table th[data-sort="count"]');
  if (!th) return;
  const trigger = th.querySelector('.sort-btn') || th;
  const indicator = trigger.querySelector('.sort-indicator');
  const label = labels[range] || 'Visits';
  trigger.replaceChildren(document.createTextNode(`${label} `));
  if (indicator) {
    trigger.appendChild(indicator);
  } else {
    trigger.appendChild(svgIcon('chevron-down', { size: 12, className: 'icon sort-indicator' }));
  }
  trigger.title = label;
  trigger.setAttribute('aria-label', `Sort by ${label}`);
}

function setupPagination() {
  const prevBtn = document.getElementById('pagination-prev');
  const nextBtn = document.getElementById('pagination-next');
  const sizeSelect = document.getElementById('pagination-size');

  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      if (currentPage > 1) {
        currentPage -= 1;
        renderTable();
      }
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      const totalPages = Math.ceil(filteredData.length / pageSize);
      if (currentPage < totalPages) {
        currentPage += 1;
        renderTable();
      }
    });
  }

  if (sizeSelect) {
    sizeSelect.addEventListener('change', (e) => {
      pageSize = parseInt(e.target.value, 10);
      currentPage = 1; // Reset to first page
      renderTable();
    });
  }
}

function updatePaginationInfo(start, end, total) {
  const startEl = document.getElementById('pagination-start');
  const endEl = document.getElementById('pagination-end');
  const totalEl = document.getElementById('pagination-total');
  const pageEl = document.getElementById('pagination-page');
  const prevBtn = document.getElementById('pagination-prev');
  const nextBtn = document.getElementById('pagination-next');

  if (startEl) startEl.textContent = start;
  if (endEl) endEl.textContent = end;
  if (totalEl) totalEl.textContent = total;

  const totalPages = Math.ceil(total / pageSize);
  if (pageEl) pageEl.textContent = total > 0 ? `Page ${currentPage} of ${totalPages}` : 'Page 0';

  // Update button states
  if (prevBtn) prevBtn.disabled = currentPage === 1 || total === 0;
  if (nextBtn) nextBtn.disabled = currentPage >= totalPages || total === 0;
}

function openDomainDetail(domain) {
  const detailUrl = new URL(chrome.runtime.getURL('src/dashboard/domain.html'));
  detailUrl.searchParams.set('domain', domain);
  window.location.href = detailUrl.toString();
}

// Handle domain drilldown from graph
async function handleDomainDrilldown(event) {
  const { domain, domainData } = event.detail;

  // Update table panel header
  const panelHeader = document.querySelector('.table-panel .panel-header');
  if (!panelHeader) return;

  // Get limit config for this domain
  let limitConfig = null;
  if (currentLimits[domain]) {
    limitConfig = normalizeLimitConfig(currentLimits[domain]);
  }

  const subpathCount = Object.keys(domainData.subpaths || {}).length;

  panelHeader.replaceChildren();
  const drilldownHeader = document.createElement('div');
  drilldownHeader.className = 'drilldown-table-header';

  const drilldownInfo = document.createElement('div');
  drilldownInfo.className = 'drilldown-info';
  const drilldownTitle = document.createElement('h3');
  drilldownTitle.textContent = `Path Statistics for ${domain}`;
  const subtitle = document.createElement('p');
  subtitle.className = 'panel-subtitle';
  subtitle.textContent = `${domainData.count} total visits \u00B7 ${subpathCount} subpaths`;
  drilldownInfo.append(drilldownTitle, subtitle);

  const drilldownStatus = document.createElement('div');
  drilldownStatus.className = 'drilldown-status';
  if (limitConfig && limitConfig.enabled) {
    const activeBadge = document.createElement('span');
    activeBadge.className = 'limit-status-badge limit-enabled';
    activeBadge.textContent = '\u2713 Limits Active';
    drilldownStatus.appendChild(activeBadge);
    const detailsSpan = document.createElement('span');
    detailsSpan.className = 'limit-details';
    const detailsParts = [];
    if (limitConfig.fiveHour?.enabled) detailsParts.push(`${limitConfig.fiveHour.limit}/5hr`);
    if (limitConfig.daily?.enabled) detailsParts.push(`${limitConfig.daily.limit}/day`);
    detailsSpan.textContent = detailsParts.join(' \u00B7 ');
    drilldownStatus.appendChild(detailsSpan);
  } else {
    const disabledBadge = document.createElement('span');
    disabledBadge.className = 'limit-status-badge limit-disabled';
    disabledBadge.textContent = 'No limits';
    drilldownStatus.appendChild(disabledBadge);
  }
  const editBtn = document.createElement('button');
  editBtn.className = 'drilldown-edit-btn';
  editBtn.dataset.domain = domain;
  editBtn.textContent = 'Edit Limitation Settings';
  editBtn.addEventListener('click', () => {
    window.dispatchEvent(
      new CustomEvent('openDomainSettings', {
        detail: { domain },
      }),
    );
  });
  drilldownStatus.appendChild(editBtn);

  drilldownHeader.append(drilldownInfo, drilldownStatus);
  panelHeader.appendChild(drilldownHeader);

  // Render subpath table
  renderSubpathTable(domain, domainData);
}

// Handle exit from drilldown
function handleDrilldownExit() {
  // Restore original table header
  const panelHeader = document.querySelector('.table-panel .panel-header');
  if (!panelHeader) return;

  panelHeader.innerHTML = `
    <h3>Website Activity</h3>
    <div class="table-controls">
      <div class="input-with-icon">
        <svg class="icon" aria-hidden="true">
          <use href="../../assets/icons.svg#i-search"></use>
        </svg>
        <input
          type="search"
          id="table-search"
          placeholder="Search websites..."
          aria-label="Search websites"
        />
      </div>
      <select id="table-sort" aria-label="Sort by">
        <option value="count-desc">Most opened first</option>
        <option value="count-asc">Least opened first</option>
        <option value="domain-asc">Website (A-Z)</option>
        <option value="domain-desc">Website (Z-A)</option>
        <option value="lastVisit-desc">Recently visited</option>
      </select>
    </div>
  `;

  // Restore original table column headers (matches index.html markup)
  const thead = document.querySelector('.data-table thead');
  if (thead) {
    thead.innerHTML = `
      <tr>
        <th class="sortable" data-sort="domain" aria-sort="none">
          <button type="button" class="sort-btn">
            Website
            <svg class="icon sort-indicator" aria-hidden="true">
              <use href="../../assets/icons.svg#i-chevron-down"></use>
            </svg>
          </button>
        </th>
        <th class="sortable" data-sort="count" aria-sort="none">
          <button type="button" class="sort-btn">
            Visits
            <svg class="icon sort-indicator" aria-hidden="true">
              <use href="../../assets/icons.svg#i-chevron-down"></use>
            </svg>
          </button>
        </th>
        <th class="comparison-column" style="display: none">Change</th>
        <th class="sortable" data-sort="lastVisit" aria-sort="none">
          <button type="button" class="sort-btn">
            Last visit
            <svg class="icon sort-indicator" aria-hidden="true">
              <use href="../../assets/icons.svg#i-chevron-down"></use>
            </svg>
          </button>
        </th>
        <th>Limit</th>
        <th>Status</th>
      </tr>
    `;

    // Keep the restored comparison column in sync with the toggle state
    const comparisonToggle = document.getElementById('comparison-toggle-input');
    const comparisonTh = thead.querySelector('.comparison-column');
    if (comparisonTh && comparisonToggle) {
      comparisonTh.style.display = comparisonToggle.checked ? '' : 'none';
    }
  }

  // Re-setup table controls
  setupTableControls();

  // Restore domain table
  renderTable();
}

// Render subpath table
function renderSubpathTable(domain, domainData) {
  const tbody = document.getElementById('table-body');
  if (!tbody) return;

  tbody.innerHTML = '';

  // Prepare subpath data
  const subpaths = Object.entries(domainData.subpaths || {})
    .map(([path, pathData]) => ({
      subpath: path,
      count: pathData.count,
      lastVisit: pathData.lastVisit,
    }))
    .sort((a, b) => b.count - a.count);

  const totalVisits = subpaths.reduce((sum, sp) => sum + sp.count, 0);

  // Render subpath rows
  subpaths.forEach((subpath) => {
    const percentage = ((subpath.count / totalVisits) * 100).toFixed(1);
    const lastVisitDate = new Date(subpath.lastVisit).toLocaleString();

    const row = document.createElement('tr');

    const subpathCell = document.createElement('td');
    subpathCell.className = 'subpath-cell';
    const domainSpan = document.createElement('span');
    domainSpan.className = 'subpath-domain';
    domainSpan.textContent = domain;
    const pathSpan = document.createElement('span');
    pathSpan.className = 'subpath-path';
    pathSpan.textContent = subpath.subpath;
    subpathCell.append(domainSpan, pathSpan);

    const visitsCell = document.createElement('td');
    visitsCell.className = 'visits-cell';
    visitsCell.textContent = String(subpath.count);

    const dateCell = document.createElement('td');
    dateCell.className = 'date-cell';
    dateCell.textContent = lastVisitDate;

    const percentageCell = document.createElement('td');
    percentageCell.className = 'percentage-cell';
    const barContainer = document.createElement('div');
    barContainer.className = 'percentage-bar-container';
    const bar = document.createElement('div');
    bar.className = 'percentage-bar';
    bar.style.width = `${percentage}%`;
    const percentText = document.createElement('span');
    percentText.className = 'percentage-text';
    percentText.textContent = `${percentage}%`;
    barContainer.append(bar, percentText);
    percentageCell.appendChild(barContainer);

    row.append(subpathCell, visitsCell, dateCell, percentageCell);

    tbody.appendChild(row);
  });

  // Update table header for subpaths
  const thead = tbody.parentElement.querySelector('thead');
  if (thead) {
    thead.innerHTML = `
      <tr>
        <th>Subpath</th>
        <th>Visits</th>
        <th>Last Visit</th>
        <th>% of Total</th>
      </tr>
    `;
  }
}

/**
 * Update streak display in header
 */
async function updateStreakDisplay() {
  const streakElement = document.getElementById('current-streak');
  if (!streakElement) return;

  try {
    const overallStreak = await calculateOverallStreak();
    const currentStreak = overallStreak.current || 0;

    streakElement.textContent = currentStreak;

    // Update tooltip with best streak info
    const streakStat = document.getElementById('streak-stat');
    if (streakStat) {
      const bestStreak = overallStreak.best || 0;
      const currentLabel = `${currentStreak} day${currentStreak !== 1 ? 's' : ''}`;
      const bestLabel = `${bestStreak} day${bestStreak !== 1 ? 's' : ''}`;
      streakStat.title = `Current: ${currentLabel} | Personal Best: ${bestLabel}`;
    }
  } catch (error) {
    console.error('Error updating streak:', error);
  }
}

/**
 * Update focus score display in header
 */
async function updateFocusScoreDisplay() {
  const focusScoreElement = document.getElementById('focus-score');
  if (!focusScoreElement) return;

  try {
    const todayScore = await getTodayFocusScore();

    focusScoreElement.textContent = todayScore;

    // Update tooltip and color based on score
    const focusScoreStat = document.getElementById('focus-score-stat');
    if (focusScoreStat) {
      let rating = 'Good';

      // Reset classes
      focusScoreStat.classList.remove('score-excellent', 'score-good', 'score-fair', 'score-poor');

      if (todayScore >= 80) {
        rating = 'Excellent';
        focusScoreStat.classList.add('score-excellent');

        // Brief accent ring pulse on the tile (styled via #score-celebration in dashboard.css)
        if (!document.getElementById('score-celebration')) {
          const celebration = document.createElement('div');
          celebration.id = 'score-celebration';
          celebration.setAttribute('aria-hidden', 'true');
          focusScoreStat.appendChild(celebration);
          setTimeout(() => celebration.remove(), 700);
        }
      } else if (todayScore >= 60) {
        rating = 'Good';
        focusScoreStat.classList.add('score-good');
      } else if (todayScore >= 40) {
        rating = 'Fair';
        focusScoreStat.classList.add('score-fair');
      } else {
        rating = 'Needs Improvement';
        focusScoreStat.classList.add('score-poor');
      }

      focusScoreStat.title = `Today's Focus Score: ${todayScore}/100 (${rating})`;
    }
  } catch (error) {
    console.error('Error updating focus score:', error);
  }
}

// ========================================
// Settings Panel - Accessibility Toggles
// ========================================

// High contrast toggle (settings.highContrastMode + body.high-contrast)
const highContrastToggle = document.getElementById('high-contrast-toggle');
if (highContrastToggle) {
  getSettings()
    .then((settings) => {
      const enabled = Boolean(settings.highContrastMode);
      highContrastToggle.checked = enabled;
      document.body.classList.toggle('high-contrast', enabled);
    })
    .catch((err) => console.warn('Unable to load high-contrast setting', err));

  highContrastToggle.addEventListener('change', async (e) => {
    const enabled = e.target.checked;
    try {
      await updateSettings({ highContrastMode: enabled });
    } catch (err) {
      console.warn('Unable to save high-contrast setting', err);
    }
    document.body.classList.toggle('high-contrast', enabled);
    showToast(enabled ? 'High contrast enabled' : 'High contrast disabled');
  });
}

const geoLookupToggle = document.getElementById('geo-lookup-toggle');
if (geoLookupToggle) {
  getSettings()
    .then((settings) => {
      geoLookupToggle.checked = settings.geoLookupEnabled === true;
    })
    .catch((err) => console.warn('Unable to load map lookup setting', err));

  geoLookupToggle.addEventListener('change', async (e) => {
    const enabled = e.target.checked;
    if (enabled) {
      const granted = await requestGeoLookupPermission();
      if (!granted) {
        e.target.checked = false;
        showToast('Location lookup needs permission for ipwho.is');
        return;
      }
    }
    try {
      await updateSettings({ geoLookupEnabled: enabled });
      await updateMapView(null, { reuseLast: true });
      showToast(enabled ? 'Website location lookup on' : 'Website location lookup off');
    } catch (err) {
      console.warn('Unable to save map lookup setting', err);
      e.target.checked = !enabled;
      showToast('Unable to save that setting');
    }
  });
}

// Dark Mode Toggle
const darkModeToggle = document.getElementById('dark-mode');
if (darkModeToggle) {
  // Load saved preference (default is true/checked)
  chrome.storage.local.get(['darkMode'], (result) => {
    const isDarkMode = result.darkMode !== false; // Default to true
    darkModeToggle.checked = isDarkMode;

    if (!isDarkMode) {
      document.body.classList.add('light-mode');
    }
  });

  // Handle toggle change
  darkModeToggle.addEventListener('change', (e) => {
    const enabled = e.target.checked;
    chrome.storage.local.set({ darkMode: enabled });

    if (enabled) {
      document.body.classList.remove('light-mode');
      showToast('Dark Mode enabled');
    } else {
      document.body.classList.add('light-mode');
      showToast('Light Mode enabled');
    }
  });
}

// Toast notification helper
function showToast(message) {
  const toast = document.getElementById('settings-toast');
  if (toast) {
    toast.textContent = message;
    toast.style.display = 'block';
    toast.style.opacity = '1';

    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => {
        toast.style.display = 'none';
      }, 300);
    }, 2000);
  }
}
