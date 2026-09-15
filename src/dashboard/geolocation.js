/**
 * Opt-in HTTPS hostname geolocation for the dashboard Map view.
 * Default path is local-only; lookups run only when settings.geoLookupEnabled is true.
 * Provider: ipwho.is (HTTPS JSON). Never uses HTTP ip-api or device geolocation.
 */

import { GEO_CACHE_TTL_MS, getGeoLookupCache, putGeoLookupEntries } from '../background/storage.js';

export const GEO_LOOKUP_ORIGIN = 'https://ipwho.is';
export const GEO_LOOKUP_ORIGINS = ['https://ipwho.is/*'];
export const LOOKUP_MIN_INTERVAL_MS = 400;
export const LOOKUP_MAX_PER_PASS = 20;

function delay(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/**
 * @param {unknown} domain
 * @returns {boolean}
 */
export function isValidLookupDomain(domain) {
  if (typeof domain !== 'string') return false;
  const trimmed = domain.trim().toLowerCase();
  if (!trimmed || trimmed.length > 253) return false;
  if (trimmed.includes('/') || trimmed.includes(':') || trimmed.includes(' ')) return false;
  return /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/.test(trimmed);
}

/**
 * @param {string} domain
 * @returns {string|null}
 */
export function buildGeoLookupUrl(domain) {
  if (!isValidLookupDomain(domain)) return null;
  return `${GEO_LOOKUP_ORIGIN}/${encodeURIComponent(domain.trim().toLowerCase())}`;
}

/**
 * @param {Object|null} payload
 * @returns {{lat:number,lon:number,country:string}|null}
 */
export function parseIpwhoResponse(payload) {
  if (!payload || payload.success === false) return null;
  const lat = Number(payload.latitude);
  const lon = Number(payload.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  if (Math.abs(lat) > 90 || Math.abs(lon) > 180) return null;
  const country = typeof payload.country === 'string' ? payload.country : '';
  return { lat, lon, country };
}

/**
 * @param {string} domain
 * @param {Object} [options]
 * @returns {Promise<{lat:number,lon:number,country:string}|null>}
 */
export async function lookupDomainLocation(
  domain,
  { fetchImpl = globalThis.fetch, timeoutMs = 8000 } = {},
) {
  const url = buildGeoLookupUrl(domain);
  if (!url || typeof fetchImpl !== 'function') return null;

  const controller = typeof AbortController === 'function' ? new AbortController() : null;
  let timer = null;
  if (controller && timeoutMs > 0) {
    timer = setTimeout(() => controller.abort(), timeoutMs);
  }

  try {
    const res = await fetchImpl(url, {
      method: 'GET',
      signal: controller ? controller.signal : undefined,
    });
    if (!res || !res.ok) return null;
    const payload = await res.json();
    return parseIpwhoResponse(payload);
  } catch {
    return null;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function isFreshHit(entry, now, ttlMs) {
  if (!entry || typeof entry.fetchedAt !== 'number') return false;
  return now - entry.fetchedAt <= ttlMs;
}

/**
 * Resolve lat/lon for tracked domains. Performs zero network when enabled is false.
 * @param {string[]} domains
 * @param {Object} [options]
 */
export async function resolveDomainLocations(
  domains,
  {
    enabled = false,
    fetchImpl = globalThis.fetch,
    now = Date.now(),
    intervalMs = LOOKUP_MIN_INTERVAL_MS,
    maxPerPass = LOOKUP_MAX_PER_PASS,
    ttlMs = GEO_CACHE_TTL_MS,
    getCache = getGeoLookupCache,
    putEntries = putGeoLookupEntries,
    sleep = delay,
  } = {},
) {
  const unique = [...new Set((domains || []).filter(isValidLookupDomain))];
  if (!enabled) {
    return {
      locations: {},
      fetched: 0,
      fromCache: 0,
      skipped: unique.length,
    };
  }

  const cache = await getCache();
  const locations = {};
  const toFetch = [];
  let fromCache = 0;

  unique.forEach((domain) => {
    const hit = cache[domain];
    const hasCoords = Number.isFinite(hit?.lat) && Number.isFinite(hit?.lon);
    if (isFreshHit(hit, now, ttlMs) && hit.ok && hasCoords) {
      locations[domain] = hit;
      fromCache += 1;
      return;
    }
    if (isFreshHit(hit, now, ttlMs) && hit.ok === false) {
      return;
    }
    toFetch.push(domain);
  });

  const batch = toFetch.slice(0, Math.max(0, maxPerPass));
  const fresh = {};

  /* eslint-disable no-await-in-loop -- sequential rate limit for the opt-in HTTPS API */
  for (let i = 0; i < batch.length; i += 1) {
    if (i > 0 && intervalMs > 0) {
      await sleep(intervalMs);
    }
    const domain = batch[i];
    const loc = await lookupDomainLocation(domain, { fetchImpl });
    const fetchedAt = Date.now();
    let entry = {
      lat: null,
      lon: null,
      country: '',
      fetchedAt,
      ok: false,
    };
    if (loc) {
      entry = {
        lat: loc.lat,
        lon: loc.lon,
        country: loc.country,
        fetchedAt,
        ok: true,
      };
    }
    fresh[domain] = entry;
    if (entry.ok) {
      locations[domain] = entry;
    }
  }
  /* eslint-enable no-await-in-loop */

  if (Object.keys(fresh).length > 0) {
    await putEntries(fresh);
  }

  return {
    locations,
    fetched: batch.length,
    fromCache,
    skipped: unique.length - batch.length,
  };
}

/**
 * Request optional host access for the lookup origin. Does not add required host_permissions.
 * @returns {Promise<boolean>}
 */
export async function requestGeoLookupPermission() {
  if (!globalThis.chrome?.permissions?.request) return true;
  return new Promise((resolve) => {
    chrome.permissions.request({ origins: GEO_LOOKUP_ORIGINS }, (granted) => {
      if (chrome.runtime?.lastError) {
        resolve(false);
        return;
      }
      resolve(Boolean(granted));
    });
  });
}
