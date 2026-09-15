/**
 * Content script for displaying countdown toast notifications
 * Shows remaining visits for limited sites
 */

// Only run once per page
if (!window.focusBearToastInjected) {
  window.focusBearToastInjected = true;

  // Create and inject toast container
  const toastContainer = document.createElement('div');
  toastContainer.id = 'focuspaw-toast-container';
  toastContainer.setAttribute('role', 'status');
  toastContainer.setAttribute('aria-live', 'polite');
  toastContainer.setAttribute('aria-atomic', 'true');

  // Inject at document start or when DOM is ready
  const injectToast = () => {
    if (document.body) {
      document.body.appendChild(toastContainer);
      return;
    }

    // Retry when DOM is ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        document.body.appendChild(toastContainer);
      });
    }
  };

  injectToast();

  const SVG_NS = 'http://www.w3.org/2000/svg';
  const SEVERITY_ICON_SHAPES = {
    warning: [
      ['path', { d: 'm21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3z' }],
      ['path', { d: 'M12 9v4' }],
      ['path', { d: 'M12 17h.01' }],
    ],
    danger: [
      ['circle', { cx: '12', cy: '12', r: '10' }],
      ['path', { d: 'm4.9 4.9 14.2 14.2' }],
    ],
  };

  const buildSeverityIcon = (severity) => {
    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('width', '20');
    svg.setAttribute('height', '20');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '1.75');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
    svg.setAttribute('aria-hidden', 'true');
    SEVERITY_ICON_SHAPES[severity].forEach(([tag, attrs]) => {
      const el = document.createElementNS(SVG_NS, tag);
      Object.entries(attrs).forEach(([name, value]) => el.setAttribute(name, value));
      svg.appendChild(el);
    });
    return svg;
  };

  /**
   * Show a toast notification
   * @param {string} domain - The domain name
   * @param {number} remaining - Number of visits remaining
   * @param {number} limit - Total daily limit
   */
  const showToast = (domain, remaining, limit, limitType = 'daily') => {
    // Create toast element
    const toast = document.createElement('div');
    toast.className = 'focuspaw-toast';
    toast.setAttribute('role', 'alert');

    // Determine severity
    let severity = 'info';
    const percentRemaining = (remaining / limit) * 100;
    if (remaining === 0) {
      severity = 'danger';
    } else if (percentRemaining <= 20) {
      severity = 'warning';
    }

    toast.classList.add(`focuspaw-toast-${severity}`);

    // Build message text
    const limitLabel = limitType === 'fiveHour' ? '5-hour window' : 'day';
    const timeframeLabel = limitType === 'fiveHour' ? 'window' : 'day';
    let messageText;
    if (remaining === 0) {
      messageText = `Limit reached for this ${limitLabel}`;
    } else if (remaining === 1) {
      messageText = `1 visit left this ${timeframeLabel}`;
    } else {
      messageText = `${remaining} visits left this ${limitLabel}`;
    }

    // Icon based on severity: bear mascot for info; inline SVG for
    // warning/danger (the sprite isn't reachable from content scripts).
    // Colored via CSS `color` on .focuspaw-toast-icon (stroke="currentColor").
    const iconEl = document.createElement('div');
    iconEl.className = 'focuspaw-toast-icon';
    if (severity === 'info') {
      iconEl.textContent = '🐻';
    } else {
      iconEl.appendChild(buildSeverityIcon(severity));
    }

    const contentEl = document.createElement('div');
    contentEl.className = 'focuspaw-toast-content';
    const domainStrong = document.createElement('strong');
    domainStrong.textContent = domain;
    const messageEl = document.createElement('span');
    messageEl.className = 'focuspaw-toast-message';
    messageEl.textContent = messageText;
    contentEl.appendChild(domainStrong);
    contentEl.appendChild(document.createElement('br'));
    contentEl.appendChild(messageEl);

    toast.append(iconEl, contentEl);

    // Add to container
    toastContainer.appendChild(toast);

    // Trigger animation
    setTimeout(() => {
      toast.classList.add('focuspaw-toast-visible');
    }, 10);

    // Auto-hide after 3.5 seconds
    setTimeout(() => {
      toast.classList.remove('focuspaw-toast-visible');
      // Remove from DOM after fade out
      setTimeout(() => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      }, 300);
    }, 3500);
  };

  // Listen for messages from background script
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'SHOW_COUNTDOWN_TOAST') {
      // prettier-ignore
      const {
        domain,
        remaining,
        limit,
        limitType,
      } = message;
      showToast(domain, remaining, limit, limitType);
      sendResponse({ success: true });
    }
    return false; // No async response needed
  });
}
