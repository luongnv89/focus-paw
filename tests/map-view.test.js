/**
 * Map view: Leaflet + OSM tiles, marker clusters, geo-off overlay, opt-in lookups.
 */

import fs from 'fs';
import path from 'path';
import { FEATURES, isFeatureEnabled, getEnabledFeatures } from '../src/common/feature-flags.js';
import {
  GEO_CACHE_TTL_MS,
  GEO_CACHE_MAX_ENTRIES,
  pruneGeoCacheEntries,
  getGeoLookupCache,
  putGeoLookupEntries,
  clearGeoLookupCache,
  resetGeoCacheQueueForTests,
} from '../src/background/storage.js';
import {
  GEO_LOOKUP_ORIGIN,
  DNS_LOOKUP_ORIGIN,
  GEO_LOOKUP_ORIGINS,
  isValidLookupDomain,
  isIpv4Address,
  buildGeoLookupUrl,
  buildDnsLookupUrl,
  parseDnsJsonARecord,
  parseIpwhoResponse,
  resolveDomainLocations,
  requestGeoLookupPermission,
  LOOKUP_MAX_PER_PASS,
} from '../src/dashboard/geolocation.js';
import {
  OSM_TILE_URL,
  OSM_TILE_ATTRIBUTION,
  osmTileLayerOptions,
} from '../src/dashboard/map-tiles.js';
import {
  groupLocations,
  renderMapView,
  initMapViewTabs,
  selectVizTab,
  getActiveVizTab,
  applyMapFeatureFlag,
  bindMapChrome,
  resetMapViewForTests,
  VIZ_TAB_MAP,
  VIZ_TAB_GRAPH,
} from '../src/dashboard/map-view.js';

function mockChrome({ settings = {}, geoLookupCache = {}, grantPermission = true } = {}) {
  global.chrome = {
    runtime: {
      getURL: (p) => `chrome-extension://testid/${p}`,
      lastError: undefined,
    },
    storage: {
      local: {
        data: { settings, geoLookupCache },
        get(keys, cb) {
          const result = {};
          const list = Array.isArray(keys) ? keys : [keys];
          list.forEach((key) => {
            if (this.data[key] !== undefined) result[key] = this.data[key];
          });
          cb(result);
        },
        set(items, cb) {
          Object.assign(this.data, items);
          if (cb) cb();
        },
      },
    },
    permissions: {
      request: jest.fn((_opts, cb) => cb(grantPermission)),
    },
  };
}

function mockLookupFetch({
  ip = '93.184.216.34',
  geo = { success: true, latitude: 5, longitude: 6, country: 'FR', region: 'IDF', city: 'Paris' },
  dohOk = true,
  dohStatus = 200,
  ipwhoOk = true,
  ipwhoStatus = 200,
} = {}) {
  return jest.fn(async (url) => {
    const href = String(url);
    if (href.includes('cloudflare-dns.com')) {
      return {
        ok: dohOk,
        status: dohStatus,
        json: async () => ({
          Status: 0,
          Answer: [{ type: 1, data: ip }],
        }),
      };
    }
    if (href.includes('ipwho.is')) {
      return {
        ok: ipwhoOk,
        status: ipwhoStatus,
        json: async () => geo,
      };
    }
    throw new Error(`unexpected lookup url ${href}`);
  });
}

function mockLeaflet() {
  const markers = {
    addLayer: jest.fn(),
    getBounds: jest.fn(() => ({ isValid: () => false })),
  };
  const tile = { addTo: jest.fn() };
  const map = {
    invalidateSize: jest.fn(),
    removeLayer: jest.fn(),
    addLayer: jest.fn(),
    fitBounds: jest.fn(),
    remove: jest.fn(),
  };
  const marker = {
    bindPopup: jest.fn(),
    on: jest.fn(),
  };
  global.L = {
    map: jest.fn(() => map),
    tileLayer: jest.fn(() => tile),
    markerClusterGroup: jest.fn(() => markers),
    marker: jest.fn(() => marker),
    icon: jest.fn(() => ({})),
    divIcon: jest.fn(() => ({})),
    point: jest.fn((x, y) => ({ x, y })),
  };
  return { map, tile, markers, marker };
}

