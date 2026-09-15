# Modernization Plan — FocusPaw

Derived from [`MODERNIZATION_REPORT.md`](./MODERNIZATION_REPORT.md) · **Baseline at audit:** RED
**Test command of record:** `npm test -- --ci` · **Pass rate at audit:** not locally measurable (Jest absent); CI green at last run (2025-12-01), which is the recorded "still green" bar until Task 0.1 lands.

**Baseline-green substitution (RED baseline):** until Task 0.1 restores a runnable suite, P0–P4 tasks scheduled before it assert "`npm run build` succeeds (isolated)" instead of the test suite. From 0.1 onward every P0–P4 task asserts _"`npm test -- --ci` passes at ≥ the pass rate recorded in 0.1; `npm run lint` and `npm run format:check` pass."_ Pre omits both assertions (install/run notes + create-or-update of `CLAUDE.md`/`AGENTS.md` only).

## At a glance

| Phase                 | Sprints | Tasks | Closes                                                                                                            | Milestone |
| --------------------- | ------- | ----- | ----------------------------------------------------------------------------------------------------------------- | --------- |
| Pre Agent environment | Pre     | 3     | — (enables ME)                                                                                                    | ME        |
| P0 Stabilize          | 0       | 4     | 2 High (F-BUG-002, F-BUG-003), F-CI-001, F-CI-002, F-TEST-003                                                     | M0        |
| P1 Secure & Patch     | 1       | 5     | 21 High (DEP W1; F-DEP-011 lands in 2.9), F-TEST-002                                                              | M1        |
| P2 Modernize          | 2, 3    | 14    | 5 Critical (F-DEP-072, 201–204), F-DEP-011, 101–104, 111, 121–126, 142, 207                                       | M2        |
| P3 Clean & Harden     | 4       | 9     | F-BUG-001, F-BUG-007/008/004/005/009, F-PERF-001/002/004/005, F-CLEAN-\*, F-DEAD-001..007, F-TEST-001, 70 Low DEP | M3        |
| P4 Polish             | 5       | 8     | F-UX-001..005, F-PERF-003/006, F-SEC-001..003, F-DOCS-001/002, F-CI-003, F-BUG-010                                | M4        |

**Critical path:** `Pre.1 → Pre.2 → 0.1 → 1.1 → 1.2 → 1.5 → 3.1 → 3.6 → 4.1 → 4.3 → 4.5` (≈ 20 days). Nothing in P0 starts before `ME`; nothing outside P0 starts before `M0` (RED baseline); the security waves land before the modernization phases they protect.

**Team:** 1 developer · **Sprint length:** ≤ 10 working days · **All findings scheduled, none deferred.**

## Phase Pre — Agent environment

**Goal:** a repo an AI agent can operate autonomously with no unwritten context (install/run notes, build/test commands, config files) · **Milestone ME:** `CLAUDE.md` and `AGENTS.md` improved via `/agent-config update`; install/run notes documented; recorded commands verified runnable from project files alone.

### Sprint Pre — Agent-runnable environment

#### Task Pre.1: Write the agent-runnable environment and install/run notes

**Description**: Record toolchain install (`npm ci` in a clean checkout), required environment (chrome, Node ≥ 20 note — final policy lands in 2.1), and the recorded commands: `npm run build`, `npm test -- --ci`, `npm run lint`, `npm run format:check`, landing `cd landing-page && npm ci && npm run build`. Serves milestone ME. Baseline is RED: commands may still fail until 0.1; the notes must say so and point to 0.1.

**Closes**: — (milestone-enabling: ME)

**Acceptance Criteria**:

- [ ] A `docs/dev-setup.md` (or equivalent) exists listing toolchain install, chrome requirement, and the five recorded commands with their expected output
- [ ] A later agent can follow the notes from project files alone; the notes explicitly state the audit-time RED status and that 0.1 restores green
- [ ] `.gitignore` still covers `node_modules/`, `dist/`, `coverage/` and nothing new is committed here

**Dependencies**: None

**Effort**: S

**Verify**: `test -f docs/dev-setup.md && grep -q 'npm ci' docs/dev-setup.md`

#### Task Pre.2: Improve CLAUDE.md via /agent-config update

**Description**: `CLAUDE.md` exists at the repo root → invoke `/agent-config update` targeting it (never create). Ensure recorded build/test commands and repo etiquette are captured; the module layout note (background/popup/dashboard/shared) should be included.

**Closes**: — (milestone-enabling: ME)

**Acceptance Criteria**:

- [ ] `CLAUDE.md` exists at repo root
- [ ] `CLAUDE.md` names the recorded build/test commands and the storage/limits architecture constraints (local-only, MV3)

**Dependencies**: Pre.1

**Effort**: S

**Verify**: run `/agent-config update` targeting `CLAUDE.md`

#### Task Pre.3: Improve AGENTS.md via /agent-config update

**Description**: `AGENTS.md` exists → `/agent-config update` targeting it. Keep its rules (local-only privacy, least-privilege permissions, no innerHTML with untrusted content) and add the recorded test/build commands per Pre.1 notes.

**Closes**: — (milestone-enabling: ME)

**Acceptance Criteria**:

- [ ] `AGENTS.md` exists at repo root and is improved against agent-config checklists
- [ ] `AGENTS.md` reflects the storage-writer and test-command contract introduced by 0.1/3.3 (after those land, update asynchronously)

**Dependencies**: Pre.1

**Effort**: S

**Verify**: run `/agent-config update` targeting `AGENTS.md`

## Phase P0 — Stabilize

**Goal:** reproducible green baseline — clean checkout builds, suite runs, CI green, deterministic build · **Milestone M0:** `npm ci && npm run build && npm test -- --ci` all pass from a clean checkout in CI, and the CI artifact tree is byte-deterministic (no tracked file rewritten by build).

### Sprint 0 — Stabilize

#### Task 0.1: Restore a runnable, recorded baseline

**Description**: Perform a clean `npm ci` in a temp copy, run `npm run build` and `npm test -- --ci`; record the pass rate. Add the popup-load smoke test and SW event-handler integration check that AGENTS.md requires (voids F-TEST-003). Fix any failing tests surfaced by the clean install.

**Closes**: `F-TEST-003` (milestone-gate M0)

**Acceptance Criteria**:

