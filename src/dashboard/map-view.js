/**
 * Dashboard Map view: bundled D3-geo Natural Earth atlas (offline default)
 * plus optional HTTPS hostname pins after a Settings opt-in.
 */

import { isFeatureEnabled } from '../common/feature-flags.js';
import { getSettings, clearGeoLookupCache } from '../background/storage.js';
import { resolveDomainLocations } from './geolocation.js';

export const MAP_ATLAS_PATH = 'src/dashboard/world-110m.geojson';
export const CLUSTER_CELL_SIZE = 28;
export const VIZ_TAB_GRAPH = 'graph';
export const VIZ_TAB_MAP = 'map';

const LOCALHOST_DOMAINS = new Set(['localhost', '127.0.0.1']);

let activeTab = VIZ_TAB_GRAPH;
let lastAggregated = {};
let mapControls = null;
let mapChromeBound = false;
let tabsBound = false;

/**
 * @param {number} [cellSize]
 * @returns {Array<{x:number,y:number,count:number,domains:string[]}>}
 */
export function clusterMarkers(points, cellSize = CLUSTER_CELL_SIZE) {
  const buckets = new Map();
  (points || []).forEach((point) => {
    if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) return;
    const cx = Math.floor(point.x / cellSize);
    const cy = Math.floor(point.y / cellSize);
    const key = `${cx}:${cy}`;
    if (!buckets.has(key)) {
      buckets.set(key, {
        x: 0,
        y: 0,
        count: 0,
        domains: [],
      });
    }
    const bucket = buckets.get(key);
    bucket.x += point.x;
    bucket.y += point.y;
    bucket.count += point.count || 1;
    if (point.domain) bucket.domains.push(point.domain);
  });
  return Array.from(buckets.values()).map((bucket) => {
    const n = Math.max(1, bucket.domains.length);
    return {
      x: bucket.x / n,
      y: bucket.y / n,
      count: bucket.count,
      domains: bucket.domains,
    };
  });
}

export function prefersReducedMotion() {
  return Boolean(globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches);
}

export function getAtlasUrl() {
  if (globalThis.chrome?.runtime?.getURL) {
    return chrome.runtime.getURL(MAP_ATLAS_PATH);
  }
  return './world-110m.geojson';
}

export function isRemoteAtlasUrl(url) {
  return typeof url === 'string' && /^https?:/i.test(url);
}

/**
 * @param {typeof fetch} [fetchImpl]
 * @returns {Promise<Object>}
 */
export async function loadWorldAtlas(fetchImpl = globalThis.fetch) {
  const url = getAtlasUrl();
  if (isRemoteAtlasUrl(url)) {
    throw new Error('Atlas must be bundled; refusing network URL');
  }
  if (typeof fetchImpl !== 'function') {
    throw new Error('Atlas unavailable');
  }
  const res = await fetchImpl(url);
  if (!res || !res.ok) {
    throw new Error('Atlas unavailable');
  }
  const atlas = await res.json();
  if (!atlas || atlas.type !== 'FeatureCollection' || !Array.isArray(atlas.features)) {
    throw new Error('Atlas invalid');
  }
  return atlas;
}