function mountMapDom() {
  document.body.innerHTML = `
    <div id="viz-tablist" role="tablist">
      <button type="button" role="tab" id="tab-graph" aria-selected="true" tabindex="0">Graph</button>
      <button type="button" role="tab" id="tab-map" aria-selected="false" tabindex="-1">Map</button>
    </div>
    <div id="graph-panel"></div>
    <div id="map-panel" hidden>
      <button type="button" id="map-theme-toggle" aria-label="Switch to light map tiles">
        <svg data-map-theme="sun"></svg>
        <svg data-map-theme="moon" hidden></svg>
      </button>
      <button type="button" id="map-clear-cache" aria-label="Clear location cache"></button>
      <span id="map-location-count">0</span>
      <span id="map-visit-count">0</span>
      <div id="map-container" class="leaflet-map map-theme-dark"></div>
      <aside id="map-region-drawer" hidden>
        <h3 id="map-region-title">Region</h3>
        <span id="map-region-country"></span>
        <span id="map-region-region"></span>
        <span id="map-region-count"></span>
        <div id="map-region-domains"></div>
        <button type="button" id="map-region-close">Close</button>
      </aside>
      <div id="map-geo-overlay">Map geolocation is off by default.</div>
      <div id="map-loading-overlay" hidden></div>
      <div id="map-empty-overlay" hidden></div>
      <button type="button" id="map-open-settings">Open Settings</button>
      <button type="button" id="settings-btn"></button>
      <input type="checkbox" id="geo-lookup-toggle" />
    </div>
  `;
}

