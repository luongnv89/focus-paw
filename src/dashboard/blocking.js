import { getLimits, setLimitForDomain, normalizeLimitConfig } from '../background/storage.js';
import { updateBlockingRules } from '../background/limits.js';
import { validateDomain, validateLimitConfig } from '../common/limit-validation.js';
import { svgIcon } from '../common/icons.js';

/**
 * Ask the user for the optional <all_urls> host permission required for
 * declarativeNetRequest redirect-blocking. Tracking and toasts work without it.
 * Silent no-op if already granted, denied, or if the API is unavailable.
 * @returns {Promise<boolean>} whether the permission is now granted
 */
async function ensureBlockingHostPermission() {
  try {
    if (!chrome.permissions || !chrome.permissions.contains) return true;
    const already = await chrome.permissions.contains({ origins: ['<all_urls>'] });
    if (already) return true;
    return await chrome.permissions.request({ origins: ['<all_urls>'] });
  } catch (error) {
    console.debug('[Blocking] host permission request failed', error);
    return false;
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  await renderRulesList();
  setupForm();
});

async function renderRulesList() {
  const rulesList = document.getElementById('rules-list');
  const emptyState = document.getElementById('rules-empty');
  const limits = await getLimits();
  const entries = Object.entries(limits);

  rulesList.innerHTML = '';

  const countChip = document.getElementById('rules-count');
  if (countChip) {
    countChip.textContent = String(entries.length);
  }

  if (entries.length === 0) {
    emptyState.style.display = 'block';
    return;
  }

  emptyState.style.display = 'none';

  entries.forEach(([domain, config]) => {
    const normalized = normalizeLimitConfig(config);
    const item = document.createElement('div');
    item.className = 'rule-item';

    const ruleInfo = document.createElement('div');
    ruleInfo.className = 'rule-info';

    const ruleIcon = document.createElement('div');
    ruleIcon.className = 'rule-icon';
    // Favicon removed for privacy — no third-party favicon fetches
    // (see PRIVACY.md "Third-Party Services" and issue #53 / F-SEC-001).
    ruleIcon.appendChild(svgIcon('globe', { size: 18 }));

    const ruleDetails = document.createElement('div');
    ruleDetails.className = 'rule-details';
    const domainHeading = document.createElement('h3');
    domainHeading.textContent = domain;
    const badgesContainer = document.createElement('div');
    badgesContainer.className = 'rule-badges';

    const createBadge = (label, extraClass = '') => {
      const badge = document.createElement('span');
      badge.className = extraClass ? `rule-badge ${extraClass}` : 'rule-badge';
      badge.textContent = label;
      return badge;
    };

    if (!normalized.enabled) {
      badgesContainer.appendChild(createBadge('Disabled', 'is-disabled'));
    } else {
      badgesContainer.appendChild(createBadge('Active', 'is-active'));
      if (normalized.fiveHour.enabled) {
        badgesContainer.appendChild(createBadge(`${normalized.fiveHour.limit} / 5h`));
      }
      if (normalized.daily.enabled) {
        badgesContainer.appendChild(createBadge(`${normalized.daily.limit} / day`));
      }
    }

    ruleDetails.append(domainHeading, badgesContainer);
    ruleInfo.append(ruleIcon, ruleDetails);

    const ruleActions = document.createElement('div');
    ruleActions.className = 'rule-actions';

    const toggleTitle = normalized.enabled ? 'Disable' : 'Enable';
    const toggleIcon = normalized.enabled ? 'pause' : 'play';

    const toggleBtn = document.createElement('button');
    toggleBtn.className = 'btn btn-ghost btn-icon-only toggle-btn';
    toggleBtn.title = toggleTitle;
    toggleBtn.setAttribute('aria-label', `${toggleTitle} ${domain}`);
    toggleBtn.dataset.domain = domain;
    toggleBtn.appendChild(svgIcon(toggleIcon, { size: 16 }));
    toggleBtn.addEventListener('click', () => toggleRule(domain, normalized));

    const editBtn = document.createElement('button');
    editBtn.className = 'btn btn-ghost btn-icon-only edit-btn';
    editBtn.title = 'Edit';
    editBtn.setAttribute('aria-label', `Edit ${domain}`);
    editBtn.dataset.domain = domain;
    editBtn.appendChild(svgIcon('pencil', { size: 16 }));
    editBtn.addEventListener('click', () => editRule(domain, normalized));

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'btn btn-ghost btn-icon-only delete-btn';
    deleteBtn.title = 'Delete';
    deleteBtn.setAttribute('aria-label', `Delete ${domain}`);
    deleteBtn.dataset.domain = domain;
    deleteBtn.appendChild(svgIcon('trash', { size: 16 }));
    deleteBtn.addEventListener('click', () => deleteRule(domain));

    ruleActions.append(toggleBtn, editBtn, deleteBtn);
    item.append(ruleInfo, ruleActions);

    rulesList.appendChild(item);
  });
}

