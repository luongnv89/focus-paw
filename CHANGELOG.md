# Changelog

## Unreleased — FocusPaw Rebrand

> FocusBear has been rebranded to **FocusPaw** with a new paw-themed mascot and brand identity.

### Rebrand

- **New brand identity** — FocusPaw name, tagline ("Track your focus, one paw at a time"), paw-themed mascot, updated brand kit (`phase-1-requirements/brand_kit.md`).
- **New icons** — Paw-print icon (light + dark) with green focus-highlight accent; PNG variants regenerated at 16/32/48/128.
- **All product surface updated** — manifest (name/description/author/default_title), extension pages (popup, dashboard, blocking, domain, blocked, help), source JS/CSS, scripts, landing page, README, docs, AGENTS.md, CLAUDE.md.
- **Compatibility** — No storage-key or permission changes; existing installs upgrade in place. GitHub links still point to `luongnv89/focus-bear` (repo unchanged). Archived planning/spec docs (`phase-1-requirements/`, `specs/`) retain the legacy name for historical accuracy.

### Map view

- **Dashboard Map tab** — Leaflet + OpenStreetMap tiles (EchoFootPrint-style clustering, region drawer, dark/light tile invert). Vendored Leaflet 1.9.4 and markercluster 1.5.3.
- **Opt-in location lookup** — Off by default. Cloudflare DNS-over-HTTPS then `ipwho.is/{ip}` over HTTPS; results cached locally (~7 days) with a Map cache-clear control. No `geolocation` permission.
- **Privacy copy** — Help, landing-page policy, and README disclose OSM tiles vs optional named-origin lookups. Remaining Echo gaps: `docs/map-view-parity.md`.

### UI Refresh

- **Obsidian design tokens** — New token system in `src/common/theme.css`: layered near-black surfaces (`--bg-0..3`), hairline borders (`--line-1/2`), ink text ramp, green accent as signal-only color, soft variants for ok/warn/bad/info, plus a `body.light-mode` set. Shared shell in `src/common/shell.css`.
- **SVG icon sprite** — `assets/icons.svg` (24px viewBox, 1.75 stroke, `currentColor`) + `src/common/icons.js` `svgIcon()` replace all emoji in UI chrome; bear mascot kept on the blocked page and popup empty state.
- **Dashboard** — KPI strip (visits / unique sites / focus score / streak), segmented Today/Week/Month + Compare toolbar, zoom controls, `viewBox`-responsive graph with top-left legend, bottom-right zoom bar, summary strip, and compact weekly-insights cards.
- **Shared header** — 56px `.app-header` with logo disc, page crumb, and ghost icon actions across dashboard, blocking rules, domain detail, and help pages.
- **Blocked page & popup** — Restyled to tokenized cards/pills; block page uses a centered card with a single settle animation; popup gets ghost icon buttons and sprite icons.
- **Accessibility** — Visible `:focus-visible` ring, `prefers-reduced-motion` support throughout, no infinite animations, tabular numerals for stats, WCAG AA contrast targets.
- **Muted category palette** — Graph node colors muted to sit on dark surfaces; node labels truncated with a paint-order stroke for legibility.

## v1.0.0 — 2026-09-01

> First official release of the extension (pre-rebrand). This version marks the completion of all P0–P4 development phases, including the core extension, landing page, and comprehensive security hardening.

### Breaking Changes

- **React Router 6 → 7** — API surface changed; upgrade guide in PR #67.
- **Lucide 0.x → 1.x** — Icon import paths changed; upgrade guide in PR #67.
- **React 18 → 19** — Peer dependency update; upgrade guide in PR #66.
- **ESLint 9 flat config** — `eslint.config.js` replaces `.eslintrc`; PR #64.
- **Node runtime policy** — Minimum Node bumped to 22 via `engines.node`; PR #63.
- **`<all_urls>` moved to `optional_host_permissions`** — Permission model changed for security; PR #55.

