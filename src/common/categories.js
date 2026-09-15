/**
 * Domain Categorization Logic
 * Shared between dashboard and popup
 */

export const CATEGORY_PALETTE = {
  social: '#d9636c', // Muted red for distractions
  entertainment: '#d9953f', // Muted amber
  productivity: '#4aa3a2', // Muted teal
  development: '#5b8def', // Muted blue
  news: '#9b6dd6', // Muted purple
  shopping: '#c96aa8', // Muted pink
  other: '#6e6e6e', // Muted gray
};

export const CATEGORY_CONFIG = {
  social: {
    keywords: [
      'facebook',
      'twitter',
      'x.com',
      'instagram',
      'linkedin',
      'reddit',
      'tiktok',
      'snapchat',
      'pinterest',
      'discord',
      'whatsapp',
      'telegram',
    ],
    name: 'Social Media',
    color: CATEGORY_PALETTE.social,
    sentiment: 'distraction',
  },
  entertainment: {
    keywords: [
      'youtube',
      'netflix',
      'twitch',
      'spotify',
      'soundcloud',
      'hulu',
      'disney',
      'hbo',
      'primevideo',
      '9gag',
      'buzzfeed',
    ],
    name: 'Entertainment',
    color: CATEGORY_PALETTE.entertainment,
    sentiment: 'distraction',
  },
  productivity: {
    keywords: [
      'gmail',
      'outlook',
      'slack',
      'notion',
      'trello',
      'asana',
      'jira',
      'confluence',
      'linear',
      'zoom',
      'meet.google',
      'docs.google',
      'drive.google',
      'dropbox',
      'figma',
    ],
    name: 'Productivity',
    color: CATEGORY_PALETTE.productivity,
    sentiment: 'productive',
  },
  development: {
    keywords: [
      'github',
      'gitlab',
      'stackoverflow',
      'dev.to',
      'codepen',
      'codesandbox',
      'repl.it',
      'w3schools',
      'mdn',
      'mozilla',
    ],
    name: 'Development',
    color: CATEGORY_PALETTE.development,
    sentiment: 'productive',
  },
  news: {
    keywords: [
      'news',
      'cnn',
      'bbc',
      'nytimes',
      'guardian',
      'medium',
      'substack',
      'forbes',
      'bloomberg',
      'wsj',
      'reuters',
    ],
    name: 'News & Media',
    color: CATEGORY_PALETTE.news,
    sentiment: 'neutral',
  },
  shopping: {
    keywords: ['amazon', 'ebay', 'etsy', 'shopify', 'walmart', 'target', 'alibaba', 'bestbuy'],
    name: 'Shopping',
    color: CATEGORY_PALETTE.shopping,
    sentiment: 'neutral',
  },
};

/**
 * Check whether a keyword matches a domain using label-aligned rules.
 *
 * The legacy substring `includes` match over-matched (F-BUG-010): the
 * user's dev URL `target.example.net` was classified as shopping because
 * `'target.example.net'.includes('target')` is true. The new rule
 * requires the keyword to align to whole labels:
 *
 *   1. domain === keyword                           e.g. `x.com`
 *   2. registered part of domain === keyword        e.g. `target.com`
 *      (registered = labels minus the TLD label)        registered = `target`
 *   3. registered part ends with `.` + keyword      e.g. `api.target.com`
 *      (subdomain of a registered keyword)               registered = `api.target`
 *
 * Multi-label keywords (`meet.google`, `docs.google`, `dev.to`) work
 * the same way: the keyword is matched against the registered part
 * (everything except the rightmost TLD label).
 *
 * `target.example.net` is rejected because its registered part is
 * `target.example`, which neither equals nor ends with `.target`.
 * `news.example.com` is rejected the same way: it is the "nuanced"
 * dev-URL case from the issue. `api.target.com` and `target.com` both
 * match because their registered parts are `api.target` and `target`.
 *
 * Matching is case-insensitive (callers lowercase the inputs) and
 * ignores a trailing dot on the domain.
 *
 * @param {string} domain - Lowercased domain (no protocol, no path).
 * @param {string} keyword - Lowercased keyword from a category config.
 * @returns {boolean} True when the keyword matches the domain.
 */
function matchesKeyword(domain, keyword) {
  if (!domain || !keyword) return false;
  const host = domain.endsWith('.') ? domain.slice(0, -1) : domain;
  if (!host) return false;
  if (host === keyword) return true;
  const labels = host.split('.').filter((l) => l.length > 0);
  if (labels.length < 2) return false;
  // Registered domain = everything except the rightmost (TLD) label.
  const registered = labels.slice(0, -1).join('.');
  if (registered === keyword) return true;
  return registered.endsWith(`.${keyword}`);
}

/**
 * Categorize domain into a group
 * @param {string} domain - Domain name
 * @returns {Object} - Category info {name, color, key, sentiment}
 */
export function categorizeDomain(domain) {
  const domainLower = (domain || '').toLowerCase();

  /* eslint-disable implicit-arrow-linebreak, function-paren-newline */
  const match = Object.entries(CATEGORY_CONFIG).find(([, config]) =>
    config.keywords.some((k) => matchesKeyword(domainLower, k)),
  );
  /* eslint-enable implicit-arrow-linebreak, function-paren-newline */

  if (match) {
    const [key, config] = match;
    return {
      name: config.name,
      color: config.color,
      key,
      sentiment: config.sentiment,
    };
  }

  return {
    name: 'Other',
    color: CATEGORY_PALETTE.other,
    key: 'other',
    sentiment: 'neutral',
  };
}