describe('map-view', () => {
  beforeEach(() => {
    resetMapViewForTests();
    resetGeoCacheQueueForTests();
    mockChrome();
    document.body.innerHTML = '';
    delete global.L;
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
    document.body.innerHTML = '';
    delete global.L;
    FEATURES.MAP_VIEW = true;
  });

  describe('feature flag', () => {
    test('MAP_VIEW defaults on so the dashboard Map tab ships', () => {
      expect(FEATURES.MAP_VIEW).toBe(true);
      expect(isFeatureEnabled('MAP_VIEW')).toBe(true);
      expect(getEnabledFeatures()).toContain('MAP_VIEW');
    });

    test('applyMapFeatureFlag hides tabs when rolled back', () => {
      mountMapDom();
      FEATURES.MAP_VIEW = false;
      applyMapFeatureFlag(false);
      expect(document.getElementById('viz-tablist').hidden).toBe(true);
      expect(document.getElementById('map-panel').hidden).toBe(true);
      expect(document.getElementById('graph-panel').hidden).toBe(false);
    });
  });

  describe('leaflet stack', () => {
    test('map-view.js never uses innerHTML for domain or geo payloads', () => {
      const src = fs.readFileSync(path.join(process.cwd(), 'src/dashboard/map-view.js'), 'utf8');
      expect(src).not.toMatch(/innerHTML/);
      expect(src).toMatch(/bindPopup\(createLocationPopup\(/);
      expect(src).toMatch(/html: `<div><span>\$\{Number\(count\)\}<\/span><\/div>`/);
    });

    test('OSM tiles are keyless raster URLs with attribution', () => {
      expect(OSM_TILE_URL).toBe('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png');
      expect(OSM_TILE_ATTRIBUTION).toMatch(/openstreetmap\.org\/copyright/i);
      expect(osmTileLayerOptions()).toEqual(
        expect.objectContaining({
          attribution: OSM_TILE_ATTRIBUTION,
          subdomains: 'abc',
          maxZoom: 19,
        }),
      );
      expect(OSM_TILE_URL).not.toMatch(/carto|mapbox|unpkg|ip-api/i);
    });

    test('no bundled GeoJSON atlas remains', () => {
      expect(fs.existsSync(path.join(process.cwd(), 'src/dashboard/world-110m.geojson'))).toBe(
        false,
      );
    });
  });

  describe('grouping', () => {
    test('same coordinates merge domains; distinct coordinates stay separate', () => {
      const grouped = groupLocations(
        {
          'a.com': { count: 2 },
          'b.com': { count: 3 },
          'c.com': { count: 1 },
        },
        {
          'a.com': { lat: 10, lon: 20, country: 'FR', region: 'IDF', city: 'Paris' },
          'b.com': { lat: 10, lon: 20, country: 'FR', region: 'IDF', city: 'Paris' },
          'c.com': { lat: 40, lon: -74, country: 'US', region: 'NY', city: 'New York' },
        },
      );
      expect(Object.keys(grouped)).toHaveLength(2);
      const paris = grouped['10,20'];
      expect(paris.domains).toEqual(expect.arrayContaining(['a.com', 'b.com']));
      expect(paris.visits).toBe(5);
      expect(paris.city).toBe('Paris');
      expect(grouped['40,-74'].domains).toEqual(['c.com']);
    });

    test('skips localhost and incomplete geo rows', () => {
      const grouped = groupLocations(
        { localhost: { count: 9 }, 'ok.com': { count: 1 }, 'bad.com': { count: 1 } },
        {
          localhost: { lat: 0, lon: 0 },
          'ok.com': { lat: 1, lon: 2 },
          'bad.com': { lat: 'x', lon: 2 },
        },
      );
      expect(Object.keys(grouped)).toEqual(['1,2']);
    });
  });

  describe('lookups', () => {
    test('hostname helper accepts domains and rejects URLs', () => {
      expect(isValidLookupDomain('example.com')).toBe(true);
      expect(isValidLookupDomain('news.example.co.uk')).toBe(true);
      expect(isValidLookupDomain('http://example.com')).toBe(false);
      expect(isValidLookupDomain('example.com/path')).toBe(false);
      expect(isValidLookupDomain('localhost')).toBe(false);
      expect(buildDnsLookupUrl('Example.COM')).toBe(
        `${DNS_LOOKUP_ORIGIN}/dns-query?name=example.com&type=A`,
      );
      expect(buildDnsLookupUrl('http://evil')).toBeNull();
    });

    test('ipwho URL is IPv4-only and never interpolates a hostname', () => {
      expect(isIpv4Address('93.184.216.34')).toBe(true);
      expect(buildGeoLookupUrl('93.184.216.34')).toBe(`${GEO_LOOKUP_ORIGIN}/93.184.216.34`);
      expect(buildGeoLookupUrl('example.com')).toBeNull();
      expect(buildGeoLookupUrl('Example.COM')).toBeNull();
      expect(buildGeoLookupUrl('http://evil')).toBeNull();
    });

    test('parseDnsJsonARecord reads the first A record', () => {
      expect(
        parseDnsJsonARecord({
          Status: 0,
          Answer: [
            { type: 5, data: 'example.net' },
            { type: 1, data: '1.2.3.4' },
          ],
        }),
      ).toBe('1.2.3.4');
      expect(parseDnsJsonARecord({ Status: 3, Answer: [] })).toBeNull();
    });

    test('parseIpwhoResponse requires finite coordinates and keeps city/region', () => {
      expect(
        parseIpwhoResponse({
          success: true,
          latitude: 1.2,
          longitude: 3.4,
          country: 'US',
          region: 'CA',
          city: 'LA',
        }),
      ).toEqual({
        lat: 1.2,
        lon: 3.4,
        country: 'US',
        region: 'CA',
        city: 'LA',
      });
      expect(parseIpwhoResponse({ success: false, latitude: 1, longitude: 2 })).toBeNull();
      expect(parseIpwhoResponse({ success: true, latitude: 'x', longitude: 2 })).toBeNull();
    });

    test('resolveDomainLocations does not fetch when opt-in is off', async () => {
      const fetchImpl = jest.fn();
      const result = await resolveDomainLocations(['example.com'], {
        enabled: false,
        fetchImpl,
        getCache: async () => ({}),
        putEntries: jest.fn(),
      });
      expect(fetchImpl).not.toHaveBeenCalled();
      expect(result.locations).toEqual({});
      expect(result.fetched).toBe(0);
    });

    test('cache hit skips the network', async () => {
      const fetchImpl = jest.fn();
      const now = 1_700_000_000_000;
      const result = await resolveDomainLocations(['example.com'], {
        enabled: true,
        fetchImpl,
        now,
        getCache: async () => ({
          'example.com': { lat: 10, lon: 20, ok: true, fetchedAt: now - 1000 },
        }),
        putEntries: jest.fn(),
      });
      expect(fetchImpl).not.toHaveBeenCalled();
      expect(result.fromCache).toBe(1);
      expect(result.locations['example.com'].lat).toBe(10);
    });

    test('expired cache entries are fetched again', async () => {
      const fetchImpl = mockLookupFetch();
      const now = 1_700_000_000_000;
      const putEntries = jest.fn().mockResolvedValue({});
      const result = await resolveDomainLocations(['example.com'], {
        enabled: true,
        fetchImpl,
        now,
        intervalMs: 0,
        getCache: async () => ({
          'example.com': {
            lat: 1,
            lon: 2,
            ok: true,
            fetchedAt: now - GEO_CACHE_TTL_MS - 1,
          },
        }),
        putEntries,
      });
      expect(fetchImpl).toHaveBeenCalledTimes(2);
      expect(result.locations['example.com'].lat).toBe(5);
      expect(result.locations['example.com'].city).toBe('Paris');
      expect(putEntries).toHaveBeenCalled();
    });

    test('rate-limits lookups per pass', async () => {
      const fetchImpl = mockLookupFetch({
        geo: { success: true, latitude: 1, longitude: 1, country: 'X' },
      });
      const result = await resolveDomainLocations(['a.com', 'b.com', 'c.com'], {
        enabled: true,
        fetchImpl,
        intervalMs: 0,
        maxPerPass: 1,
        getCache: async () => ({}),
        putEntries: jest.fn().mockResolvedValue({}),
      });
      expect(result.fetched).toBe(1);
      expect(fetchImpl).toHaveBeenCalledTimes(2);
      expect(LOOKUP_MAX_PER_PASS).toBeGreaterThan(0);
    });

    test('DoH then ipwho.is/{ip}; domain is never the ipwho path', async () => {
      const fetchImpl = mockLookupFetch({ ip: '93.184.216.34' });
      const putEntries = jest.fn().mockResolvedValue({});
      await resolveDomainLocations(['example.com'], {
        enabled: true,
        fetchImpl,
        intervalMs: 0,
        getCache: async () => ({}),
        putEntries,
      });
      const urls = fetchImpl.mock.calls.map((call) => String(call[0]));
      expect(urls[0]).toBe(`${DNS_LOOKUP_ORIGIN}/dns-query?name=example.com&type=A`);
      expect(fetchImpl.mock.calls[0][1].headers.Accept).toBe('application/dns-json');
      expect(urls[1]).toBe(`${GEO_LOOKUP_ORIGIN}/93.184.216.34`);
      expect(urls.some((url) => /ipwho\.is\/example\.com/i.test(url))).toBe(false);
    });

    test('HTTP 404 on DoH is not stored as a 7-day negative hit', async () => {
      const fetchImpl = mockLookupFetch({ dohOk: false, dohStatus: 404 });
      const putEntries = jest.fn().mockResolvedValue({});
      const result = await resolveDomainLocations(['example.com'], {
        enabled: true,
        fetchImpl,
        intervalMs: 0,
        getCache: async () => ({}),
        putEntries,
      });
      expect(result.locations).toEqual({});
      expect(putEntries).not.toHaveBeenCalled();
      expect(fetchImpl.mock.calls).toHaveLength(1);
      expect(String(fetchImpl.mock.calls[0][0])).toContain('cloudflare-dns.com');
    });

    test('HTTP 404 from ipwho.is/{ip} is cached as a negative hit', async () => {
      const fetchImpl = mockLookupFetch({
        ip: '8.8.8.8',
        ipwhoOk: false,
        ipwhoStatus: 404,
      });
      const putEntries = jest.fn().mockResolvedValue({});
      await resolveDomainLocations(['example.com'], {
        enabled: true,
        fetchImpl,
        intervalMs: 0,
        getCache: async () => ({}),
        putEntries,
      });
      expect(putEntries).toHaveBeenCalledWith(
        expect.objectContaining({
          'example.com': expect.objectContaining({ ok: false, lat: null }),
        }),
      );
    });
  });

  describe('renderMapView default path', () => {
    test('loads OSM tiles and shows geo-off overlay without lookups', async () => {
      mountMapDom();
      const leaflet = mockLeaflet();
      const resolveLocations = jest.fn();
      const result = await renderMapView(document.getElementById('map-container'), {
        data: { 'example.com': { count: 4 } },
        geoLookupEnabled: false,
        resolveLocations,
      });
      expect(resolveLocations).not.toHaveBeenCalled();
      expect(result.overlay).toBe(true);
      expect(result.usedFallback).toBe(false);
      expect(document.getElementById('map-geo-overlay').hidden).toBe(false);
      expect(global.L.map).toHaveBeenCalled();
      expect(global.L.tileLayer).toHaveBeenCalledWith(OSM_TILE_URL, expect.any(Object));
      expect(leaflet.tile.addTo).toHaveBeenCalled();
      expect(document.getElementById('map-location-count').textContent).toBe('0');
    });

    test('falls back without Leaflet but still shows the geo-off overlay', async () => {
      mountMapDom();
      const result = await renderMapView(document.getElementById('map-container'), {
        data: { 'example.com': { count: 1 } },
        geoLookupEnabled: false,
        resolveLocations: jest.fn(),
      });
      expect(result.usedFallback).toBe(true);
      expect(document.getElementById('map-geo-overlay').hidden).toBe(false);
    });

    test('opt-in calls resolveLocations, plots markers, and hides the geo-off overlay', async () => {
      mountMapDom();
      const leaflet = mockLeaflet();
      const resolveLocations = jest.fn().mockResolvedValue({
        locations: { 'example.com': { lat: 1, lon: 2, city: 'Paris', country: 'FR', ok: true } },
        fetched: 1,
        fromCache: 0,
      });
      const result = await renderMapView(document.getElementById('map-container'), {
        data: { 'example.com': { count: 2 } },
        geoLookupEnabled: true,
        resolveLocations,
      });
      expect(resolveLocations).toHaveBeenCalled();
      expect(document.getElementById('map-geo-overlay').hidden).toBe(true);
      expect(result.overlay).toBe(false);
      expect(result.pins).toBe(1);
      expect(leaflet.markers.addLayer).toHaveBeenCalled();
      expect(leaflet.marker.bindPopup).toHaveBeenCalled();
      expect(document.getElementById('map-location-count').textContent).toBe('1');
      expect(document.getElementById('map-visit-count').textContent).toBe('2');
    });

    test('opt-in with no pins shows the empty overlay', async () => {
      mountMapDom();
      mockLeaflet();
      await renderMapView(document.getElementById('map-container'), {
        data: { 'example.com': { count: 2 } },
        geoLookupEnabled: true,
        resolveLocations: jest.fn().mockResolvedValue({ locations: {}, fetched: 1 }),
      });
      expect(document.getElementById('map-empty-overlay').hidden).toBe(false);
      expect(document.getElementById('map-geo-overlay').hidden).toBe(true);
    });
  });

  describe('tabs and cache chrome', () => {
    test('Graph/Map tablist is keyboard operable', async () => {
      mountMapDom();
      initMapViewTabs();
      expect(getActiveVizTab()).toBe(VIZ_TAB_GRAPH);
      document.getElementById('tab-graph').focus();
      document
        .getElementById('viz-tablist')
        .dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
      expect(getActiveVizTab()).toBe(VIZ_TAB_MAP);
      expect(document.getElementById('tab-map').getAttribute('aria-selected')).toBe('true');
      expect(document.getElementById('map-panel').hidden).toBe(false);
      expect(document.getElementById('graph-panel').hidden).toBe(true);
      selectVizTab(VIZ_TAB_GRAPH);
      expect(getActiveVizTab()).toBe(VIZ_TAB_GRAPH);
      await new Promise((resolve) => {
        setTimeout(resolve, 20);
      });
    });

    test('Clear location cache empties storage after confirm', async () => {
      mountMapDom();
      mockChrome({
        geoLookupCache: { 'example.com': { lat: 1, lon: 2, ok: true, fetchedAt: Date.now() } },
      });
      global.confirm = jest.fn(() => true);
      bindMapChrome();
      document.getElementById('map-clear-cache').click();
      await new Promise((resolve) => {
        setTimeout(resolve, 20);
      });
      const cache = await getGeoLookupCache();
      expect(cache).toEqual({});
      expect(global.confirm).toHaveBeenCalled();
    });

    test('theme toggle flips tile pane class and accessible name', () => {
      mountMapDom();
      bindMapChrome();
      const toggle = document.getElementById('map-theme-toggle');
      const container = document.getElementById('map-container');
      expect(container.classList.contains('map-theme-dark')).toBe(true);
      toggle.click();
      expect(container.classList.contains('map-theme-light')).toBe(true);
      expect(toggle.getAttribute('aria-label')).toMatch(/dark map tiles/i);
    });

    test('dashboard Map chrome uses icon-only names without contradicting visible text', () => {
      const html = fs.readFileSync(path.join(process.cwd(), 'src/dashboard/index.html'), 'utf8');
      document.documentElement.innerHTML = html;
      const clearBtn = document.getElementById('map-clear-cache');
      expect(clearBtn.getAttribute('aria-label')).toMatch(/clear location cache/i);
      expect(document.getElementById('map-theme-toggle').getAttribute('aria-label')).toMatch(
        /map tiles/i,
      );
      expect(document.getElementById('map-zoom-reset')).toBeNull();
      const openSettings = document.getElementById('map-open-settings');
      expect(openSettings.getAttribute('aria-label')).toBeNull();
      expect(openSettings.textContent).toMatch(/Open Settings/);
    });
  });

  describe('optional permission helper', () => {
    test('requestGeoLookupPermission uses optional origins, not geolocation', async () => {
      const granted = await requestGeoLookupPermission();
      expect(granted).toBe(true);
      expect(GEO_LOOKUP_ORIGINS).toEqual(['https://cloudflare-dns.com/*', 'https://ipwho.is/*']);
      expect(chrome.permissions.request).toHaveBeenCalledWith(
        { origins: GEO_LOOKUP_ORIGINS },
        expect.any(Function),
      );
    });
  });
});

describe('geo lookup cache (storage)', () => {
  beforeEach(() => {
    resetGeoCacheQueueForTests();
    mockChrome();
  });

  test('pruneGeoCacheEntries drops TTL-expired and oldest overflow', () => {
    const now = 1_000_000;
    const cache = {
      'fresh.com': { lat: 1, lon: 1, fetchedAt: now - 10, ok: true },
      'stale.com': { lat: 2, lon: 2, fetchedAt: now - GEO_CACHE_TTL_MS - 5, ok: true },
    };
    const pruned = pruneGeoCacheEntries(cache, now);
    expect(pruned['fresh.com']).toBeDefined();
    expect(pruned['stale.com']).toBeUndefined();

    const bulky = {};
    for (let i = 0; i < GEO_CACHE_MAX_ENTRIES + 3; i += 1) {
      bulky[`d${i}.com`] = { lat: 0, lon: 0, fetchedAt: now - i, ok: true };
    }
    const capped = pruneGeoCacheEntries(bulky, now);
    expect(Object.keys(capped)).toHaveLength(GEO_CACHE_MAX_ENTRIES);
  });

  test('putGeoLookupEntries writes atomically and clearGeoLookupCache wipes', async () => {
    await putGeoLookupEntries({
      'example.com': { lat: 1, lon: 2, fetchedAt: Date.now(), ok: true },
    });
    const once = await getGeoLookupCache();
    expect(once['example.com'].lat).toBe(1);
    await clearGeoLookupCache();
    expect(await getGeoLookupCache()).toEqual({});
  });

  test('getGeoLookupCache rejects on lastError', async () => {
    global.chrome.runtime.lastError = { message: 'QUOTA_BYTES quota exceeded' };
    await expect(getGeoLookupCache()).rejects.toThrow(/QUOTA_BYTES/);
    delete global.chrome.runtime.lastError;
  });
});
