/**
 * Opt-in HTTPS hostname geolocation for the dashboard Map view.
 * Default path is local-only; lookups run only when settings.geoLookupEnabled is true.
 * Flow: Cloudflare DoH (application/dns-json) → IPv4 → ipwho.is/{ip}.
 * Never uses HTTP ip-api, hostname paths on ipwho.is, or device geolocation.
 */

import { GEO_CACHE_TTL_MS, getGeoLookupCache, putGeoLookupEntries } from '../background/storage.js';

export const GEO_LOOKUP_ORIGIN = 'https://ipwho.is';
export const DNS_LOOKUP_ORIGIN = 'https://cloudflare-dns.com';
export const GEO_LOOKUP_ORIGINS = ['https://cloudflare-dns.com/*', 'https://ipwho.is/*'];
export const LOOKUP_MIN_INTERVAL_MS = 400;
export const LOOKUP_MAX_PER_PASS = 20;

const IPV4_OCTET = '(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)';
const IPV4_RE = new RegExp(`^(?:${IPV4_OCTET}\\.){3}${IPV4_OCTET}$`);

function delay(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/**
 * @param {unknown} value
 * @returns {boolean}
 */
export function isIpv4Address(value) {
  return typeof value === 'string' && IPV4_RE.test(value.trim());
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
 * ipwho.is is IP-only. Hostnames must not be interpolated into this path.
 * @param {string} ip
 * @returns {string|null}
 */
export function buildGeoLookupUrl(ip) {
  if (!isIpv4Address(ip)) return null;
  return `${GEO_LOOKUP_ORIGIN}/${ip.trim()}`;
}

/**
 * Cloudflare DNS-over-HTTPS JSON (application/dns-json).
 * @param {string} domain
 * @returns {string|null}
 */
export function buildDnsLookupUrl(domain) {
  if (!isValidLookupDomain(domain)) return null;
  const name = encodeURIComponent(domain.trim().toLowerCase());
  return `${DNS_LOOKUP_ORIGIN}/dns-query?name=${name}&type=A`;
}

/**
 * @param {Object|null} payload
 * @returns {string|null}
 */
export function parseDnsJsonARecord(payload) {
  if (!payload || payload.Status !== 0 || !Array.isArray(payload.Answer)) return null;
  const record = payload.Answer.find((rr) => rr && rr.type === 1 && typeof rr.data === 'string');
  if (!record) return null;
  const ip = record.data.trim();
  return isIpv4Address(ip) ? ip : null;
}

/**
 * @param {Object|null} payload
 * @returns {{lat:number,lon:number,country:string,region:string,city:string}|null}
 */
export function parseIpwhoResponse(payload) {
  if (!payload || payload.success === false) return null;
  const lat = Number(payload.latitude);
  const lon = Number(payload.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  if (Math.abs(lat) > 90 || Math.abs(lon) > 180) return null;
  const country = typeof payload.country === 'string' ? payload.country : '';
  const region = typeof payload.region === 'string' ? payload.region : '';
  const city = typeof payload.city === 'string' ? payload.city : '';
  return {
    lat,
    lon,
    country,
    region,
    city,
  };
}

function emptyLookupResult() {
  return { location: null, cacheNegative: false };
}

/**
 * Resolve hostname → IPv4 via DoH, then GET ipwho.is/{ip}.
 * HTTP 404 is a 7-day negative only when the ipwho query was a well-formed IP.
 * @param {string} domain
 * @param {Object} [options]
 * @returns {Promise<{
 *   location: {lat:number,lon:number,country:string,region:string,city:string}|null,
 *   cacheNegative: boolean
 * }>}
 */
export async function lookupDomainLocation(
  domain,
  { fetchImpl = globalThis.fetch, timeoutMs = 8000 } = {},
) {
  const dnsUrl = buildDnsLookupUrl(domain);
  if (!dnsUrl || typeof fetchImpl !== 'function') return emptyLookupResult();

  const controller = typeof AbortController === 'function' ? new AbortController() : null;
  let timer = null;
  if (controller && timeoutMs > 0) {
    timer = setTimeout(() => controller.abort(), timeoutMs);
  }

  async function request(url, headers) {
    return fetchImpl(url, {
      method: 'GET',
      signal: controller ? controller.signal : undefined,
      headers,
    });
  }

  try {
    const dnsRes = await request(dnsUrl, { Accept: 'application/dns-json' });
    if (!dnsRes || !dnsRes.ok) return emptyLookupResult();
    const dnsPayload = await dnsRes.json();
    const ip = parseDnsJsonARecord(dnsPayload);
    const geoUrl = buildGeoLookupUrl(ip);
    if (!geoUrl) return emptyLookupResult();

    const geoRes = await request(geoUrl);
    if (!geoRes) return emptyLookupResult();
    if (!geoRes.ok) {
      return {
        location: null,
        cacheNegative: geoRes.status === 404 && isIpv4Address(ip),
      };
    }
    const payload = await geoRes.json();
    const location = parseIpwhoResponse(payload);
    if (location) return { location, cacheNegative: false };
    return { location: null, cacheNegative: true };
  } catch {
    return emptyLookupResult();
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
    const result = await lookupDomainLocation(domain, { fetchImpl });
    const fetchedAt = Date.now();
    if (result.location) {
      const entry = {
        lat: result.location.lat,
        lon: result.location.lon,
        country: result.location.country,
        region: result.location.region,
        city: result.location.city,
        fetchedAt,
        ok: true,
      };
      fresh[domain] = entry;
      locations[domain] = entry;
    } else if (result.cacheNegative) {
      fresh[domain] = {
        lat: null,
        lon: null,
        country: '',
        region: '',
        city: '',
        fetchedAt,
        ok: false,
      };
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
 * Request optional host access for lookup origins. Does not add required host_permissions.
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
