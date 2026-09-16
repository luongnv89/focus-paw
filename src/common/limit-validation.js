/**
 * Shared limit-form validation controller for FocusPaw.
 * Single source of truth for all three limit forms.
 */

import { canonicalizeDomain } from './domain-utils.js';

export const LIMIT_MIN = 1;
export const LIMIT_MAX = 1000;
export const LIMIT_DOMAIN_REGEX = /^[a-z0-9.-]+$/;

/**
 * Validate a single limit value (positive integer within [LIMIT_MIN, LIMIT_MAX]).
 * @param {string|number} rawValue
 * @returns {{valid: boolean, value?: number, error?: string}}
 */
export function validateLimitValue(rawValue) {
  if (rawValue === '' || rawValue === null || rawValue === undefined) {
    return { valid: false, error: 'Limit must be a positive integer.' };
  }
  const num = Number(rawValue);
  if (!Number.isInteger(num) || num < LIMIT_MIN) {
    return { valid: false, error: 'Enter a positive whole number (\u2265 1).' };
  }
  if (num > LIMIT_MAX) {
    return { valid: false, error: `Limit must be \u2264 ${LIMIT_MAX}.` };
  }
  return { valid: true, value: num };
}

/**
 * Validate a domain string (normalized).
 * @param {string} rawDomain
 * @returns {{valid: boolean, normalized?: string, error?: string}}
 */
export function validateDomain(rawDomain) {
  const normalized = canonicalizeDomain(
    rawDomain
      .trim()
      .replace(/^https?:\/\//i, '')
      .split('/')[0],
  );
  if (!normalized || !LIMIT_DOMAIN_REGEX.test(normalized) || !normalized.includes('.')) {
    return { valid: false, error: 'Enter a valid domain like example.com' };
  }
  return { valid: true, normalized };
}

/**
 * Validate a full limit config (shared by all three forms).
 * @param {Object} config
 * @param {boolean} config.fiveHourEnabled
 * @param {string|number} config.fiveHourLimit
 * @param {boolean} config.dailyEnabled
 * @param {string|number} config.dailyLimit
 * @returns {{valid: boolean, error?: string}}
 */
// eslint-disable-next-line object-curly-newline
export function validateLimitConfig({ fiveHourEnabled, fiveHourLimit, dailyEnabled, dailyLimit }) {
  if (fiveHourEnabled) {
    const r = validateLimitValue(fiveHourLimit);
    if (!r.valid) return { valid: false, error: r.error || 'Enter a positive 5-hour limit.' };
  }
  if (dailyEnabled) {
    const r = validateLimitValue(dailyLimit);
    if (!r.valid) return { valid: false, error: r.error || 'Enter a positive daily limit.' };
  }
  return { valid: true };
}

/**
 * Unified handler for limit form submissions — validates and builds normalized config.
 * @param {Object} params
 * @param {string} params.domain - already normalized or raw (will normalize)
 * @param {boolean} params.enabled
 * @param {boolean} params.fiveHourEnabled
 * @param {string|number} params.fiveHourLimit
 * @param {boolean} params.dailyEnabled
 * @param {string|number} params.dailyLimit
 * @returns {{valid: boolean, error?: string, domain?: string, config?: Object}}
 */
export function buildValidatedLimitConfig({
  domain,
  enabled,
  fiveHourEnabled,
  fiveHourLimit,
  dailyEnabled,
  dailyLimit,
}) {
  const domainRes = validateDomain(domain);
  if (!domainRes.valid) return { valid: false, error: domainRes.error };

  const cfgRes = validateLimitConfig({
    fiveHourEnabled,
    fiveHourLimit,
    dailyEnabled,
    dailyLimit,
  });
  if (!cfgRes.valid) return { valid: false, error: cfgRes.error };

  const fiveHourNorm = fiveHourEnabled ? validateLimitValue(fiveHourLimit).value : 10;
  const dailyNorm = dailyEnabled ? validateLimitValue(dailyLimit).value : 20;

  return {
    valid: true,
    domain: domainRes.normalized,
    config: {
      enabled,
      fiveHour: { enabled: fiveHourEnabled, limit: fiveHourNorm },
      daily: { enabled: dailyEnabled, limit: dailyNorm },
    },
  };
}