- [ ] A clean checkout with `npm ci` produces green `npm run build`
- [ ] `npm test -- --ci` runs and its pass rate is recorded in Pre.1 notes; new smoke tests cover popup DOM load and background `onInstalled`/`onActivated` handler wiring with no exceptions
- [ ] `npm run lint` and `npm run format:check` pass from the clean install (or a written list of pre-existing violations to resolve)
- [ ] The same commands pass in the CI workflow run for this PR

**Dependencies**: Pre.2, Pre.3

**Effort**: M (2 days)

**Verify**: `npm ci && npm run build && npm test -- --ci`

#### Task 0.2: Fix duplicate service-worker listeners and legacy-limit crash

**Description**: Remove `initializeTracking()`/`initializeLimitEnforcement()`/`initializeNotifications()`/`initializeAchievements()` calls from inside the `onInstalled` handler (keep only first-run data seeding); register listeners top-level only. Normalize legacy numeric limits before use in `checkLimitWarnings` (notifications.js:276-280) and focus-score compliance (focus-score.js:55-62) by normalizing at the storage getter boundary.

**Closes**: `F-BUG-002`, `F-BUG-003`, `F-BUG-006`

**Acceptance Criteria**:

- [ ] `initializeTracking()` appears exactly once statically; installing the extension then switching tabs increments visits exactly once per switch (asserted by a test simulating `onInstalled` + `onActivated`)
- [ ] Legacy numeric limit (e.g. `{ "example.com": 10 }`) no longer throws in `checkLimitWarnings` or focus-score; regression test for both
- [ ] `npm test -- --ci` passes at ≥ the 0.1-recorded rate; `npm run lint` clean

**Dependencies**: 0.1

**Effort**: S

**Verify**: `npm test -- --ci`

#### Task 0.3: Make the build deterministic (manifest rewrite)

**Description**: `scripts/update-version.sh` sed-writes tracked `manifest.json` during every build (pre-commit and CI), leaving a dirty tree. Make version stamping write to a generated file (e.g. `dist/manifest.json`) or derive `version_name` at pack time so `git status` stays clean after build.

**Closes**: `F-CI-002`

**Acceptance Criteria**:

- [ ] After a full `npm run build`, `git status --porcelain` shows no change to `manifest.json` (or any tracked file)
- [ ] The built `dist/manifest.json` still carries the correct `version_name` (base-version-commit-sha)
- [ ] `npm test -- --ci` green at ≥ recorded rate; pre-commit hook no longer dirties the tree

**Dependencies**: 0.1

**Effort**: S

**Verify**: `npm run build && git status --porcelain`

#### Task 0.4: Add landing-page quality gates to CI

**Description**: Extend `.github/workflows/ci.yml` with a job (or matrix leg) that runs `npm ci && npm run lint && npm run format:check && npm run build` in `landing-page/`, so the second package can never silently break. (Node matrix upgrade itself is 2.1.)

**Closes**: `F-CI-001`

**Acceptance Criteria**:

- [ ] CI contains a step that installs and builds `landing-page/` and runs its lint/format checks
- [ ] The new job is required before merge (branch-protection or status check at GitHub)
- [ ] `npm test -- --ci` green at ≥ recorded rate; lint clean

**Dependencies**: 0.1

**Effort**: S

**Verify**: push to a branch → CI run shows the landing job and root suite both green

## Phase P1 — Secure & Patch

**Goal:** close every High/Critical advisory via waves W1–W2 and ship the correctness hardening that makes later upgrades trustworthy · **Milestone M1:** `npm audit --json` reports 0 High/Critical in **both** `package-lock.json` and `landing-page/package-lock.json`; W1/W2 landed.

### Sprint 1 — Secure & Patch

#### Task 1.1: W1 — root vuln-high security patches

**Description**: Smallest bump that clears each advisory, batched within current majors (no majors here): @babel/plugin-transform-modules-systemjs (F-DEP-002), brace-expansion (004), flatted (005), js-yaml 3.x/4.x (006/007), minimatch (008), picomatch 2.x/4.x (009/010), ws (012). Prefer `npm audit fix` then verify lockfile; may require `overrides` where a parent is unmaintained (record any override in the task notes). sharp is **not** in this batch (major, lands in 2.9).

**Closes**: `F-DEP-002`, `F-DEP-004`, `F-DEP-005`, `F-DEP-006`, `F-DEP-007`, `F-DEP-008`, `F-DEP-009`, `F-DEP-010`, `F-DEP-012`

**Acceptance Criteria**:

- [ ] `npm audit --json` in the root reports 0 High/Critical (after this task, modulo sharp which is scheduled)
- [ ] `npm test -- --ci` green at ≥ recorded rate; `npm run lint` clean
- [ ] The diff touches only the lockfile/package.json (and any documented overrides)

**Dependencies**: 0.1

**Effort**: M (2 days)

**Verify**: `npm audit --json | jq '.metadata.vulnerabilities'`

#### Task 1.2: W1/W2 — root remaining advisory + patch/minor batch

**Description**: @babel/core (F-DEP-001), ajv (003), yaml (013) — security-mod/low plus patch/minor hygiene, one batched security wave.

**Closes**: `F-DEP-001`, `F-DEP-003`, `F-DEP-013`

**Acceptance Criteria**:

- [ ] Root `npm audit --json` shows 0 High/Critical remaining; the three listed packages resolve outside their advisory ranges
- [ ] `npm test -- --ci` green at ≥ recorded rate; lint clean

**Dependencies**: 1.1

**Effort**: S

**Verify**: `npm audit --json | jq '.metadata.vulnerabilities'`

#### Task 1.3: W1 — landing vuln-high security patches

**Description**: react-router-dom patch within v6 (to ≥ 6.30.6; clears @remix-run/router GHSA) (F-DEP-105, 108), brace-expansion (110), flatted (112), js-yaml (113), minimatch (114), nanoid (115), picomatch 2.x/4.x (116/117), postcss (118), rollup (119), svgo (120). Vite/esbuild (F-DEP-111, breaking remediation) is **not** in this batch (2.8). The react-router v7 major is **not** here (2.11).

**Closes**: `F-DEP-105`, `F-DEP-108`, `F-DEP-110`, `F-DEP-112`, `F-DEP-113`, `F-DEP-114`, `F-DEP-115`, `F-DEP-116`, `F-DEP-117`, `F-DEP-118`, `F-DEP-119`, `F-DEP-120`

**Acceptance Criteria**:

- [ ] `cd landing-page && npm audit --json` reports 0 High/Critical
- [ ] `cd landing-page && npm run build` (vite) succeeds; the built page renders (smoke-check via `vite preview` or the CI landing job from 0.4)
- [ ] Root `npm test -- --ci` green at ≥ recorded rate