### Features

- **Focus Score** — Single-pass history computation with memoized streak tracking (PR #69).
- **Landing Page** — Dedicated marketing page for the Chrome extension (PR #13).
- **Help & FAQ Page** — Privacy information and feature explanations (PR #82).
- **Blocking Rules Page** — User-configurable domain blocking rules (PR #78).
- **Topography Graph Zoom** — Zoom in/out controls for the topology visualization (PR #67).
- **Node Policy + CI Lanes** — Runtime upgrade and CI matrix for Node 22/24 (PR #63).
- **P1 Secure & Patch** — Root + landing page security hardening with regression tests (PR #62).
- **P0 Stabilization** — Fixed SW duplicate listeners, deterministic builds, landing CI (PR #61).
- **Runnable Baseline** — Restored extension with smoke tests for P0 (PR #60).
- **Dev Setup** — Agent-runnable development environment with CLAUDE/AGENTS docs (PR #59).
- **Sharp 0.35.4** — Image processing library upgrade, removed focus-trap (PR #65).

### Bug Fixes

- **Category Matcher** — Label-aligned matcher drops substring false positives (PR #87).
- **Security: CSV Formula Injection** — Hardened CSV export against formula injection (PR #54).
- **Security: XSS** — Replaced HTML-string templating with safe DOM APIs (PR #76).
- **Privacy: Google S2** — Dropped Google S2 favicon fetches; reduced external calls (PR #82).
- **UX Cleanup** — Removed high-contrast, label counts, countdown, toolbar, insights (PR #78).
- **Storage Writer** — Serialized, bounded writer prevents race conditions (PR #68).
- **Netlify Builds** — Fixed base directory, npm ci, and install commands (PRs #52, #53, #54, #55).
- **Dark Mode** — Fixed domain label text visibility in topology graph (PR #67).
- **Label Readability** — Improved domain name label rendering in topology graph (PR #67).

### Performance

- **Dropped Redundant updateBlockingRules** — Removed unnecessary dynamic limits import (PR #81).
- **Single-Pass Focus Score** — Zero unnecessary `overallStreak` writes; one storage read per dashboard load (PR #69).

### Documentation

- **Node Runtime Policy** — Synced engines >=22 across all READMEs (PR #85).
- **Chrome Web Store** — Added permission justification and submission prep (PRs #12, #11).
- **Dev Setup** — Documented agent-runnable development workflow (PR #59).

### Dependencies

- **Dedupe Transitive Resolutions** — Nearest-parent upgrades eliminate duplicate resolution (PR #79).

### Other Changes

- **Visualization Refactor** — Split god function, introduced named constants, fixed comments (PR #80).
- **Date/Time Utils** — Unified date, time-range, and limit-form controller (PR #75).
- **Dead Code Removal** — Removed goals/achievements/insights/export-PNG subsystem (PR #70).
- **Dead Code Removal** — Removed remaining dead code paths (PR #74).
- **Coverage Program** — Added coverage program to enforce targets (PR #77).
- **CI Coverage Gate** — 60% line threshold with `fail_ci_if_error` (PR #86).
- **Pre-built Landing Dist** — Added pre-built landing page for Netlify hosting (PR #13).
- **Prettier Formatting** — Applied consistent formatting to dashboard files (PR #67).
- **Dashboard Height** — Content now uses full available height (PR #67).
- **Dashboard UI Simplify** — Simplified dashboard UI and fixed dark theme issues (PR #67).
- **Rebrand to Dark Mode** — Changed to dark-only mode with dark blue theme (PR #67).
- **Topology Responsive** — Graph now adapts to container size (PR #67).
- **Dashboard Typography** — Improved typography, colors, and visual hierarchy (PR #67).

### New Contributors

- None — all contributions by [@luongnv89](https://github.com/luongnv89).

**Full Changelog**: https://github.com/luongnv89/focus-paw/compare/v1.0.0...HEAD
