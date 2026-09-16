/**
 * Keyless OSM raster tiles for the dashboard Leaflet Map (EchoFootPrint parity).
 * No API keys. Carto / paid tile CDNs are intentionally unused.
 */

export const OSM_TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

/** Leaflet attribution HTML (OSM tile usage policy). */
export const OSM_TILE_ATTRIBUTION = [
  '&copy; <a href="https://www.openstreetmap.org/copyright">',
  'OpenStreetMap</a> contributors',
].join('');

/** Shared Leaflet tileLayer options for light and dark map themes. */
export function osmTileLayerOptions() {
  return {
    attribution: OSM_TILE_ATTRIBUTION,
    subdomains: 'abc',
    maxZoom: 19,
  };
}
