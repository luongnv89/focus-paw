# Development Setup — FocusPaw

This document describes how to set up a runnable development environment for FocusPaw from a clean checkout. It is the single source for toolchain, required environment, and the five recorded commands that CI and local verification use.

> **Baseline status: RED at audit (2026-08-30, commit `7d5299f`).**
> A clean `npm ci` checkout builds in an isolated probe, but the local test suite could not start (`jest: command not found`) and lint/format tooling was not installed locally; the last CI run (2025-12-01, run 19828167779) was green. Until **Task 0.1 — Restore a runnable, recorded baseline** lands and records the new pass rate, the commands below may still fail locally. Follow the steps exactly, then run `0.1` fixes to reach green. See `MODERNIZATION_PLAN.md` Task 0.1, `MODERNIZATION_REPORT.md` (Baseline: RED), and `docs/tasks.md`.
>
> **Update 2026-08-31 — Task 0.1 landed (PR #59 + follow-up):** `npm ci` → `npm run build` green, `npm test -- --ci` now runs locally: **6 suites, 119 tests, 0 failures** (114 original + 5 smoke: popup DOM load + SW `onInstalled`/`onActivated` wiring). This is the recorded floor (≥) for all later P0–P4 tasks. `npm run lint` and `npm run format:check` also pass clean (ESLint 8, Prettier 3). Landing `cd landing-page && npm ci && npm run build` green as before. Milestone ME → M0 progression unblocked.
>
> **Update 2026-08-31 — P0 remainder landed (PR #61):** 0.2 legacy-limit normalization + single `initializeTracking`, 0.3 deterministic build (`dist/manifest.json` stamping), 0.4 landing CI gate — now 7 suites, 126 tests (added `legacy-limits.test.js`); floor remains ≥119.
>
> **Update 2026-08-31 — P1 W1/W2 landed (this PR):** root `npm audit fix` cleared W1/W2 High/Critical (8 high → 1 high: `sharp 0.34.5` deferred to 2.9; 1 low +2 moderate → 0), landing `npm audit fix` cleared 12 high → 1 high: `vite/esbuild` deferred to 2.8 + `react-router` v7 deferred to 2.11, plus manual bump `react-router-dom 6.28.0 → 6.30.6`, `yet-another-react-lightbox 3.21.6 → 3.32.2`; added `w1-regression.test.js` (quota/lastError, legacy limits, parseUrl boundaries); now **8 suites, 136 tests, 0 failures** — new floor ≥126, no `.skip`/`.only`. Both `npm run lint`/`format:check` clean; landing `npm run lint -- --max-warnings 0` + `format:check` + `build` green. M1 achieved modulo deferred majors (sharp, vite).

---

## Required Environment

- **Node.js** — `>=22` required (see `MODERNIZATION_PLAN.md` Task 2.1 → `engines.node >=22`, `.nvmrc` `22`, CI matrix `[22.x, 24.x]`). Previous policy `>=20` (with CI `[18.x, 20.x]` EOL 2025-04-30 / 2026-04-30) replaced in 2.1 per Node release schedule https://nodejs.org/en/about/previous-releases. Use `nvm`/`fnm` with `.nvmrc` (currently `22`).
- **npm** — ships with Node. Use `npm ci` in a clean checkout (never `npm install` for CI/verification) to get deterministic installs from `package-lock.json`.
- **Chrome** — version `100+` required for MV3 service-worker, `tabs`, `storage`, `webRequest`/`declarativeNetRequest`, `notifications` APIs. Load the built `dist/` folder via `chrome://extensions → Load unpacked`.
- **OS** — macOS/Linux/WSL supported. `scripts/update-version.sh` handles both `darwin` and `linux` `sed` variants.
- **Tools assumed on PATH** — `git`, `bash`, `node`, `npm`, `chrome` (or Chromium).

---

## Toolchain Install (clean checkout)

```bash
# 1. Clone and enter
git clone https://github.com/luongnv89/focus-paw.git
cd focus-paw

# 2. Install root package deterministically (requires package-lock.json)
npm ci

# 3. Install landing-page package (second lockfile)
cd landing-page && npm ci && cd ..

# Expected output (abbrev.):
# added 300+ packages, and audited ... packages
# found 0 vulnerabilities (after W1/W2 patches; may show High/Critical before 1.1–1.4)
```

Re-run `npm ci` after switching branches or pulling lockfile changes. Do not commit `node_modules/`, `dist/`, or `coverage/` — they are gitignored.

---

## Recorded Commands (test command of record)

All tasks `P0–P4` verify against these five commands. Prefer them over ad-hoc variants.

### 1. Build the extension

```bash
npm run build
# Internally: node scripts/build.js (stamps version_name into dist/manifest.json via git hash)
# Legacy: npm run version:update && node scripts/build.js (pre-0.3) — now deterministic, tracked manifest.json untouched
# Expected: "Building FocusPaw extension..." → "Stamped dist/manifest.json version_name: 1.0.0-<hash>" → "Build complete! Output in dist/"
# Output tree: dist/manifest.json (with version_name), dist/src/, dist/assets/
# After Task 0.3 the build no longer mutates tracked manifest.json;
# git status --porcelain must be clean after build (verify: `npm run build && git status --porcelain`).
```

### 2. Run the test suite (command of record)

```bash
npm test -- --ci
# Expected before 0.1: sh: jest: command not found (RED baseline — Jest not installed locally, CI green)
# Expected after 0.1: Jest summary + pass rate, smoke tests for popup DOM load and SW onInstalled/onActivated wiring
# Coverage variant: npm run test:coverage -- --ci  (produces coverage/lcov.info, consumed by codecov in CI)
```

The pass rate recorded in `0.1` becomes the floor for every later task (`≥ recorded rate`). CI runs the same command in both `lint-and-test` and `coverage` jobs.

### 3. Lint

```bash
npm run lint
# = npm run format:check && eslint "src/**/*.js"
# Expected after 0.1: 0 errors, 0 warnings (after Task 2.6/2.7 ESLint 9 migration, flat config)
# Before that, a written list of pre-existing violations is acceptable per 0.1 AC.
```

### 4. Format check

```bash
npm run format:check
# = prettier --check "src/**/*.{js,html,css}"
# Expected: "All matched files use Prettier code style!" or exit 0
# Fix: npm run format  (or npm run lint:fix)
```

### 5. Build the landing page (second package)

```bash
cd landing-page && npm ci && npm run build
# Internally: vite build (manual chunk splitting per research.md)
# Expected: "vite v5.x building for production..." → "✓ built in ...s"
# Additional checks (landed in CI by Task 0.4):
#   npm run lint -- --max-warnings 0
#   npm run format:check
# Verify build: npm run preview (then open localhost:4173, smoke-check Landing + /privacy)
```

---

## Pre-commit & CI Parity

- **Husky + lint-staged**: `npm install` installs `.husky/pre-commit` which runs `eslint --fix`, `prettier --write`, and `jest --bail --findRelatedTests --passWithNoTests` on staged `src/**/*.js` plus `prettier` on `html/css`. To bypass (not recommended): `git commit --no-verify`.
- **CI** (`.github/workflows/ci.yml`): on every `push`/`pull_request`
  - `lint-and-test` matrix `[22.x, 24.x]` (was `[18.x, 20.x]` pre-2.1) → `npm ci → npm run lint → npm run format:check → npm test → npm run build` + artifact `dist/` (on `24.x`)
  - `coverage` (Node `22.x`) → `npm test -- --coverage` → `codecov/codecov-action@v7` with `fail_ci_if_error: true` (Task 4.7) and a 60% line-coverage threshold gate that fails the build if the aggregate lcov drops below the M3 target (Task 4.7)
  - `landing` job (Node `22.x`) → `cd landing-page && npm ci && npm run lint -- --max-warnings 0 && npm run format:check && npm run build` (landed in 0.4)
  - Engines: both `package.json` declare `engines.node >=22`, `.nvmrc` `22` (Task 2.1)

CI must be green before any `P1+` task is considered done.

---

## Module Layout Note (for agents)

```
src/
  background/          # Service worker (MV3, type: module)
    index.js           # entry — registers top-level listeners (tabs, storage, notifications)
    tracking.js        # tab focus tracking, domain extraction, visit counting
    storage.js         # chrome.storage.local helpers, atomic visit mutation (Task 3.1)
    limits.js          # limit checking/enforcement, legacy-limit normalization (Task 0.2)
    notifications.js   # countdown/bubble logic, limit warnings
    focus-score.js     # 0–100 score, compliance & streak helpers
    achievements.js    # streak/badge logic (survives dead-code removal 3.4)
    badge.js           # toolbar badge text
  dashboard/           # full-page dashboard + Map tab (Leaflet/OSM, map-view.js, geolocation.js)
  popup/               # popup + graph.js (D3 radial graph)
  blocked/             # block page
  help/                # help/FAQ
  content/             # countdown-toast content script
  common/              # shared utils (visualization-page.js, feature-flags.js, categories.js)
landing-page/          # Vite + React 18 landing site (second lockfile, own CI job)
scripts/               # build.js, update-version.sh (0.3 makes version stamping deterministic), generate-icons.js
tests/                 # Jest tests (smoke + unit after 0.1)
```

Storage is **local-only** (`chrome.storage.local`), never remote; MV3 `manifest.json` permissions are least-privilege (`tabs`, `storage`, `notifications`, `declarativeNetRequest*`, `<all_urls>` host — justified in PRIVACY.md after 4.5).

---

## Quick Smoke After Setup

```bash
npm ci && npm run build && npm test -- --ci   # M0 gate (after 0.1)
npm run lint && npm run format:check           # must pass
cd landing-page && npm ci && npm run build     # second package green
git status --porcelain                         # must be empty after build (0.3)
```

If any step fails with `command not found`, re-run `npm ci` in that package and verify Node ≥20 via `node -v`. For `jest: command not found` before 0.1, that is the expected RED baseline — no action beyond running 0.1.

---

## How to Point Future Agents Here

`CLAUDE.md` and `AGENTS.md` both reference this file as the authoritative install/run notes and list the same five recorded commands plus the module layout and storage/limits constraints. Keep them in sync when this file changes (see `MODERNIZATION_PLAN.md` Pre.2/Pre.3).
