# Map view parity with EchoFootPrint

FocusPaw issue #104 ships a **dashboard Map tab** that is intentionally **not** an EchoFootPrint clone. This note is the PR-facing list of gaps so reviewers do not treat them as incomplete ports.

## What FocusPaw ships

- Interactive **D3-geo** atlas (`geoNaturalEarth1` + `geoPath`) using a **bundled world-110m GeoJSON** file (`src/dashboard/world-110m.geojson`, Natural Earth 110m countries via world-atlas, properties stripped).
- Default path is **offline**: atlas + “location lookup is off” overlay. **Zero network** for tiles or geolocation until the user opts in.
- Optional **HTTPS** lookup: Cloudflare DoH (`application/dns-json`) then **ipwho.is** (`https://ipwho.is/{ip}`), **off by default**, cached in `chrome.storage.local` (~7 day TTL, size cap), with **Clear location cache** on the Map chrome.
- Simple **grid clustering** of pins (pixel cells), not a marker-cluster plugin.
- Obsidian design tokens only. Map lives on the **dashboard**; the popup stays radial-graph-only.

## Intentional gaps vs EchoFootPrint

| Echo-style capability | FocusPaw choice | Why |
| --- | --- | --- |
| Leaflet + OSM (or other) slippy map | No Leaflet, MapLibre, Carto, or OSM tiles | Keeps the default path local and avoids tile-network privacy cost (#53). |
| Street/basemap tiles | D3-geo atlas, not street tiles | Same zero-network default; atlas is vendored GeoJSON. |
| HTTP `ip-api` lookups | HTTPS Cloudflare DoH + `ipwho.is/{ip}`, opt-in | Echo’s HTTP ip-api is not used; Chrome and privacy copy require TLS and named origins. |
| Always-on geolocation of domains | Settings toggle default **off** + overlay | Pins are not implied until the user understands the hostname leaves the device. |
| Leaflet.markercluster | Grid clustering in projected pixel space | Enough for overlapping pins without a Leaflet stack. |
| Echo theme / bipartite layout | Obsidian instrument panel; no bipartite graph | Map is a third view beside the existing radial graph, not a restyle of Echo. |
| Popup Map | **No Map in the popup** | Popup is too small; Graph remains the compact visualization. |
| Device GPS | No `geolocation` permission | Hosting-location estimate from hostname DNS, not the user’s coordinates. |
| Theme-matched tile layers | Atlas fill/stroke from `--bg-*` / `--line-*` / `--accent` | Tokens only; no third-party tile styles. |
| Echo geo-off / cache chrome | Overlay copy + Settings toggle + **Clear location cache** | Same *jobs* (explain off state, discard cache), different UI language and placement. |

## Rollback

Feature flag `MAP_VIEW` (default `true`) hides the tablist and Map panel without uninstalling the atlas asset.
