/**
 * Canonicalize a hostname for storage and limit matching.
 * Tracking treats the conventional `www.` host as the same site as its root.
 * @param {string} hostname
 * @returns {string}
 */
export function canonicalizeDomain(hostname) {
  const normalized = String(hostname || '')
    .trim()
    .toLowerCase()
    .replace(/\.$/, '');
  return normalized.startsWith('www.') ? normalized.slice(4) : normalized;
}
