/**
 * Dashboard Map view — Leaflet + OSM tiles + markercluster, matching EchoFootPrint's
 * MapView (vanilla JS, not React). Pins still require Settings opt-in HTTPS lookups.
 */

import { isFeatureEnabled } from '../common/feature-flags.js';
import { getSettings, clearGeoLookupCache } from '../background/storage.js';
import { resolveDomainLocations } from './geolocation.js';
import { OSM_TILE_URL, osmTileLayerOptions } from './map-tiles.js';

export const VIZ_TAB_GRAPH = 'graph';
export const VIZ_TAB_MAP = 'map';
export const MAP_THEME_DARK = 'dark';
export const MAP_THEME_LIGHT = 'light';

const LOCALHOST_DOMAINS = new Set(['localhost', '127.0.0.1']);

let activeTab = VIZ_TAB_GRAPH;
let lastAggregated = {};
let mapChromeBound = false;
let tabsBound = false;
let mapInstance = null;
let markersLayer = null;
let tileLayer = null;
let mapTheme = MAP_THEME_DARK;

function leaflet() {
  return globalThis.L;
}

function tokenColor(name, fallback) {
  const style = globalThis.getComputedStyle?.(document.documentElement);
  const value = style?.getPropertyValue(name)?.trim();
  return value || fallback;
}