export function getActiveVizTab() {
  return activeTab;
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

function setOverlayVisible(visible) {
  const overlay = document.getElementById('map-geo-overlay');
  if (!overlay) return;
  overlay.hidden = !visible;
}

function setMapStatus(message) {
  const status = document.getElementById('map-status');
  if (status) status.textContent = message || '';
}

function paintFallbackBasemap(container) {
  const fallback = document.createElement('div');
  fallback.className = 'map-basemap-fallback';
  fallback.setAttribute('role', 'img');
  fallback.setAttribute('aria-label', 'World map outline');
  container.appendChild(fallback);
}

function domainList(aggregated) {
  return Object.keys(aggregated || {}).filter((domain) => !LOCALHOST_DOMAINS.has(domain));
}

function fillClusterTooltip(tooltipEl, cluster, aggregated) {
  tooltipEl.replaceChildren();
  cluster.domains.slice(0, 8).forEach((domain) => {
    const line = document.createElement('div');
    const count = aggregated[domain]?.count || 0;
    line.textContent = `${domain} · ${count}`;
    tooltipEl.appendChild(line);
  });
  if (cluster.domains.length > 8) {
    const more = document.createElement('div');
    more.textContent = `+${cluster.domains.length - 8} more`;
    tooltipEl.appendChild(more);
  }
}

function renderMarkers(g, projection, locations, aggregated, tooltipEl) {
  const points = [];
  Object.entries(locations || {}).forEach(([domain, loc]) => {
    if (!loc || !Number.isFinite(loc.lat) || !Number.isFinite(loc.lon)) return;
    const xy = projection([loc.lon, loc.lat]);
    if (!xy || !Number.isFinite(xy[0]) || !Number.isFinite(xy[1])) return;
    points.push({
      domain,
      x: xy[0],
      y: xy[1],
      count: aggregated[domain]?.count || 1,
    });
  });

  const clusters = clusterMarkers(points);
  const markerLayer = g.append('g').attr('class', 'map-markers');

  clusters.forEach((cluster) => {
    let label = `${cluster.domains.length} sites · ${cluster.count} visits`;
    if (cluster.domains.length === 1) {
      label = `${cluster.domains[0]} · ${cluster.count} visits`;
    }
    const node = markerLayer
      .append('g')
      .attr('class', 'map-marker')
      .attr('transform', `translate(${cluster.x},${cluster.y})`)
      .attr('tabindex', '0')
      .attr('role', 'img')
      .attr('aria-label', label);

    const radius = Math.max(4, Math.min(14, 3 + Math.sqrt(cluster.count)));
    node.append('circle').attr('r', radius).attr('class', 'map-marker-dot');

    let caption = String(cluster.domains.length);
    if (cluster.domains.length === 1) {
      [caption] = cluster.domains;
    }
    node
      .append('text')
      .attr('class', 'map-marker-label')
      .attr('dy', radius + 10)
      .attr('text-anchor', 'middle')
      .text(caption);

    const showTip = () => {
      fillClusterTooltip(tooltipEl, cluster, aggregated);
      tooltipEl.style.visibility = 'visible';
    };
    const hideTip = () => {
      tooltipEl.style.visibility = 'hidden';
    };
    node
      .on('mouseenter', showTip)
      .on('focus', showTip)
      .on('mouseleave', hideTip)
      .on('blur', hideTip);
  });

  return clusters.length;
}

function attachZoom(svg, gZoom, d3, onZoomChange) {
  const zoomBehavior = d3
    .zoom()
    .scaleExtent([1, 8])
    .on('zoom', (event) => {
      gZoom.attr('transform', event.transform);
      onZoomChange?.(event.transform.k);
    });
  svg.call(zoomBehavior);
  const duration = prefersReducedMotion() ? 0 : 160;
  return {
    zoomIn: () => svg.transition().duration(duration).call(zoomBehavior.scaleBy, 1.25),
    zoomOut: () => svg.transition().duration(duration).call(zoomBehavior.scaleBy, 0.8),
    resetZoom: () => {
      svg.transition().duration(duration).call(zoomBehavior.transform, d3.zoomIdentity);
    },
  };
}

/**
 * Render the atlas (always local) and optional clustered pins.
 * Never leaves a blank stage: fallback ocean + overlay if D3/atlas fail.
 */
export async function renderMapView(
  container,
  {
    data = {},
    geoLookupEnabled = false,
    atlas = null,
    loadAtlas = loadWorldAtlas,
    resolveLocations = resolveDomainLocations,
    fetchImpl = globalThis.fetch,
  } = {},
) {
  if (!container) return { pins: 0, overlay: true, usedFallback: true };

  container.replaceChildren();
  const overlayOn = !geoLookupEnabled;
  setOverlayVisible(overlayOn);

  const { d3 } = window;
  let usedAtlas = atlas;
  if (!usedAtlas) {
    try {
      usedAtlas = await loadAtlas(fetchImpl);
    } catch {
      usedAtlas = null;
    }
  }

  let locations = {};
  if (geoLookupEnabled) {
    const result = await resolveLocations(domainList(data), {
      enabled: true,
      fetchImpl,
    });
    locations = result.locations || {};
  }

  const locatedCount = Object.keys(locations).length;
  let lookupStatus = 'Local world outline. Location lookup is off.';
  if (geoLookupEnabled) {
    if (locatedCount > 0) {
      lookupStatus = `Location lookup on · ${locatedCount} located · cached on this device`;
    } else {
      lookupStatus = 'Location lookup on · no pins yet (cache fills as lookups succeed)';
    }
  }

  if (!d3?.geoNaturalEarth1 || !d3.geoPath || !usedAtlas) {
    paintFallbackBasemap(container);
    setMapStatus(lookupStatus);
    mapControls = null;
    return { pins: locatedCount, overlay: overlayOn, usedFallback: true };
  }

  const width = Math.max(container.clientWidth || 640, 320);
  const height = Math.max(container.clientHeight || 420, 280);
  const projection = d3.geoNaturalEarth1().fitSize([width, height], usedAtlas);
  const path = d3.geoPath(projection);

  const svg = d3
    .select(container)
    .append('svg')
    .attr('viewBox', `0 0 ${width} ${height}`)
    .attr('preserveAspectRatio', 'xMidYMid meet')
    .classed('map-svg', true);

  const gZoom = svg.append('g').attr('class', 'map-zoom-group');
  gZoom.append('path').datum({ type: 'Sphere' }).attr('class', 'map-ocean').attr('d', path);
  gZoom
    .selectAll('path.map-land')
    .data(usedAtlas.features)
    .enter()
    .append('path')
    .attr('class', 'map-land')
    .attr('d', path);

  const tooltip = document.createElement('div');
  tooltip.className = 'map-tooltip graph-tooltip';
  tooltip.style.visibility = 'hidden';
  container.appendChild(tooltip);

  let pinCount = 0;
  if (geoLookupEnabled) {
    pinCount = renderMarkers(gZoom, projection, locations, data, tooltip);
  }
  setMapStatus(lookupStatus);

  const zoomLevelEl = document.getElementById('map-zoom-level');
  mapControls = attachZoom(svg, gZoom, d3, (k) => {
    if (zoomLevelEl) zoomLevelEl.textContent = `${Math.round(k * 100)}%`;
  });

  return { pins: pinCount, overlay: overlayOn, usedFallback: false };
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

  const zoomIn = document.getElementById('map-zoom-in');
  const zoomOut = document.getElementById('map-zoom-out');
  const zoomReset = document.getElementById('map-zoom-reset');
  if (zoomIn) zoomIn.addEventListener('click', () => mapControls?.zoomIn());
  if (zoomOut) zoomOut.addEventListener('click', () => mapControls?.zoomOut());
  if (zoomReset) zoomReset.addEventListener('click', () => mapControls?.resetZoom());

  const clearBtn = document.getElementById('map-clear-cache');
  if (clearBtn) {
    clearBtn.addEventListener('click', async () => {
      try {
        await clearGeoLookupCache();
        setMapStatus('Location cache cleared');
        await updateMapView(null, { reuseLast: true });
      } catch {
        setMapStatus('Unable to clear location cache');
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
}

export function resetMapViewForTests() {
  activeTab = VIZ_TAB_GRAPH;
  lastAggregated = {};
  mapControls = null;
  mapChromeBound = false;
  tabsBound = false;
}
