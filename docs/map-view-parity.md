# Map view parity with EchoFootPrint

FocusPaw issue #104 ships a **dashboard Map tab** using the same Leaflet + OSM stack as EchoFootPrint, with privacy differences called out below.

## What FocusPaw ships

- **Leaflet 1.9.4** + **leaflet.markercluster 1.5.3**, vendored under `src/vendor/` (no bundler, same copy-to-dist path as D3).
- **OpenStreetMap** raster tiles (`{s}.tile.openstreetmap.org`) whenever the Map tab is open, with OSM attribution. Dark theme inverts the tile pane only (Echo CSS filter).
- Optional **HTTPS** lookup: Cloudflare DoH (`application/dns-json`) then **ipwho.is** (`https://ipwho.is/{ip}`), **off by default**, cached in `chrome.storage.local` (~7 day TTL, size cap), with an icon cache-clear control.
- Marker clusters, DOM popups (no HTML-string interpolation of domains), region drawer, geo-off / loading / empty overlays.
- Obsidian design tokens. Map lives on the **dashboard**; the popup stays radial-graph-only.

## Intentional gaps vs EchoFootPrint

| Echo-style capability | FocusPaw choice | Why |
| --- | --- | --- |
| HTTP `ip-api` lookups | HTTPS Cloudflare DoH + `ipwho.is/{ip}`, opt-in | Echo’s HTTP ip-api is not used; Chrome and privacy copy require TLS and named origins. |
| Always-on geolocation of domains | Settings toggle default **off** + overlay | Pins are not implied until the user understands the hostname leaves the device. |
| Echo theme / bipartite layout | Obsidian instrument panel | Map is a third view beside the existing radial graph. |
| Popup Map | **No Map in the popup** | Popup is too small; Graph remains the compact visualization. |
| Device GPS | No `geolocation` permission | Hosting-location estimate from hostname DNS, not the user’s coordinates. |
| Carto / unpkg tile or marker CDNs | Vendored Leaflet images + OSM `img-src` only | No API keys, no extra script/image origins. |
| Required `host_permissions` for `http(s)://*/*` | Empty required host list; optional `<all_urls>` | Least-privilege install; lookups request Cloudflare + ipwho origins at opt-in. |

Tiles load when Map opens (same as Echo). Location lookups stay opt-in.

## Rollback

Feature flag `MAP_VIEW` (default `true`) hides the tablist and Map panel without removing the vendored Leaflet files.