function setupForm() {
  const form = document.getElementById('limit-form');
  const errorEl = document.getElementById('limit-error');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorEl.textContent = '';

    const formData = new FormData(form);
    const rawDomain = formData.get('domain') || '';

    const domainRes = validateDomain(rawDomain);
    if (!domainRes.valid) {
      errorEl.textContent = domainRes.error;
      return;
    }
    const domain = domainRes.normalized;

    try {
      const fiveHourEnabled = formData.get('fiveHourEnabled') === 'on';
      const dailyEnabled = formData.get('dailyEnabled') === 'on';
      const fiveHourLimit = formData.get('fiveHourLimit');
      const dailyLimit = formData.get('dailyLimit');

      const limitRes = validateLimitConfig({
        fiveHourEnabled,
        fiveHourLimit,
        dailyEnabled,
        dailyLimit,
      });
      if (!limitRes.valid) {
        errorEl.textContent = limitRes.error;
        return;
      }

      const config = {
        enabled: formData.get('enabled') === 'on',
        fiveHour: {
          enabled: fiveHourEnabled,
          limit: fiveHourEnabled ? Number(fiveHourLimit) : 10,
        },
        daily: {
          enabled: dailyEnabled,
          limit: dailyEnabled ? Number(dailyLimit) : 20,
        },
      };

      await setLimitForDomain(domain, config);
      // First time a user adds a limit, prompt for the optional <all_urls> host
      // permission so redirect-blocking actually works. Decline = tracking/toasts
      // still work; only redirect blocking is disabled.
      await ensureBlockingHostPermission();
      await updateBlockingRules();

      form.reset();
      // Restore default checked states
      document.getElementById('five-hour-enabled').checked = true;
      document.getElementById('daily-enabled').checked = true;
      document.getElementById('limit-enabled').checked = true;

      await renderRulesList();

      // Scroll to list
      document.getElementById('rules-list').scrollIntoView({ behavior: 'smooth' });
    } catch (error) {
      console.error('Error saving rule:', error);
      errorEl.textContent = 'Failed to save rule. Please try again.';
    }
  });
}

async function toggleRule(domain, currentConfig) {
  const newConfig = { ...currentConfig, enabled: !currentConfig.enabled };
  await setLimitForDomain(domain, newConfig);
  await updateBlockingRules();
  await renderRulesList();
}

async function deleteRule(domain) {
  // eslint-disable-next-line no-restricted-globals, no-alert
  if (confirm(`Are you sure you want to remove the limits for ${domain}?`)) {
    await setLimitForDomain(domain, null);
    await updateBlockingRules();
    await renderRulesList();
  }
}

function editRule(domain, config) {
  const form = document.getElementById('limit-form');
  form.elements.domain.value = domain;
  form.elements.enabled.checked = config.enabled;

  form.elements.fiveHourEnabled.checked = config.fiveHour?.enabled ?? true;
  form.elements.fiveHourLimit.value = config.fiveHour?.limit ?? 10;

  form.elements.dailyEnabled.checked = config.daily?.enabled ?? true;
  form.elements.dailyLimit.value = config.daily?.limit ?? 20;

  // Scroll to form
  form.scrollIntoView({ behavior: 'smooth' });
  form.elements.domain.focus();
}
