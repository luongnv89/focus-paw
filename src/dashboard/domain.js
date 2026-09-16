import {
  getLimits,
  setLimitForDomain,
  normalizeLimitConfig,
  createDefaultLimitConfig,
  getVisits,
  getTodayKey,
  deleteDomainData,
} from '../background/storage.js';
import { validateLimitConfig } from '../common/limit-validation.js';
import { ensureBlockingHostPermission } from '../common/blocking-permission.js';

let currentDomain = '';
let currentLimitConfig = null;
let deleteConfirmPending = false;
let deleteConfirmTimeoutId = null;

function resetDeleteConfirmation(button) {
  deleteConfirmPending = false;
  if (deleteConfirmTimeoutId) {
    clearTimeout(deleteConfirmTimeoutId);
    deleteConfirmTimeoutId = null;
  }

  if (button.dataset.originalLabel) {
    button.textContent = button.dataset.originalLabel;
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  const params = new URLSearchParams(window.location.search);
  currentDomain = params.get('domain');

  if (!currentDomain) {
    showToast('Missing domain. Go back to the dashboard to pick a domain.');
    disableForms();
    return;
  }

  document.title = `FocusPaw • ${currentDomain}`;
  const titleEl = document.getElementById('domain-title');
  if (titleEl) {
    titleEl.textContent = currentDomain;
  }

  setupNavigation();
  setupLimitFormListeners();
  setupDeleteButton();

  await refreshDomainData();
});

function setupNavigation() {
  const backBtn = document.getElementById('back-btn');
  if (backBtn) {
    backBtn.addEventListener('click', () => {
      window.location.href = chrome.runtime.getURL('src/dashboard/index.html');
    });
  }
}

function disableForms() {
  const form = document.getElementById('domain-limit-form');
  if (form) {
    Array.from(form.elements).forEach((el) => {
      el.disabled = true;
    });
  }
  const deleteBtn = document.getElementById('delete-domain-data');
  if (deleteBtn) deleteBtn.disabled = true;
}

async function refreshDomainData() {
  await Promise.all([loadLimitConfig(), loadDomainStats()]);
}

async function loadLimitConfig() {
  const limits = await getLimits();
  const rawConfig = limits[currentDomain];
  currentLimitConfig = rawConfig ? normalizeLimitConfig(rawConfig) : null;
  applyConfigToForm(currentLimitConfig || createDefaultLimitConfig({ enabled: false }));
}

function applyConfigToForm(config) {
  const form = document.getElementById('domain-limit-form');
  if (!form) return;

  form.elements.enabled.checked = config.enabled;
  form.elements.fiveHourEnabled.checked = config.fiveHour.enabled;
  form.elements.fiveHourLimit.value = config.fiveHour.limit;
  form.elements.dailyEnabled.checked = config.daily.enabled;
  form.elements.dailyLimit.value = config.daily.limit;
  updateConfigSectionOpacity();
}

function setupLimitFormListeners() {
  const form = document.getElementById('domain-limit-form');
  if (!form) return;

  const enabledToggle = form.elements.enabled;
  const fiveHourToggle = form.elements.fiveHourEnabled;
  const dailyToggle = form.elements.dailyEnabled;

  if (enabledToggle) {
    enabledToggle.addEventListener('change', updateConfigSectionOpacity);
  }
  if (fiveHourToggle) {
    fiveHourToggle.addEventListener('change', () => {
      const section = document.getElementById('detail-five-hour-config');
      if (section) section.style.opacity = fiveHourToggle.checked ? '1' : '0.5';
    });
  }
  if (dailyToggle) {
    dailyToggle.addEventListener('change', () => {
      const section = document.getElementById('detail-daily-config');
      if (section) section.style.opacity = dailyToggle.checked ? '1' : '0.5';
    });
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const errorEl = document.getElementById('domain-limit-error');

    const enabled = form.elements.enabled.checked;
    const fiveHourEnabled = form.elements.fiveHourEnabled.checked;
    const fiveHourLimit = form.elements.fiveHourLimit.value;
    const dailyEnabled = form.elements.dailyEnabled.checked;
    const dailyLimit = form.elements.dailyLimit.value;

    const limitRes = validateLimitConfig({
      fiveHourEnabled,
      fiveHourLimit,
      dailyEnabled,
      dailyLimit,
    });
    if (!limitRes.valid) {
      if (errorEl) errorEl.textContent = limitRes.error;
      return;
    }

    if (errorEl) errorEl.textContent = '';

    try {
      const config = {
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

      if (config.enabled && !(await ensureBlockingHostPermission())) {
        if (errorEl) errorEl.textContent = 'Website access is required to enable blocking.';
        return;
      }

      await setLimitForDomain(currentDomain, config);
      showToast('Limit saved.');
      await loadLimitConfig();
    } catch (error) {
      console.error('Unable to save limit for domain:', error);
      showToast('Unable to save limit. Try again.');
    }
  });
}

