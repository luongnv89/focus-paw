# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**FocusPaw** is a Chrome extension (Manifest V3) that helps users track focus-switching habits through an interactive D3.js visualization. The extension is privacy-first and local-only with no external API calls or cloud synchronization.

**Current Status:** v1.0.0 - First official release. Core features complete, Chrome Web Store live.

**Tech Stack:** Vanilla JavaScript (ES modules), D3.js v7, Chrome APIs (tabs, storage, webRequest, notifications), HTML5/CSS3

## Development Roadmap

The project is organized into 4 phases (see `tasks.md` for detailed breakdown):

1. **Phase 0:** Core tracking + basic list UI (1 week) - POC validation
2. **Phase 1:** MVP core features - D3 graph, limits, block page, settings (2 weeks)
3. **Phase 2:** Polish - onboarding, streaks, animations, high-contrast mode (1 week)
4. **Phase 3:** Advanced features - subpath drilldown, export formats, testing (2 weeks)
5. **Phase 4:** Launch - store assets, accessibility audit, Chrome Web Store submission (1 week)

**MVP Feature Set:**

- Per-domain focus visit tracking
- Interactive radial graph visualization with time-range filtering
- Per-site daily limits with countdown bubbles
- Humorous block page when limits exceeded
- Settings panel for limit configuration
- WCAG 2.1 AA accessibility compliance

## Architecture

### High-Level System Design

```
Service Worker (Background)
├─ Monitors tabs.onActivated/onUpdated events
├─ Extracts domain/path from active tab URL
├─ Stores visit counts in chrome.storage.local
├─ Enforces limits via webRequest.onBeforeRequest interception
└─ Sends toast notifications for countdown

Popup UI
├─ Renders D3.js radial graph (user at center, domains as orbiting nodes)
├─ Filters data by time range (hour/day/week/month)
├─ Allows domain search and highlighting
├─ Provides settings panel for per-site daily limits
└─ Displays stats and achievements

Block Page
├─ Static HTML shown when domain limit exceeded
├─ Humorous, brand-aligned messaging
├─ "Back to Work" button to bypass (with cooldown)
└─ Future: rotating themes and mini-games
```

### Data Storage Schema

```javascript
{
  "visits": {
    "2025-11-14": {
      "example.com": 5,
      "twitter.com": 12,
      "reddit.com/r/programming": 3
    }
  },
  "limits": {
    "example.com": 10,
    "twitter.com": 5
  }
}
```

### Core Modules (in `/src/`)

- **`background/`** - Service worker scripts
  - `index.js` - Service worker entry point
  - `tracking.js` - Tab event handlers, domain extraction, visit counting
  - `storage.js` - Data model helpers, chrome.storage.local queries
  - `limits.js` - Limit checking and enforcement
  - `focus-score.js` - Focus score calculation algorithm
  - `badge.js` - Extension badge management
- **`dashboard/`** - Full-page dashboard UI
  - `index.html` - Dashboard page structure
  - `dashboard.js` - Dashboard logic and interactions
  - `dashboard.css` - Dashboard styles
  - `blocking.html/js/css` - Blocking rules management page
  - `domain.html/js/css` - Domain detail view
- **`popup/`** - Popup UI (compact view)
  - `popup.html` - Popup structure
  - `popup.js` - Popup initialization
  - `popup.css` - Shared styles (also used by dashboard)
  - `graph.js` - D3.js radial graph rendering
- **`blocked/`** - Block page
  - `blocked.html` - Block page template
  - `blocked.js` - Block page logic
  - `blocked.css` - Block page styles
- **`help/`** - Help & FAQ page
  - `help.html` - Help page structure
  - `help.js` - FAQ accordion functionality
  - `help.css` - Help page styles
- **`content/`** - Content scripts
  - `countdown-toast.js` - Toast notification rendering
  - `countdown-toast.css` - Toast styles
- **`common/`** - Shared utilities
  - `feature-flags.js` - Feature flag management
  - `visualization-page.js` - Shared visualization helpers
  - `theme.css` - Design tokens (Obsidian palette, type scale, buttons, pills, inputs)
  - `shell.css` - Shared app header, `.page` scaffold, KPI tiles
  - `icons.js` - `svgIcon()` helper for the `assets/icons.svg` symbol sprite

## Development Guidelines

### Code Style & Quality