**Dependencies**: 0.4

**Effort**: M (2 days)

**Verify**: `cd landing-page && npm audit --json | jq '.metadata.vulnerabilities'`

#### Task 1.4: W2 — landing patch/minor batch

**Description**: yet-another-react-lightbox (F-DEP-106, wanted 3.32.2), @babel/core transitive (107), ajv (109).

**Closes**: `F-DEP-106`, `F-DEP-107`, `F-DEP-109`

**Acceptance Criteria**:

- [ ] Landing audit reports 0 High/Critical and these packages resolve outside advisory ranges
- [ ] Landing build green; root suite green at ≥ recorded rate

**Dependencies**: 1.3

**Effort**: S

**Verify**: `cd landing-page && npm audit --json | jq '.metadata.vulnerabilities'`

#### Task 1.5: Regression + edge tests for the patched surface

**Description**: Add/adjust tests so every W1 advisory path and the legacy-limit path are exercised (resolves the F-TEST-002 gap for error/edge cases; the broader F-TEST-001 coverage program is 3.7). No `.skip`/`.only`.

**Closes**: `F-TEST-002`

**Acceptance Criteria**:

- [ ] Tests cover: storage quota/lastError rejection path, legacy numeric limit normalization (limits.js + notifications.js + focus-score.js), and at least the `parseUrl` boundary cases (non-http, localhost, malformed)
- [ ] No `.skip`/`.only`/`.todo` introduced; suite green at ≥ recorded rate

**Dependencies**: 1.1, 1.2

**Effort**: M

**Verify**: `npm test -- --ci` and `grep -rn '\.skip\|\.only' tests/`

## Phase P2 — Modernize

**Goal:** runtime/toolchain (W3) and every major (W4+) — one major per task · **Milestone M2:** every major current or deferred with written rationale; CI lanes on supported Node; actions on current majors.

### Sprint 2 — Runtime & toolchain

#### Task 2.1: Node policy + CI lanes (runtime upgrade, W3)