function mapPinIcon() {
  const L = leaflet();
  if (!L?.icon) return undefined;
  const fill = tokenColor('--accent', '#3dd68c');
  const inner = tokenColor('--ink-1', '#f4f1ea');
  const svg = [
    '<svg width="25" height="41" xmlns="http://www.w3.org/2000/svg">',
    '<path d="M12.5 0C19.4 0 25 5.6 25 12.5c0 10-9 21.5-12.5 28.5',
    `C8 34 0 22.5 0 12.5 0 5.6 5.6 0 12.5 0z" fill="${fill}"/>`,
    `<circle cx="12.5" cy="12.5" r="5" fill="${inner}"/>`,
    '</svg>',
  ].join('');
  return L.icon({
    iconUrl: `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
  });
}

function domainList(aggregated) {
  return Object.keys(aggregated || {}).filter((domain) => !LOCALHOST_DOMAINS.has(domain));
}

/**
 * Group visit counts by lat/lon (Echo MapView location grouping).
 * @param {Object} aggregated domain → { count }
 * @param {Object} geoData domain → { lat, lon, country, region, city }
 */
export function groupLocations(aggregated, geoData) {
  const grouped = {};
  const domainSets = {};
  Object.entries(aggregated || {}).forEach(([domain, stats]) => {
    if (LOCALHOST_DOMAINS.has(domain)) return;
    const geo = geoData?.[domain];
    if (!geo || typeof geo.lat !== 'number' || typeof geo.lon !== 'number') return;
    if (!Number.isFinite(geo.lat) || !Number.isFinite(geo.lon)) return;
    const key = `${geo.lat},${geo.lon}`;
    if (!grouped[key]) {
      grouped[key] = {
        lat: geo.lat,
        lon: geo.lon,
        country: geo.country || '',
        region: geo.region || '',
        city: geo.city || '',
        domains: [],
        visits: 0,
      };
      domainSets[key] = new Set();
    }
    grouped[key].visits += stats?.count || 1;
    domainSets[key].add(domain);
  });
  Object.entries(domainSets).forEach(([key, set]) => {
    grouped[key].domains = Array.from(set);
  });
  return grouped;
}

function setTabState(tab) {
  activeTab = tab === VIZ_TAB_MAP ? VIZ_TAB_MAP : VIZ_TAB_GRAPH;
  const graphTab = document.getElementById('tab-graph');
  const mapTab = document.getElementById('tab-map');
  const graphPanel = document.getElementById('graph-panel');
  const mapPanel = document.getElementById('map-panel');
  const isMap = activeTab === VIZ_TAB_MAP;

  if (graphTab) {
    graphTab.setAttribute('aria-selected', isMap ? 'false' : 'true');
    graphTab.tabIndex = isMap ? -1 : 0;
  }
  if (mapTab) {
    mapTab.setAttribute('aria-selected', isMap ? 'true' : 'false');
    mapTab.tabIndex = isMap ? 0 : -1;
  }
  if (graphPanel) graphPanel.hidden = isMap;
  if (mapPanel) mapPanel.hidden = !isMap;
}

function setOverlay(kind, { progress } = {}) {
  const geoOff = document.getElementById('map-geo-overlay');
  const loading = document.getElementById('map-loading-overlay');
  const empty = document.getElementById('map-empty-overlay');
  [geoOff, loading, empty].forEach((el) => {
    if (el) el.hidden = true;
  });
  if (kind === 'geo-off' && geoOff) geoOff.hidden = false;
  if (kind === 'loading' && loading) {
    loading.hidden = false;
    const current = document.getElementById('map-geo-progress-current');
    const total = document.getElementById('map-geo-progress-total');
    const fill = document.getElementById('map-geo-progress-fill');
    if (current) current.textContent = String(progress?.current || 0);
    if (total) total.textContent = String(progress?.total || 0);
    if (fill) {
      const pct = progress?.total > 0 ? (progress.current / progress.total) * 100 : 0;
      fill.style.width = `${pct}%`;
    }
  }
  if (kind === 'empty' && empty) empty.hidden = false;
}

function setMapStats(locationCount, visitCount) {
  const locEl = document.getElementById('map-location-count');
  const visEl = document.getElementById('map-visit-count');
  if (locEl) locEl.textContent = String(locationCount);
  if (visEl) visEl.textContent = String(visitCount);
}

function applyMapThemeClass(theme) {
  const container = document.getElementById('map-container');
  if (!container) return;
  container.classList.toggle('map-theme-dark', theme === MAP_THEME_DARK);
  container.classList.toggle('map-theme-light', theme === MAP_THEME_LIGHT);
  const toggle = document.getElementById('map-theme-toggle');
  if (toggle) {
    const next = theme === MAP_THEME_DARK ? 'light' : 'dark';
    toggle.setAttribute('aria-label', `Switch to ${next} map tiles`);
    toggle.title = `Switch to ${next} map tiles`;
    const sun = toggle.querySelector('[data-map-theme="sun"]');
    const moon = toggle.querySelector('[data-map-theme="moon"]');
    if (sun) sun.hidden = theme !== MAP_THEME_DARK;
    if (moon) moon.hidden = theme !== MAP_THEME_LIGHT;
  }
}

function replaceTileLayer(map) {
  const L = leaflet();
  if (!L?.tileLayer || !map) return;
  if (tileLayer && map.removeLayer) {
    map.removeLayer(tileLayer);
  }
  tileLayer = L.tileLayer(OSM_TILE_URL, osmTileLayerOptions());
  tileLayer.addTo(map);
}

function ensureLeafletMap(container) {
  const L = leaflet();
  if (!container || !L?.map) return null;
  if (mapInstance) {
    mapInstance.invalidateSize?.();
    return mapInstance;
  }

  applyMapThemeClass(mapTheme);
  const map = L.map(container, {
    center: [20, 0],
    zoom: 2,
    minZoom: 2,
    maxZoom: 18,
    worldCopyJump: true,
  });
  replaceTileLayer(map);
  mapInstance = map;
  return map;
}

function createLocationPopup(location) {
  const root = document.createElement('div');
  root.className = 'map-popup';

  const title = document.createElement('h3');
  title.textContent = location.city || location.region || location.country || 'Unknown';
  root.appendChild(title);

  const country = document.createElement('p');
  country.className = 'location-info';
  country.textContent = location.country || '';
  root.appendChild(country);

  const listWrap = document.createElement('div');
  listWrap.className = 'domains-list';
  const strong = document.createElement('strong');
  strong.textContent = `Sites (${location.domains.length}):`;
  listWrap.appendChild(strong);
  const ul = document.createElement('ul');
  location.domains.slice(0, 5).forEach((domain) => {
    const li = document.createElement('li');
    li.textContent = domain;
    ul.appendChild(li);
  });
  if (location.domains.length > 5) {
    const li = document.createElement('li');
    li.textContent = `…and ${location.domains.length - 5} more`;
    ul.appendChild(li);
  }
  listWrap.appendChild(ul);
  root.appendChild(listWrap);

  const visits = document.createElement('p');
  visits.className = 'location-info';
  visits.textContent = `Visits: ${location.visits}`;
  root.appendChild(visits);
  return root;
}

function fillRegionDrawer(location) {
  const drawer = document.getElementById('map-region-drawer');
  if (!drawer) return;
  if (!location) {
    drawer.hidden = true;
    return;
  }
  drawer.hidden = false;
  const title = document.getElementById('map-region-title');
  const country = document.getElementById('map-region-country');
  const region = document.getElementById('map-region-region');
  const count = document.getElementById('map-region-count');
  const list = document.getElementById('map-region-domains');
  if (title) title.textContent = location.city || location.region || location.country || 'Unknown';
  if (country) country.textContent = location.country || '—';
  if (region) region.textContent = location.region || '—';
  if (count) count.textContent = String(location.domains.length);
  if (list) {
    list.replaceChildren();
    location.domains.forEach((domain) => {
      const row = document.createElement('div');
      row.className = 'domain-item';
      const dot = document.createElement('span');
      dot.className = 'domain-dot';
      const label = document.createElement('span');
      label.textContent = domain;
      row.append(dot, label);
      list.appendChild(row);
    });
  }
}

function refreshMarkers(map, grouped) {
  const L = leaflet();
  if (!map || !L?.markerClusterGroup) return;

  if (markersLayer) {
    map.removeLayer(markersLayer);
    markersLayer = null;
  }

  const markers = L.markerClusterGroup({
    maxClusterRadius: 80,
    spiderfyOnMaxZoom: true,
    showCoverageOnHover: false,
    zoomToBoundsOnClick: true,
    iconCreateFunction(cluster) {
      const count = cluster.getChildCount();
      let size = 'small';
      if (count > 10) size = 'medium';
      if (count > 50) size = 'large';
      return L.divIcon({
        html: `<div><span>${Number(count)}</span></div>`,
        className: `marker-cluster marker-cluster-${size}`,
        iconSize: L.point(40, 40),
      });
    },
  });

  const pin = mapPinIcon();
  Object.values(grouped).forEach((location) => {
    const marker = L.marker([location.lat, location.lon], pin ? { icon: pin } : {});
    marker.bindPopup(createLocationPopup(location), {
      maxWidth: 300,
      className: 'custom-popup',
    });
    marker.on('click', () => fillRegionDrawer(location));
    markers.addLayer(marker);
  });

  map.addLayer(markers);
  markersLayer = markers;
  if (markers.getBounds?.()?.isValid?.()) {
    map.fitBounds(markers.getBounds(), { padding: [50, 50], maxZoom: 10 });
  }
}

/**
 * Render / refresh the Leaflet map. OSM tiles load whenever the Map tab is shown.
 * Domain pins require geoLookupEnabled (opt-in HTTPS lookups).
 */
export async function renderMapView(
  container,
  { data = {}, geoLookupEnabled = false, resolveLocations = resolveDomainLocations } = {},
) {
  if (!container) return { pins: 0, overlay: true, usedFallback: true };

  const map = ensureLeafletMap(container);
  const usedFallback = !map;

  if (geoLookupEnabled) {
    setOverlay('loading', { progress: { current: 0, total: domainList(data).length } });
  } else {
    setOverlay('geo-off');
  }

  let locations = {};
  if (geoLookupEnabled) {
    const result = await resolveLocations(domainList(data), {
      enabled: true,
    });
    locations = result.locations || {};
  }

  const grouped = groupLocations(data, locations);
  const pinCount = Object.keys(grouped).length;
  const visitCount = Object.values(grouped).reduce((sum, loc) => sum + loc.visits, 0);
  setMapStats(pinCount, visitCount);

  if (map) {
    refreshMarkers(map, grouped);
    requestAnimationFrame(() => map.invalidateSize?.());
  }

  if (!geoLookupEnabled) {
    setOverlay('geo-off');
    fillRegionDrawer(null);
  } else if (pinCount === 0) {
    setOverlay('empty');
  } else {
    setOverlay(null);
  }

  return { pins: pinCount, overlay: !geoLookupEnabled, usedFallback };
}

export async function updateMapView(aggregatedData, { reuseLast = false } = {}) {
  if (!reuseLast && aggregatedData) {
    lastAggregated = aggregatedData;
  }
  const container = document.getElementById('map-container');
  if (!container || !isFeatureEnabled('MAP_VIEW')) return null;
  if (activeTab !== VIZ_TAB_MAP) return null;

  let geoLookupEnabled = false;
  try {
    const settings = await getSettings();
    geoLookupEnabled = settings.geoLookupEnabled === true;
  } catch {
    geoLookupEnabled = false;
  }

  return renderMapView(container, {
    data: lastAggregated,
    geoLookupEnabled,
  });
}

export function applyMapFeatureFlag(enabled = isFeatureEnabled('MAP_VIEW')) {
  const tablist = document.getElementById('viz-tablist');
  const mapPanel = document.getElementById('map-panel');
  const mapTab = document.getElementById('tab-map');
  if (!enabled) {
    if (tablist) tablist.hidden = true;
    if (mapPanel) mapPanel.hidden = true;
    if (mapTab) mapTab.hidden = true;
    const graphPanel = document.getElementById('graph-panel');
    if (graphPanel) graphPanel.hidden = false;
    activeTab = VIZ_TAB_GRAPH;
  } else if (tablist) {
    tablist.hidden = false;
  }
}

function tabsInList() {
  return [document.getElementById('tab-graph'), document.getElementById('tab-map')].filter(Boolean);
}

export function getActiveVizTab() {
  return activeTab;
}

export function selectVizTab(tab, { focus = false } = {}) {
  setTabState(tab);
  if (focus) {
    const el = document.getElementById(tab === VIZ_TAB_MAP ? 'tab-map' : 'tab-graph');
    el?.focus();
  }
}

export function initMapViewTabs({ onTabChange } = {}) {
  applyMapFeatureFlag();
  const tablist = document.getElementById('viz-tablist');
  if (!tablist || !isFeatureEnabled('MAP_VIEW') || tabsBound) return;

  tabsBound = true;
  tablist.addEventListener('click', async (event) => {
    const tab = event.target.closest('[role="tab"]');
    if (!tab || !tablist.contains(tab)) return;
    const next = tab.id === 'tab-map' ? VIZ_TAB_MAP : VIZ_TAB_GRAPH;
    selectVizTab(next);
    if (typeof onTabChange === 'function') await onTabChange(next);
    if (next === VIZ_TAB_MAP) await updateMapView(null, { reuseLast: true });
  });

  tablist.addEventListener('keydown', (event) => {
    const tabs = tabsInList();
    const current = document.activeElement;
    const index = tabs.indexOf(current);
    if (index < 0) return;
    let nextIndex = index;
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      nextIndex = (index + 1) % tabs.length;
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      nextIndex = (index - 1 + tabs.length) % tabs.length;
    } else if (event.key === 'Home') nextIndex = 0;
    else if (event.key === 'End') nextIndex = tabs.length - 1;
    else return;
    event.preventDefault();
    tabs[nextIndex].click();
    tabs[nextIndex].focus();
  });
}

export function bindMapChrome() {
  if (mapChromeBound) return;
  mapChromeBound = true;

  const clearBtn = document.getElementById('map-clear-cache');
  if (clearBtn) {
    clearBtn.addEventListener('click', async () => {
      let allowed = true;
      if (typeof globalThis.confirm === 'function') {
        // eslint-disable-next-line no-alert -- Echo MapView cache-clear confirm
        allowed = globalThis.confirm(
          [
            'Clear all cached geolocation data?',
            'Fresh lookups happen only when map geolocation is enabled in Settings.',
          ].join(' '),
        );
      }
      if (!allowed) return;
      try {
        await clearGeoLookupCache();
        fillRegionDrawer(null);
        await updateMapView(null, { reuseLast: true });
      } catch {
        /* keep prior markers if storage clear fails */
      }
    });
  }

  const openSettings = document.getElementById('map-open-settings');
  if (openSettings) {
    openSettings.addEventListener('click', () => {
      document.getElementById('settings-btn')?.click();
      setTimeout(() => document.getElementById('geo-lookup-toggle')?.focus(), 50);
    });
  }

  const closeDrawer = document.getElementById('map-region-close');
  if (closeDrawer) {
    closeDrawer.addEventListener('click', () => fillRegionDrawer(null));
  }

  const themeToggle = document.getElementById('map-theme-toggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      mapTheme = mapTheme === MAP_THEME_DARK ? MAP_THEME_LIGHT : MAP_THEME_DARK;
      applyMapThemeClass(mapTheme);
    });
  }

  applyMapThemeClass(mapTheme);
}

export function resetMapViewForTests() {
  if (mapInstance?.remove) {
    mapInstance.remove();
  }
  activeTab = VIZ_TAB_GRAPH;
  lastAggregated = {};
  mapChromeBound = false;
  tabsBound = false;
  mapInstance = null;
  markersLayer = null;
  tileLayer = null;
  mapTheme = MAP_THEME_DARK;
}