- **Module Format:** ES modules (`import`/`export`)
- **JavaScript Version:** Modern JS (const/let, arrow functions, template literals, destructuring)
- **Conventions:** Airbnb/StandardJS style guide
- **Linting:** ESLint configuration required
- **Formatting:** Prettier for consistent code formatting

### Key Architectural Principles

1. **Privacy-First:** No external APIs, no telemetry, no cloud sync - all data stays local
2. **Single Responsibility:** Clear separation between tracking, storage, display, and enforcement
3. **Minimal Dependencies:** Vanilla JS for popup (size), D3.js only for visualization
4. **Chrome MV3 Compliance:** Use Service Worker (not background page), respect permission model
5. **Performance:** Popup load < 300ms, graph render < 1s for 100 domains

### Security Considerations

- **XSS Protection:** Use `textContent` or safe DOM APIs; never use `innerHTML` with untrusted data
- **Minimal Permissions:** Request only necessary Chrome permissions
- **No Secrets:** Never hardcode API keys or sensitive data
- **Fail Gracefully:** Handle errors without exposing stack traces

### Testing Strategy

- **Unit Tests:** Jest for core logic (data aggregation, limit checks, streak calculations)
- **Integration Tests:** Manual testing of popup UI and background event handlers
- **Performance:** Chrome DevTools profiling for popup/graph responsiveness
- **Accessibility:** Lighthouse audit, manual WCAG 2.1 AA checks, keyboard navigation testing

## Common Development Commands — Recorded Commands (test command of record: `npm test -- --ci`)

> **Source of truth:** `docs/dev-setup.md` — toolchain (`npm ci` clean checkout), Node ≥20 (final policy ≥22 via Task 2.1), Chrome 100+, plus the five recorded commands every P0–P4 task verifies against. Until Task 0.1 restores the suite, the RED baseline means `npm test -- --ci` may report `jest: command not found`; see that file for expected outputs and the smoke-test additions (popup DOM load + SW `onInstalled`/`onActivated` wiring).

```bash
# 1. Build the extension (deterministic after 0.3 — git status clean after build)
npm run build
# = npm run version:update && node scripts/build.js  → dist/manifest.json + dist/src + dist/assets

# 2. Test — command of record (≥ pass rate recorded in 0.1 is the floor for all later tasks)
npm test -- --ci
# Coverage: npm run test:coverage -- --ci  → coverage/lcov.info for codecov

# 3. Lint (format check + ESLint)
npm run lint
# = npm run format:check && eslint "src/**/*.js"

# 4. Format check only
npm run format:check
# Fix locally: npm run format  or  npm run lint:fix

# 5. Landing-page second package (own lockfile, own CI job after 0.4)
cd landing-page && npm ci && npm run build
# Also in CI: npm run lint -- --max-warnings 0  &&  npm run format:check  &&  npm run build

# Legacy helpers (still valid, but not part of the five recorded)
npm ci                          # deterministic install from lockfile — use over npm install for verification
npm run version:update          # updates manifest version_name with git hash (auto via build)
npm run dev                     # watch mode via scripts/watch.js
npm run lint:fix                # prettier --write + eslint --fix
npm run test -- tests/background/limits.test.js  # single-file run
npm run icons:generate          # sharp-based icon generation (Task 2.9)
```

### Architecture Constraints — Storage / Limits (local-only, MV3)

- **Storage is local-only:** all state in `chrome.storage.local` via helpers in `src/background/storage.js`. No external APIs, no telemetry, no cloud sync. Never add a remote write path without explicit instruction.
- **Atomic visit mutation:** after Task 3.1, `incrementVisit` is a serialized, bounded writer (check `chrome.runtime.lastError`, cap timestamp retention, no read-modify-write races). Before 3.1, direct `storage.get`+`set` races lose counts.
- **Limit enforcement:** `src/background/limits.js` + `src/background/notifications.js` + `src/background/focus-score.js` share a single normalization boundary for legacy numeric limits (`{ "example.com": 10 }` → `{ daily: 10, fiveHours: … }`) — fixed in 0.2. The shared date-key utility (Task 3.3) is the only correct `YYYY-MM-DD` source (local-tz aware); inline `toISOString().split('T')[0]` is legacy.
- **MV3 service worker:** `src/background/index.js` registers `tabs.onActivated`/`onUpdated`/`onInstalled`/`storage.onChanged` listeners **top-level only** — never inside `onInstalled` (double-registration bug fixed in 0.2). Requires `tabs`, `storage`, `notifications`, `declarativeNetRequest*`, `<all_urls>`.
- **Module layout:** `background/` (tracking/storage/limits/focus-score/achievements/badge) · `popup/` + `popup/graph.js` (D3 radial graph) · `dashboard/` (full-page dashboard, blocking, domain) · `blocked/` · `help/` · `content/countdown-toast.js` · `common/visualization-page.js` (shared helpers) · `landing-page/` (Vite/React second package) — see `docs/dev-setup.md` for the full tree.