**Description**: Close the EOL gap: add `engines.node` (e.g. `>=22`) to both package.json files and a `.nvmrc`; change the CI matrix from `[18.x, 20.x]` to `[22.x, 24.x]` (or current LTS pair); record the decision in Pre.1 notes. Migration source: Node release schedule (https://nodejs.org/en/about/previous-releases) — spike only if a toolchain incompatibility appears.

**Closes**: `F-DEP-072`, `F-DEP-142`

**Acceptance Criteria**:

- [ ] `package.json` (both) declare `engines.node >=22` (or the chosen pair) and `.nvmrc` matches
- [ ] `ci.yml` matrix runs only supported Node lanes and the run is green
- [ ] Root suite green at ≥ recorded rate on the new lanes; lint clean

**Dependencies**: 1.1

**Effort**: S

**Verify**: `node -e "require('./package.json').engines"` and a CI matrix run

#### Task 2.2: actions/checkout v4 → v7

**Description**: Bump `uses: actions/checkout@v4` → `@v7`. Migration source: https://github.com/actions/checkout/releases. Also consider pinning the resolved SHA per security guidance (record choice).

**Closes**: `F-DEP-201`

**Acceptance Criteria**:

- [ ] All `actions/checkout` refs in `.github/workflows/*` are `v7` (or pinned SHA) and CI passes
- [ ] Root suite green at ≥ recorded rate

**Dependencies**: 2.1

**Effort**: S

**Verify**: `grep -rn 'checkout@' .github/ && gh run list --limit 1`

#### Task 2.3: actions/setup-node v4 → v7

**Description**: Bump setup-node; verify `cache: 'npm'` still works. Source: https://github.com/actions/setup-node/releases.

**Closes**: `F-DEP-202`

**Acceptance Criteria**:

- [ ] `setup-node@v7` (or pinned SHA) in all workflows; caching functional
- [ ] CI green at ≥ recorded rate

**Dependencies**: 2.1

**Effort**: S

**Verify**: `grep -rn 'setup-node@' .github/ && gh run list --limit 1`

#### Task 2.4: actions/upload-artifact v4 → v7

**Description**: Bump upload-artifact (retention 7 days maintained). Source: https://github.com/actions/upload-artifact/releases.

**Closes**: `F-DEP-203`

**Acceptance Criteria**:

- [ ] `upload-artifact@v7` (or pinned SHA); artifact still produced for node 24 leg
- [ ] CI green at ≥ recorded rate

**Dependencies**: 2.1

**Effort**: S

**Verify**: `grep -rn 'upload-artifact@' .github/`

#### Task 2.5: codecov/codecov-action v4 → v7

**Description**: Bump codecov action; verify the `files:` input and upload. Source: https://github.com/codecov/codecov-action/releases (v5 renames `file`→`files`, already used).

**Closes**: `F-DEP-204`

**Acceptance Criteria**:

- [ ] `codecov-action@v7` (or pinned SHA); coverage report still uploads
- [ ] CI green at ≥ recorded rate

**Dependencies**: 2.1

**Effort**: S

**Verify**: `grep -rn 'codecov' .github/`

#### Task 2.6: ESLint 8 → 9 migration (root toolchain)

**Description**: One isolated toolchain task: migrate the root lint stack to ESLint 9 + flat config, removing deprecated transitives in one lockfile regeneration. **Migration source not retrieved — spike required**: first AC is producing the migration guide (ESLint 9 transition guide, https://eslint.org/docs/latest/use/migrate-to-9.0.0) and documenting config conversion (`.eslintrc.json` → `eslint.config.js`). Also resolves @humanwhocodes/\*, glob, inflight, rimraf deprecations.

**Closes**: `F-DEP-016`, `F-DEP-014`, `F-DEP-015`, `F-DEP-017`, `F-DEP-018`, `F-DEP-019`

**Acceptance Criteria**:

- [ ] Migration guide retrieved and summarized in the PR description (spike satisfied)
- [ ] `npm run lint` and `npm run lint:fix` operate on ESLint 9 flat config; zero warnings
- [ ] Root `npm audit --json` still 0 High/Critical; suite green at ≥ recorded rate; pre-commit still gates lint

**Dependencies**: 2.1

**Effort**: M

**Verify**: `npx eslint --version && npm run lint`

#### Task 2.7: ESLint 8 → 9 migration (landing toolchain + deprecated transitives)

**Description**: Same ESLint migration for `landing-page/` — resolves F-DEP-121 and its deprecated transitive children (122–126: @humanwhocodes/\*, glob, inflight, rimraf) in one coordinated lockfile regeneration. Spike: flat-config conversion for the react plugins.

**Closes**: `F-DEP-121`, `F-DEP-122`, `F-DEP-123`, `F-DEP-124`, `F-DEP-125`, `F-DEP-126`

**Acceptance Criteria**:

- [ ] Landing `npm run lint` passes with `--max-warnings 0` on ESLint 9 flat config
- [ ] Deprecated transitives absent from `landing-page/package-lock.json`
- [ ] Landing build green; root suite green at ≥ recorded rate

**Dependencies**: 2.6

**Effort**: M

**Verify**: `cd landing-page && npx eslint --version && npm run lint`

### Sprint 3 — Library majors

#### Task 2.8: Vite/esbuild toolchain migration spike (landing)

**Description**: F-DEP-111's remediation requires a breaking Vite major (audit force-candidate vite@8.x → esbuild > 0.24.2). Isolated toolchain task, **not** mixed with security patches. **Migration source not retrieved — spike required**: first AC is producing the Vite major migration guide (https://vite.dev/guide/migration) and recording the decision (upgrade vs. pin-with-rationale).

**Closes**: `F-DEP-111`

**Acceptance Criteria**:

- [ ] Migration guide retrieved/summarized; decision recorded (upgrade or defer with written rationale)
- [ ] If upgraded: `cd landing-page && npm audit --json` reports the esbuild advisory cleared and `npm run build` green
- [ ] Root suite green at ≥ recorded rate

**Dependencies**: 2.7

**Effort**: M

**Verify**: `cd landing-page && npm audit --json | jq '.metadata.vulnerabilities'`

#### Task 2.9: sharp 0.34 → 0.35 (major, dev-only)

**Description**: F-DEP-011 (devDependency for `icons:generate`). Small blast (1 import site: `scripts/generate-icons.js`). **Migration source not retrieved — spike required**: first AC is retrieving sharp's breaking-change notes for 0.35 (https://sharp.pixelplumbing.com/changelog) — verify icon generation output.

**Closes**: `F-DEP-011`

**Acceptance Criteria**:

- [ ] Breaking-change notes retrieved (spike satisfied)
- [ ] `npm run icons:generate` produces identical icon outputs; `npm audit --json` clears the GHSA
- [ ] Suite green at ≥ recorded rate; lint clean

**Dependencies**: 1.1

**Effort**: S

**Verify**: `npm run icons:generate && npm audit --json | jq '.metadata.vulnerabilities'`

#### Task 2.10: React 18 → 19 (react + react-dom, peer pair)

**Description**: One coordinated task for the coupled pair (F-DEP-103/104). Migration source: React 19 upgrade guide (https://react.dev/blog/2024/04/25/react-19). Verify StrictMode behavior, lazy routes, and lightbox rendering.

**Closes**: `F-DEP-103`, `F-DEP-104`

**Acceptance Criteria**:

- [ ] Upgrade guide applied as documented; `react` and `react-dom` move together to 19.x
- [ ] `cd landing-page && npm run build` green; route-level smoke (Landing + Privacy) renders
- [ ] Root suite green at ≥ recorded rate

**Dependencies**: 2.8

**Effort**: M

**Verify**: `cd landing-page && npm ls react react-dom && npm run build`

#### Task 2.11: react-router-dom 6 → 7 (major spike)

**Description**: F-DEP-105's v7 currency upgrade — deliberately separate from the W1 in-v6 patch. **Migration source not retrieved — spike required**: first AC is producing the v7 upgrade guide (https://reactrouter.com/upgrading/v6) and confirming route APIs used here (BrowserRouter/Routes/Route/Lazy).

**Closes**: `F-DEP-105` (v7 portion)

**Acceptance Criteria**:

- [ ] v7 upgrade guide retrieved/summarized (spike satisfied)
- [ ] If upgraded: landing build green and both routes render; if deferred: rationale recorded in M2 notes
- [ ] Root suite green at ≥ recorded rate

**Dependencies**: 2.10

**Effort**: M

**Verify**: `cd landing-page && npm ls react-router-dom && npm run build`

#### Task 2.12: lucide-react 0.x → 1.x (major)

**Description**: F-DEP-102, 6 import sites. Migration source: lucide-react release notes; verify every imported icon name resolves in v1 and swap renames (`npm run build` + grep for missing exports).

**Closes**: `F-DEP-102`

**Acceptance Criteria**:

- [ ] All icon imports compile under lucide-react v1 (build green)
- [ ] Landing page renders icons in Header/Footer/Hero/Features/Privacy
- [ ] Root suite green at ≥ recorded rate

**Dependencies**: 2.10

**Effort**: S

**Verify**: `cd landing-page && npm run build`

#### Task 2.13: Remove unused focus-trap-react

**Description**: F-DEP-101 — zero imports in source. Confirm with `grep -rn 'focus-trap-react' landing-page/src/`, then remove the dependency (and any modal code that intended to use it).

**Closes**: `F-DEP-101`

**Acceptance Criteria**:

- [ ] `focus-trap-react` absent from `landing-page/package.json`, lockfile, and all imports
- [ ] Landing build green; root suite green at ≥ recorded rate

**Dependencies**: 2.7

**Effort**: S

**Verify**: `cd landing-page && grep -rn 'focus-trap-react' src/ || npm ls focus-trap-react`

#### Task 2.14: Pin CI runner label

**Description**: Replace `ubuntu-latest` with a pinned supported label (`ubuntu-24.04`) for reproducibility (F-DEP-207) and record the choice.

**Closes**: `F-DEP-207`

**Acceptance Criteria**:

- [ ] All `runs-on:` use a pinned label; CI green
- [ ] Root suite green at ≥ recorded rate

**Dependencies**: 2.1

**Effort**: S

**Verify**: `grep -rn 'runs-on' .github/`

## Phase P3 — Clean & Harden

**Goal:** correctness hardening, dead-code removal, duplication convergence, coverage to target · **Milestone M3:** coverage tool configured and reporting; coverage ≥ baseline + 20pp floored at 60%; no logic block repeated ≥ 3 times survives the DEAD findings; no `window.*` global-call pattern remains; `npm audit` remains 0 High/Critical.

### Sprint 4 — Clean & Harden

#### Task 3.1: Serialized, bounded storage writer

**Description**: Introduce one atomic per-domain mutation path (`incrementVisit` via a serialized queue/lock), check `chrome.runtime.lastError` on every set, and cap timestamp retention (e.g. keep ≤ N days of timestamps, compact older history) so writes stop growing unbounded. Closes the data-loss race and quota-silent-failure together.

**Closes**: `F-BUG-001`, `F-BUG-008`, `F-PERF-001`

**Acceptance Criteria**:

- [ ] A test fires two overlapping `incrementVisit` calls and asserts both visits are counted (no lost update)
- [ ] A storage-quota simulation rejects with a surfaced error instead of silently resolving
- [ ] `visits` history size is bounded: timestamps older than the retention window are dropped during compaction; storage write volume per switch no longer scales with total history
- [ ] Suite green at ≥ recorded rate; lint clean

**Dependencies**: 1.5, 2.1

**Effort**: L (split verification per above)

**Verify**: `npm test -- --ci` plus the two new targeted tests

#### Task 3.2: Single-pass focus score and memoized streak

**Description**: `getFocusScoreHistory`/`getTodayFocusScore` should read storage once and reuse a daily streak result instead of re-running `calculateOverallStreak` (which writes) per day; make `calculateOverallStreak` compute-in-place without a write when nothing changed. Closes the 30× read + 30× write per dashboard load.

**Closes**: `F-PERF-002`, `F-PERF-004`, `F-PERF-005`

**Acceptance Criteria**:

- [ ] Dashboard load performs exactly one full `visits` read and zero unnecessary `overallStreak` writes (asserted by test spy on `chrome.storage.local.set`)
- [ ] Focus-score history matches the previous implementation's values on the same data fixture
- [ ] Suite green at ≥ recorded rate; lint clean

**Dependencies**: 3.1

**Effort**: M

**Verify**: `npm test -- --ci` (spy assertions) and a dashboard perf trace in DevTools

#### Task 3.3: Unify date/time-range utilities and limit-form controller

**Description**: Extract one time-range aggregator and one local-timezone-aware date-key function (fixes UTC/local mismatch); implement one shared limit-form validation controller, eliminating the three divergent forms. Closes the off-by-one day keys, the blocked-page "until midnight" mismatch, the dashboard sort-vs-display mismatch, and the magic-value duplication together.

**Closes**: `F-BUG-004`, `F-BUG-005`, `F-BUG-009`, `F-CLEAN-002`, `F-CLEAN-003`

**Acceptance Criteria**:

- [ ] One date-key utility is used by storage/goals/notifications/achievements/focus-score/blocked — zero inline `toISOString().split('T')[0]` duplicates remain (grep-clean)
- [ ] All three limit forms share one validated controller; entering `0` or negatives is rejected identically everywhere
- [ ] Dashboard table sorts on the value it displays; blocked-page countdown shows the exact reset time used by limit enforcement
- [ ] Suite green at ≥ recorded rate; lint clean

**Dependencies**: 3.1

**Effort**: M

**Verify**: `grep -rn "toISOString().split('T')\[0\]" src/` (must be empty besides the utility) and `npm test -- --ci`

#### Task 3.4: Remove the dead goals/achievements/insights/export-PNG subsystem

**Description**: Delete `src/background/goals.js` and the unreachable dashboard handlers (achievements, goals, insights, export-graph) in visualization-page.js, plus the `window.getAllAchievements/checkGoalProgress/suggestGoals/addGoalToday/removeGoalFromToday` calls that reference nothing. **Decision gate**: if product wants Goals/achievements surfaced, this task becomes "wire the buttons" instead — the report recommends deletion (team decision recorded in PR).

**Closes**: `F-DEAD-001`

**Acceptance Criteria**:

- [ ] `goals.js` and the dead handler blocks are gone; `window.*` call pattern absent from `src/` (grep-clean)
- [ ] Background achievements logic (`checkAchievements`/`initializeAchievements` used by tracking) is preserved and still tested
- [ ] Suite green at ≥ recorded rate; lint clean

**Dependencies**: 3.1

**Effort**: M

**Verify**: `grep -rn 'getAllAchievements\b\|goals.js\|export-graph' src/` (empty) && `npm test -- --ci`

#### Task 3.5: Remove remaining dead code

**Description**: Delete `src/common/copy.js` (unused, 218 lines) or start using it (decision recorded); trim feature-flags.js to flags actually read (keep RADIAL_GRAPH); remove `handleInlineLimitToggle`, the log-only resize handler, `tests/example.test.js`, the blocking.js leftover delete-comment, and unreachable category keywords.

**Closes**: `F-DEAD-002`, `F-DEAD-003`, `F-DEAD-004`, `F-DEAD-005`, `F-DEAD-006`, `F-DEAD-007`

**Acceptance Criteria**:

- [ ] `copy.js`, placeholder test, unused handler/flags, and dead keywords removed (grep-clean for each name)
- [ ] `FEATURES` object contains only flags consulted by source (comment lists each consumer)
- [ ] Suite green at ≥ recorded rate; lint clean

**Dependencies**: 3.1

**Effort**: S

**Verify**: `grep -rn 'feature-flags\|handleInlineLimitToggle' src/` plus `npm test -- --ci`

#### Task 3.6: Replace HTML-string templating with safe DOM APIs

**Description**: Eliminate `innerHTML`/`tooltip.html()` with interpolated domain/subpath at all 8+ sites (countdown-toast.js:61, graph.js tooltip, visualization-page.js error/limits, blocking.js list, dashboard renderSubpathTable), building nodes via `createElement`/`textContent`. Aligns with AGENTS.md CSS/XSS rule.

**Closes**: `F-BUG-007`

**Acceptance Criteria**:

- [ ] No statement of the form `innerHTML\s*=` with an interpolated domain/subpath variable remains in `src/` (grep + review)
- [ ] Domains/subpaths containing HTML metacharacters render as literal text in toast, tooltip, listing, and table
- [ ] Suite green at ≥ recorded rate; lint clean

**Dependencies**: 3.1

**Effort**: M

**Verify**: `grep -rn 'innerHTML' src/` reviewed and `npm test -- --ci`

#### Task 3.7: Coverage program to target (test-coverage)

**Description**: Configure a coverage report that runs (jest coverage is configured in `test:coverage`); then raise coverage for the untested modules to the M3 target (≥ 60% lines; target = measured baseline + 20pp floored at 60%). Priority modules: focus-score, notifications, achievements, storage streaks, categories, blocking/domain/blocked pages, countdown-toast content script, then visualization-page/graph splits. Run `/test-coverage` per module (the delegate writes tests — this is its planned invocation).

**Closes**: `F-TEST-001`

**Acceptance Criteria**:

- [ ] `npm run test:coverage -- --ci` produces a number; that number ≥ the M3 target
- [ ] Every prioritized module listed above has ≥ 1 test file with behavioral (not implementation) assertions
- [ ] Root suite green at ≥ recorded rate; lint clean

**Dependencies**: 3.1, 3.4

**Effort**: L (split per module; each module's task asserts coverage delta)

**Verify**: `npm run test:coverage -- --ci | tail -20`

#### Task 3.8: Duplicate-resolution convergence (W5/W8)

**Description**: Reconcile duplicated transitive resolutions (root F-DEP-020..071, landing F-DEP-127..141) through nearest-parent upgrades + lockfile regeneration; never force transitive overrides. Where parents cannot converge, record the rationale per package in the PR.

**Closes**: `F-DEP-020`, `F-DEP-021`, `F-DEP-022`, `F-DEP-023`, `F-DEP-024`, `F-DEP-025`, `F-DEP-026`, `F-DEP-027`, `F-DEP-028`, `F-DEP-029`, `F-DEP-030`, `F-DEP-031`, `F-DEP-032`, `F-DEP-033`, `F-DEP-034`, `F-DEP-035`, `F-DEP-036`, `F-DEP-037`, `F-DEP-038`, `F-DEP-039`, `F-DEP-040`, `F-DEP-041`, `F-DEP-042`, `F-DEP-043`, `F-DEP-044`, `F-DEP-045`, `F-DEP-046`, `F-DEP-047`, `F-DEP-048`, `F-DEP-049`, `F-DEP-050`, `F-DEP-051`, `F-DEP-052`, `F-DEP-053`, `F-DEP-054`, `F-DEP-055`, `F-DEP-056`, `F-DEP-057`, `F-DEP-058`, `F-DEP-059`, `F-DEP-060`, `F-DEP-061`, `F-DEP-062`, `F-DEP-063`, `F-DEP-064`, `F-DEP-065`, `F-DEP-066`, `F-DEP-067`, `F-DEP-068`, `F-DEP-069`, `F-DEP-070`, `F-DEP-071`, `F-DEP-127`, `F-DEP-128`, `F-DEP-129`, `F-DEP-130`, `F-DEP-131`, `F-DEP-132`, `F-DEP-133`, `F-DEP-134`, `F-DEP-135`, `F-DEP-136`, `F-DEP-137`, `F-DEP-138`, `F-DEP-139`, `F-DEP-140`, `F-DEP-141`

**Acceptance Criteria**:

- [ ] Duplicate resolver counts drop to the minimum the parents allow; any survivor has a written per-package rationale
- [ ] Both `npm audit` runs still report 0 High/Critical; both builds green
- [ ] Suite green at ≥ recorded rate; lint clean

**Dependencies**: 2.6, 2.7, 2.8, 2.10

**Effort**: M

**Verify**: a duplicate-scan script (e.g. `npm ls`) shows no forced-override duplication

#### Task 3.9: Clean-code pass atop the hardened code

**Description**: Split the visualization-page god function (F-CLEAN-001) by responsibility; extract named constants for magic values (F-CLEAN-005); fix the misleading CDN comment (F-CLEAN-006) and duplicate JSDoc (F-CLEAN-007); simplify the double-negative preference check (F-CLEAN-004). Run `/code-review` mode `clean` as the scheduled delegate for this task and apply its audit.

**Closes**: `F-CLEAN-001`, `F-CLEAN-004`, `F-CLEAN-005`, `F-CLEAN-006`, `F-CLEAN-007`

**Acceptance Criteria**:

- [ ] `setupVisualizationPage` splits into ≤ 3 named responsibilities, each under ~200 lines
- [ ] Magic values moved to named constants; comments fixed; the preference check simplified
- [ ] Suite green at ≥ recorded rate; lint clean

**Dependencies**: 3.2, 3.7

**Effort**: M

**Verify**: `/code-review` mode `clean` on `src/common/visualization-page.js` and `npm test -- --ci`

## Phase P4 — Polish

**Goal:** UX, privacy, doc/policy alignment · **Milestone M4:** UX findings closed; perf budget met (≤ ~200ms dashboard first render incl. storage reads); docs match code; privacy claims match behavior.

### Sprint 5 — Polish

#### Task 4.1: UX fixes

**Description**: Wire or remove the popup High-Contrast toggle (F-UX-001); label per-range counts in the dashboard table (F-UX-002); align the blocked-page countdown with the true reset time (F-UX-003); give the emoji toolbar buttons text/visible labels (F-UX-004); make the insights popup non-modal or dismissible-banner (F-UX-005). Apply Krug: primary action per screen stays obvious; empty/loading/error states retained.

**Closes**: `F-UX-001`, `F-UX-002`, `F-UX-003`, `F-UX-004`, `F-UX-005`

**Acceptance Criteria**:

- [ ] Every visible control has a wired behavior: High-Contrast toggle persists to storage and applies a class (or is removed with its card)
- [ ] Dashboard "Visits" column shows the same period as the header totals; countdown shows the actual reset time
- [ ] Buttons have accessible text labels beyond emoji; insights no longer auto-open modally
- [ ] Suite green at ≥ recorded rate; lint clean

**Dependencies**: 3.6

**Effort**: M

**Verify**: manual pass in Chrome (load unpacked) + `npm test -- --ci`

#### Task 4.2: Hot-path perf cleanup

**Description**: Drop the redundant per-visit `updateBlockingRules()` explicit call (tracking.js:85 — the `onChanged` listener covers it) and the dynamic `import('./limits.js')` (tracking.js:69).

**Closes**: `F-PERF-003`, `F-PERF-006`

**Acceptance Criteria**:

- [ ] Per focus switch, `updateBlockingRules` runs at most once (double-invocation test/spy)
- [ ] `tracking.js` imports `checkLimit` statically
- [ ] Dashboard load ≤ ~200ms measured in DevTools on a 30-day fixture; suite green at ≥ recorded rate

**Dependencies**: 3.2

**Effort**: S

**Verify**: DevTools performance trace + `npm test -- --ci`

#### Task 4.3: Privacy — remove external favicon fetches and sync docs

**Description**: Remove the Google S2 favicon `<img>` fetches (dashboard.js:469, blocking.js:45) — replace with a local/self-contained icon or drop the favicon column — so no third-party request occurs; then update PRIVACY.md/README claims to match behavior. This is the joint closure of the privacy/doc contradiction.

**Closes**: `F-SEC-001`, `F-DOCS-001`

**Acceptance Criteria**:

- [ ] Network log shows zero non-extension-network requests from popup/dashboard/blocking pages (DevTools) — or docs explicitly disclose the favicon service with a toggle
- [ ] PRIVACY.md "No data is transmitted" and "no third-party services" claims hold against a fresh capture
- [ ] Suite green at ≥ recorded rate; lint clean

**Dependencies**: 4.1

**Effort**: M

**Verify**: DevTools network capture on dashboard + popup; `grep -rn 'google.com/s2' src/` (empty)

#### Task 4.4: CSV export hardening

**Description**: Escape/quote CSV cells for formula-injection prefixes (`= + - @`) in the export handler; keep the JSON export as the safe long-form path.

**Closes**: `F-SEC-002`

**Acceptance Criteria**:

- [ ] A subpath beginning with `=` round-trips through the CSV and opens as text in a spreadsheet (test asserts the escaped quoting)
- [ ] Existing export UX unchanged; suite green at ≥ recorded rate

**Dependencies**: 4.1

**Effort**: S

**Verify**: unit test for the CSV escaper + `npm test -- --ci`

#### Task 4.5: Least-privilege permissions review

**Description**: Re-examine `manifest.json` permissions/host_permissions; document per-permission rationale (PRIVACY.md "What data" table), verify `declarativeNetRequestWithHostAccess` + `<all_urls>` are required for redirect blocking, and consider DNR session-scoped rules or removing the content-script host grants if the toast only needs injection on limited sites.

**Closes**: `F-SEC-003`

**Acceptance Criteria**:

- [ ] PRIVACY.md documents each permission with a one-line justification; any removable permission is removed and verified
- [ ] Extension still blocks and toasts after the change (manual chrome pass)
- [ ] Suite green at ≥ recorded rate; lint clean

**Dependencies**: 4.3

**Effort**: M

**Verify**: `grep -n 'permissions\|host_permissions' manifest.json` + manual load-unpacked pass

#### Task 4.6: Runtime policy documentation

**Description**: Sync DOCS: README Node prerequisite → current policy (engines ≥ 22 from 2.1), landing setup section, `.nvmrc` note; reconcile any version badges.

**Closes**: `F-DOCS-002`

**Acceptance Criteria**:

- [ ] README's Node prerequisite matches `engines.node`; a landing-page build section exists
- [ ] No stale version numbers/badges remain (grep for `18`/`1.0.0` drift check)
- [ ] Suite green at ≥ recorded rate

**Dependencies**: 2.1, 4.3

**Effort**: S

**Verify**: `grep -n 'Node' README.md` and manual README walkthrough

#### Task 4.7: Coverage/CI gates

**Description**: Raise `fail_ci_if_error: true` for codecov and add a minimum threshold gate matching M3's target, so coverage cannot silently regress.

**Closes**: `F-CI-003`

**Acceptance Criteria**:

- [ ] CI fails when coverage < target; upload errors fail CI loudly
- [ ] Suite green at ≥ recorded rate

**Dependencies**: 3.7

**Effort**: S

**Verify**: CI run on a deliberately-lowered-coverage commit (expected red) then real green

#### Task 4.8: Category matching fix + misc polish

**Description**: Replace substring `includes` category matching with token/ends-with matching (categorizeDomain) and add tests; sweep any low-hanging items from the report's cross-cutting patterns.

**Closes**: `F-BUG-010`

**Acceptance Criteria**:

- [ ] `categorizeDomain('target.example.net')` no longer categorizes as shopping; `news.anything` nuanced (ends-with/word boundary)
- [ ] Category tests cover at least one false-positive case per keyword list
- [ ] Suite green at ≥ recorded rate; lint clean

**Dependencies**: 3.7

**Effort**: S

**Verify**: `npm test -- --ci`

## Dependency table

| Task  | Depends on          | Blocks                                  | Wave / note    |
| ----- | ------------------- | --------------------------------------- | -------------- |
| Pre.1 | —                   | Pre.2, Pre.3                            | W0             |
| Pre.2 | Pre.1               | 0.1                                     | W0             |
| Pre.3 | Pre.1               | 0.1                                     | W0             |
| 0.1   | Pre.2, Pre.3        | 0.2, 0.3, 0.4, 1.1                      | W0 (baseline)  |
| 0.2   | 0.1                 | —                                       | correctness    |
| 0.3   | 0.1                 | —                                       | determinism    |
| 0.4   | 0.1                 | 1.3, 1.4                                | CI gate        |
| 1.1   | 0.1                 | 1.2, 1.5, 2.9                           | W1             |
| 1.2   | 1.1                 | 1.5                                     | W1/W2          |
| 1.3   | 0.4                 | 1.4                                     | W1             |
| 1.4   | 1.3                 | —                                       | W2             |
| 1.5   | 1.1, 1.2            | 3.1                                     | tests          |
| 2.1   | 1.1                 | 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.14, 4.6 | W3             |
| 2.2   | 2.1                 | —                                       | actions        |
| 2.3   | 2.1                 | —                                       | actions        |
| 2.4   | 2.1                 | —                                       | actions        |
| 2.5   | 2.1                 | —                                       | actions        |
| 2.6   | 2.1                 | 2.7, 3.8                                | ESLint root    |
| 2.7   | 2.6                 | 2.8, 2.13, 3.8                          | ESLint landing |
| 2.8   | 2.7                 | 2.10                                    | Vite           |
| 2.9   | 1.1                 | —                                       | sharp major    |
| 2.10  | 2.8                 | 2.11, 2.12, 3.8                         | react major    |
| 2.11  | 2.10                | —                                       | router major   |
| 2.12  | 2.10                | —                                       | lucide major   |
| 2.13  | 2.7                 | —                                       | removal        |
| 2.14  | 2.1                 | —                                       | runner pin     |
| 3.1   | 1.5, 2.1            | 3.2, 3.3, 3.4, 3.5, 3.6, 3.7            | storage        |
| 3.2   | 3.1                 | 3.9, 4.2                                | perf           |
| 3.3   | 3.1                 | 4.1                                     | utils          |
| 3.4   | 3.1                 | 3.7                                     | dead code      |
| 3.5   | 3.1                 | —                                       | dead code      |
| 3.6   | 3.1                 | 4.1                                     | XSS            |
| 3.7   | 3.1, 3.4            | 3.9, 4.7, 4.8                           | coverage       |
| 3.8   | 2.6, 2.7, 2.8, 2.10 | —                                       | dedupe         |
| 3.9   | 3.2, 3.7            | —                                       | clean          |
| 4.1   | 3.6                 | 4.3, 4.4                                | UX             |
| 4.2   | 3.2                 | —                                       | perf           |
| 4.3   | 4.1                 | 4.5, 4.6                                | privacy        |
| 4.4   | 4.1                 | —                                       | export         |
| 4.5   | 4.3                 | —                                       | permissions    |
| 4.6   | 2.1, 4.3            | —                                       | docs           |
| 4.7   | 3.7                 | —                                       | CI gate        |
| 4.8   | 3.7                 | —                                       | categories     |

DAG verified by inspection: every `Depends on` references an existing task ID; no cycles (all edges point to earlier phases). M0 gating is enforced by the execution-wave ordering below: P1+ tasks depend only on 0.1 within P0, and the wave table sequences them after 0.2–0.4 land. **Critical path (recomputed from the table):** Pre.1 → Pre.2 → 0.1 → 1.1 → 1.2 → 1.5 → 3.1 → 3.6 → 4.1 → 4.3 → 4.5. Durations: 1+1+2+2+1+2+3+2+2+2+2 = **20 days ≈ 2 sprints**. (Alternatives: …→1.1 → 2.1 → 2.6 → 2.7 → 2.8 → 2.10 → 3.8 = 18d; …→3.1 → 3.4 → 3.7 → 4.7 = 17d; Pre.1 → 0.1 → 0.4 → 1.3 → 1.4 = 7d.)

## Execution waves

| Wave | Tasks (parallel-safe)         |
| ---- | ----------------------------- |
| 1    | Pre.1                         |
| 2    | Pre.2, Pre.3                  |
| 3    | 0.1                           |
| 4    | 0.2, 0.3, 0.4                 |
| 5    | 1.1, 1.3                      |
| 6    | 1.2, 1.4                      |
| 7    | 1.5, 2.9                      |
| 8    | 2.1                           |
| 9    | 2.2, 2.3, 2.4, 2.5, 2.6, 2.14 |
| 10   | 2.7                           |
| 11   | 2.8, 2.13                     |
| 12   | 2.10                          |
| 13   | 2.11, 2.12                    |
| 14   | 3.1, 3.8                      |
| 15   | 3.2, 3.4, 3.5, 3.6            |
| 16   | 3.3, 3.7                      |
| 17   | 3.9, 4.2, 4.8                 |
| 18   | 4.1, 4.7                      |
| 19   | 4.3, 4.4                      |
| 20   | 4.5, 4.6                      |

## Milestones

| ID  | Phase | Exit condition (measurable)                                                                                                                         | Verify with                                                           |
| --- | ----- | --------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| ME  | Pre   | `CLAUDE.md` and `AGENTS.md` improved (update); install/run notes exist; commands documented                                                         | `test -f CLAUDE.md && test -f AGENTS.md && test -f docs/dev-setup.md` |
| M0  | P0    | Clean checkout → `npm ci && npm run build && npm test -- --ci` green in CI; git clean after build                                                   | CI run link; `npm run build && git status --porcelain`                |
| M1  | P1    | `npm audit --json` → 0 High/Critical in both lockfiles; W1/W2 landed                                                                                | `npm audit --json \| jq '.metadata.vulnerabilities'` (both dirs)      |
| M2  | P2    | CI lanes on supported Node; actions on current majors; every major current or deferred with written rationale                                       | `grep -rn 'node-version\|@v[4]' .github/`; M2 notes file              |
| M3  | P3    | Coverage tool reports a number ≥ target (baseline+20pp floor 60%); no ≥3× dup logic blocks; no `window.*` global calls; audit still 0 High/Critical | `npm run test:coverage -- --ci \| tail -20`                           |
| M4  | P4    | UX findings closed; dashboard load ≤ ~200ms; no external network requests from extension pages except disclosed; docs match code                    | DevTools trace + network capture + manual Chrome pass                 |

## Deferred and out of scope

No finding is deferred. Two items are tracked as explicit decisions rather than work: whether Goals/achievements should be _wired_ instead of deleted (task 3.4's decision gate), and the M3 coverage target is bound by measurement in 3.7's first criterion (baseline unknown at audit time because jest was absent locally, per the binding rule "measurement before improvement").

## Risks

| Risk                                                                                      | Affects        | Mitigation                                                                                      |
| ----------------------------------------------------------------------------------------- | -------------- | ----------------------------------------------------------------------------------------------- |
| W1 security patches with no local suite yet (RED until 0.1) could silently break behavior | Tasks 1.1–1.4  | 0.1 restores the suite first; all W1 tasks assert the recorded pass rate; CI is the second gate |
| Vite major (8.x) may require changing the build config or plugin APIs                     | 2.8, then 2.10 | 2.8 is a spike with decision recorded; landing CI job from 0.4 contains the blast               |
| React 19 peer constraints could pull react-router/lightbox upgrades forward               | 2.10, 2.11     | Ordering: router v7 spike after react; each major isolated and verified                         |
| `npm audit fix` may introduce transitive overrides that are hard to remove                | 1.1, 1.3, 3.8  | Overrides documented per PR; 3.8 converges through parents only                                 |
| Storage writer rewrite (3.1) touches the tracking hot path with few existing tests        | 3.1, 3.2       | 1.5 adds the concurrency/legacy tests first; 3.1's ACs are test-driven                          |
| Removing favicons changes dashboard look without design input                             | 4.3            | Replace with a neutral local icon first, then delete; preview in PR                             |

## Notes for the executor

- Every task that lands code must keep `MODERNIZATION_REPORT.md`-style evidence: the `Verify:` command is the definition of done, run it in the PR.
- `/agent-config update`, `/code-review` mode `clean`/`cleanup`, `/test-coverage`, `/devops-pipeline`, `/doc-manager`, `/security-setup` are the write-capable delegates scheduled by tasks 3.7, 3.9, 2.6/2.7, 4.7, 4.6, 4.5 respectively — the audit never ran them.
- F-DEP-105 is closed in two phases by design: task 1.3 lands the in-v6 W1 security patch and task 2.11 the v7 major currency upgrade — one report ID covers both.
- Keep `CHANGELOG.md` (or a `docs/releases.md`) updated as each phase ships, for the next Chrome Web Store submission.