function updateConfigSectionOpacity() {
  const form = document.getElementById('domain-limit-form');
  if (!form) return;

  const configSection = document.getElementById('detail-limit-config-section');
  const fiveHourConfig = document.getElementById('detail-five-hour-config');
  const dailyConfig = document.getElementById('detail-daily-config');

  if (configSection) {
    configSection.style.opacity = form.elements.enabled.checked ? '1' : '0.5';
  }
  if (fiveHourConfig) {
    fiveHourConfig.style.opacity = form.elements.fiveHourEnabled.checked ? '1' : '0.5';
  }
  if (dailyConfig) {
    dailyConfig.style.opacity = form.elements.dailyEnabled.checked ? '1' : '0.5';
  }
}

async function loadDomainStats() {
  const stats = await calculateDomainStats();
  updateStatsUI(stats);
}

async function calculateDomainStats() {
  const visits = await getVisits();
  const stats = {
    today: 0,
    week: 0,
    total: 0,
    lastVisit: null,
    history: [],
  };

  const todayKey = getTodayKey();
  const now = new Date();

  Object.entries(visits).forEach(([dateKey, domains]) => {
    const domainData = domains[currentDomain];
    if (!domainData) return;

    stats.total += domainData.count;
    if (dateKey === todayKey) {
      stats.today = domainData.count;
    }

    const dateObj = new Date(dateKey);
    const diffDays = (now - dateObj) / 86400000;
    if (diffDays <= 7) {
      stats.week += domainData.count;
    }

    if (!stats.lastVisit || domainData.lastVisit > stats.lastVisit) {
      stats.lastVisit = domainData.lastVisit;
    }

    stats.history.push({
      date: dateObj,
      count: domainData.count,
    });
  });

  stats.history.sort((a, b) => b.date - a.date);
  return stats;
}

function updateStatsUI(stats) {
  const todayEl = document.getElementById('stat-today');
  const weekEl = document.getElementById('stat-week');
  const totalEl = document.getElementById('stat-total');
  const lastVisitEl = document.getElementById('stat-last-visit');
  const historyList = document.getElementById('history-list');

  if (todayEl) todayEl.textContent = stats.today;
  if (weekEl) weekEl.textContent = stats.week;
  if (totalEl) totalEl.textContent = stats.total;
  if (lastVisitEl) {
    if (stats.lastVisit) {
      const lastVisitDate = new Date(stats.lastVisit);
      lastVisitEl.textContent = lastVisitDate.toLocaleString();
    } else {
      lastVisitEl.textContent = 'Never';
    }
  }

  if (historyList) {
    historyList.innerHTML = '';
    if (stats.history.length === 0) {
      const emptyItem = document.createElement('li');
      emptyItem.className = 'history-empty';
      emptyItem.textContent = 'No activity yet.';
      historyList.appendChild(emptyItem);
      return;
    }

    stats.history.slice(0, 7).forEach((entry) => {
      const item = document.createElement('li');
      item.className = 'history-item';
      const dayLabel = entry.date.toLocaleDateString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      });
      const strong = document.createElement('strong');
      strong.textContent = dayLabel;
      const span = document.createElement('span');
      span.textContent = `${entry.count} visits`;
      item.append(strong, span);
      historyList.appendChild(item);
    });
  }
}

function setupDeleteButton() {
  const deleteBtn = document.getElementById('delete-domain-data');
  if (!deleteBtn) return;

  deleteBtn.addEventListener('click', async () => {
    if (!deleteConfirmPending) {
      deleteConfirmPending = true;
      if (!deleteBtn.dataset.originalLabel) {
        deleteBtn.dataset.originalLabel = deleteBtn.textContent;
      }
      deleteBtn.textContent = 'Tap again to confirm';
      deleteConfirmTimeoutId = setTimeout(() => {
        resetDeleteConfirmation(deleteBtn);
      }, 4000);
      return;
    }

    resetDeleteConfirmation(deleteBtn);

    try {
      await deleteDomainData(currentDomain);
      showToast('Domain data deleted.');
      await refreshDomainData();
    } catch (error) {
      console.error('Unable to delete domain data:', error);
      showToast('Unable to delete data. Try again.');
    }
  });
}

function showToast(message) {
  const toast = document.getElementById('domain-toast');
  if (!toast) return;

  toast.textContent = message;
  toast.classList.add('visible');
  setTimeout(() => {
    toast.classList.remove('visible');
  }, 3500);
}