Load unpacked for manual testing:

```bash
# 1. Open chrome://extensions/ → Developer mode ON
# 2. Load unpacked → select dist/ (after npm run build)
# 3. Inspect: service_worker / popup / dashboard; check storage: chrome.storage.local.get(null, d => console.log(d))
```

### Version Management

The extension uses **semantic versioning** with git commit hash tracking:

- **`version`** in `manifest.json`: Numeric version required by Chrome (e.g., "1.0.0")
- **`version_name`** in `manifest.json`: Display version with git hash (e.g., "1.0.0-7205313")

The `version_name` is automatically updated before each build via `scripts/update-version.sh`:

```bash
# Manual update (automatically run by npm run build)
npm run version:update

# Or run script directly
bash scripts/update-version.sh
```

This ensures every build is traceable to a specific git commit for debugging and support.

### Local Testing & Debugging

```bash
# View extension logs
# 1. Open chrome://extensions/
# 2. Find "FocusPaw"
# 3. Click "Inspect views" > "service_worker"

# Debug popup
# 1. Click extension icon (FocusPaw in toolbar)
# 2. Right-click popup → "Inspect"

# Check storage
# In DevTools Console:
chrome.storage.local.get(null, (data) => console.log(data))
```

## Important Files & References

- **`README.md`** - Project overview and installation instructions
- **`PRIVACY.md`** - Privacy policy (required for Chrome Web Store)
- **`STORE_LISTING.md`** - Chrome Web Store listing details and assets checklist
- **`LICENSE`** - MIT License
- **`phase-1-requirements/prd.md`** - Complete product requirements
- **`phase-1-requirements/ux_design.md`** - UI/UX wireframes and user flows
- **`phase-1-requirements/brand_kit.md`** - Brand guidelines, colors, typography
- **`AGENTS.md`** - Detailed coding guidelines and AI agent instructions

## Brand & Design System

The extension UI uses the "Obsidian instrument panel" design system. Design tokens live in `src/common/theme.css` (surfaces, ink, signal colors, type scale, buttons, pills); shared header/page/KPI styles in `src/common/shell.css`; icons via the `assets/icons.svg` stroke sprite + `src/common/icons.js`. See `phase-1-requirements/brand_kit.md` for the full kit and `phase-1-requirements/ui-refresh-spec.md` for the spec.

**Personality:** Playful, honest, supportive, clever, minimalist - no guilt-tripping, only encouragement

## Accessibility Requirements

- **Target:** WCAG 2.1 AA compliance
- **Keyboard Navigation:** All features usable via keyboard (Tab, Enter, Space, Arrow keys)
- **Color Contrast:** Minimum 4.5:1 for text, 3:1 for UI components
- **ARIA Labels:** Descriptive labels for all interactive elements
- **Reduced Motion:** Respect `prefers-reduced-motion` media query
- **Focus Indicators:** Visible focus rings on interactive elements

## Performance Targets

- Popup load: < 300ms
- D3.js radial graph render: < 1s for 100 domain nodes
- Tab switch detection: Instant (no perceptible lag)
- Chrome extension size: < 500KB

## Additional Notes

- **No external dependencies beyond D3.js** - Keep bundle minimal for faster load times
- **Extension-only distribution** - Chrome Web Store release planned for Phase 4
- **Desktop only** - Initial release targets desktop browsers; mobile extension support may be added later
- **Data deletion** - Users can clear all tracking data via Chrome's extension settings
- **Testing environments** - Use test suites and manual testing with multiple tab/domain scenarios

## Active Technologies

- JavaScript ES2020+ (React 18.x, Vite 5.x) + React 18, React Router 6, TailwindCSS 3, Lucide Icons, react-medium-image-zoom or similar lightbox library (001-landing-page)
- N/A (static site, no backend storage) (001-landing-page)

## Recent Changes

- 001-landing-page: Added JavaScript ES2020+ (React 18.x, Vite 5.x) + React 18, React Router 6, TailwindCSS 3, Lucide Icons, react-medium-image-zoom or similar lightbox library
