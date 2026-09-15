# Modernization Report — FocusPaw

**Audited:** 2026-08-30 · **Commit:** `7d5299f` · **Branch:** `main`
**Stack:** Chrome MV3 extension (vanilla JS ES modules, D3 v7) + React/Vite landing page · Node tooling (Jest, ESLint, Prettier, Husky)
**Size:** 66 source files, ~16.9 kLOC (35 tracked; vendored `src/vendor/d3.min.js` 16.9k lines excluded)
**Baseline:** RED — the project builds in an isolated probe, but the local test suite cannot start (Jest not installed) and lint/format tooling is likewise not installed locally; CI is green.

## Summary

| Severity | Count |
| -------- | ----- |
| Critical | 5     |
| High     | 39    |
| Medium   | 37    |
| Low      | 84    |

FocusPaw is a well-structured, genuinely privacy-first Chrome MV3 extension with real tests, real CI, and a disciplined build — but it has drifted. The local toolchain is not installed (the tree builds and CI runs green, yet a fresh checkout cannot verify anything without `npm ci`), the dependency surface is two ecosystem generations behind with 29 High-severity advisories and two EOL Node lanes in CI, and the runtime storage layer has concurrency and growth defects that silently lose or inflate the core metric (focus switches). A whole Goals/achievements UI subsystem is dead code that would crash if ever reached.

The plan restores a reproducible green baseline (P0), ships security patches and toolchain alignment (P1), modernizes Node/actions and majors (P2), removes the dead subsystem and hardens tests (P3), and fixes the UX/privacy/doc contradictions (P4).

**Top 5 by impact:**

- `F-SEC-001` — favicon fetches to Google leak which domains the user limits/visits; contradicts PRIVACY.md claims
- `F-BUG-001` — read-modify-write storage races lose or double-count focus switches
- `F-BUG-002` — service-worker listeners registered twice on install/update → double counting
- `F-DEP-072` — Node 18/20 CI lanes EOL; actions run on `node20`; no engines/.nvmrc
- `F-PERF-001` — every visit rewrites the entire visits history; timestamps grow unbounded toward the storage quota

## Baseline

| Row                           | Value                                                                                    | Evidence                                                                                              |
| ----------------------------- | ---------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Build                         | pass (0s)                                                                                | `npm run build` in isolated temp copy (`GIT_DIR` pointed at repo) → "Build complete! Output in dist/" |
| Tests runnable                | no — suite cannot start locally                                                          | `npm test -- --ci` → `sh: jest: command not found` (rc 127)                                           |
| Test pass rate                | not locally measurable; CI green                                                         | jest absent locally; `gh run list --limit 1` → conclusion `success` (run 19828167779, 2025-12-01)     |
| Coverage                      | Not Assessed — jest absent; tool configured                                              | `test:coverage` script + `codecov/codecov-action@v4` in CI (fail_ci_if_error: false)                  |
| Lint / typecheck              | Not Assessed — prettier/eslint absent locally                                            | `npm run lint` → `sh: prettier: command not found` (rc 127); CI job runs eslint+format:check          |
| CI                            | 1 workflow (`.github/workflows/ci.yml`), last run green                                  | `gh run list`; matrix node [18.x, 20.x]                                                               |
| Runtime declared vs installed | node 18.x/20.x declared in CI; **no** `engines`/`.nvmrc`; node v26.7.0 installed locally | `ci.yml:16`, `node -v`                                                                                |
| Lockfile                      | committed: `package-lock.json`, `landing-page/package-lock.json`                         | `git ls-files`                                                                                        |
| Last commit                   | 2025-12-01T16:34:47+01:00; 110 commits in 12 months                                      | `git log -1`                                                                                          |

**Verdict:** RED — no local build→test verification possible without `npm ci`; suite exists and passed its last CI run but is not locally runnable.
**Test command of record:** `npm test -- --ci` (every P0–P4 task's baseline-green criterion references it; where Jest is still absent, the build command substitutes per the plan's substitution note).

## Dimension coverage

`Path` is `own probes` (DEP), `delegated` (read-only delegate invoked), or `inline`. BUG/PERF/UX were audited inline because the subagent delegate runtime was unavailable (provider usage limit) — **that is reduced depth**, listed in Limitations. CLEAN/DEAD/TEST/CI/SEC/DOCS are `inline` by design (their delegates write files).

| Dim   | Disposition | Path                                                                 | Findings |
| ----- | ----------- | -------------------------------------------------------------------- | -------- |
| DEP   | Audited     | own probes (root npm, landing npm, actions)                          | 119      |
| BUG   | Audited     | inline fallback (code-review mode:review; `CODE_REVIEW.md` artifact) | 10       |
| PERF  | Audited     | inline fallback (code-review mode:perf)                              | 6        |
| UX    | Audited     | inline fallback (dont-make-me-think; static review only)             | 5        |
| CLEAN | Audited     | inline                                                               | 7        |
| DEAD  | Audited     | inline                                                               | 7        |
| TEST  | Audited     | inline                                                               | 3        |
| CI    | Audited     | inline                                                               | 3        |
| SEC   | Audited     | inline                                                               | 3        |
| DOCS  | Audited     | inline                                                               | 2        |

## Dependency currency

### Root npm (`package.json`, `package-lock.json`)

| ID        | Package                                  | Installed | Gap       | Risk          | Wave | Severity | Evidence                                                                                                                             |
| --------- | ---------------------------------------- | --------- | --------- | ------------- | ---- | -------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| F-DEP-002 | @babel/plugin-transform-modules-systemjs | 7.28.5    | minor     | vuln-high     | W1   | High     | package-lock.json:1203 (GHSA-fv7c-fp4j-7gwp)                                                                                         |
| F-DEP-004 | brace-expansion                          | 1.1.12    | patch     | vuln-high     | W1   | High     | package-lock.json:3885 (GHSA-f886-m6hf-6m8v, -3jxr, -mh99, -rgw5)                                                                    |
| F-DEP-005 | flatted                                  | 3.3.3     | minor     | vuln-high     | W1   | High     | package-lock.json:5655 (GHSA-25h7, -rf6f)                                                                                            |
| F-DEP-006 | js-yaml                                  | 3.14.2    | minor     | vuln-high     | W1   | High     | package-lock.json:2551 (GHSA-h67p, -52cp, -5p4m)                                                                                     |
| F-DEP-007 | js-yaml                                  | 4.1.1     | minor     | vuln-high     | W1   | High     | package-lock.json:7608 (GHSA-h67p, -52cp, -5p4m)                                                                                     |
| F-DEP-008 | minimatch                                | 3.1.2     | patch     | vuln-high     | W1   | High     | package-lock.json:8364 (GHSA-3ppc, -7r86, -23c5)                                                                                     |
| F-DEP-009 | picomatch                                | 4.0.3     | patch     | vuln-high     | W1   | High     | package-lock.json:2903 (GHSA-3v7f, -c2c7)                                                                                            |
| F-DEP-010 | picomatch                                | 2.3.1     | patch     | vuln-high     | W1   | High     | package-lock.json:8751 (GHSA-3v7f, -c2c7)                                                                                            |
| F-DEP-011 | sharp                                    | 0.34.5    | minor     | vuln-high     | W4   | High     | package.json:42; package-lock.json:9422 (GHSA-f88m; CVE-2026-33327/8, -35590/1); fix needs major 0.35.4 → task 2.9                   |
| F-DEP-012 | ws                                       | 8.18.3    | minor     | vuln-high     | W1   | High     | package-lock.json:10484 (GHSA-58qx, -96hv)                                                                                           |
| F-DEP-001 | @babel/core                              | 7.28.5    | minor     | vuln-low      | W1   | Low      | package.json:32; package-lock.json:74 (GHSA-4x5r)                                                                                    |
| F-DEP-003 | ajv                                      | 6.12.6    | minor     | vuln-moderate | W1   | Medium   | package-lock.json:3469 (GHSA-2g4f)                                                                                                   |
| F-DEP-013 | yaml                                     | 2.8.1     | patch     | vuln-moderate | W1   | Medium   | package-lock.json:10540 (GHSA-48c2)                                                                                                  |
| F-DEP-016 | eslint                                   | 8.57.1    | current   | deprecated    | W4   | High     | package.json:34; package-lock.json:5207 (lockfile: "no longer supported")                                                            |
| F-DEP-014 | @humanwhocodes/config-array              | 0.13.0    | current   | deprecated    | W4   | High     | package-lock.json:1982 (successor @eslint/config-array)                                                                              |
| F-DEP-015 | @humanwhocodes/object-schema             | 2.0.3     | current   | deprecated    | W4   | High     | package-lock.json:2012                                                                                                               |
| F-DEP-017 | glob                                     | 7.2.3     | major×2   | deprecated    | W4   | High     | package-lock.json:5864 (v9+ supported)                                                                                               |
| F-DEP-018 | inflight                                 | 1.0.6     | current   | deprecated    | W4   | High     | package-lock.json:6196 (unsupported; leaks memory)                                                                                   |
| F-DEP-019 | rimraf                                   | 3.0.2     | major     | deprecated    | W4   | High     | package-lock.json:9229 (v4+ supported)                                                                                               |
| F-DEP-072 | node (CI lanes)                          | 18.x/20.x | major×2/3 | eol           | W3   | Critical | ci.yml:16 (18 EOL 2025-04-30, 20 EOL 2026-04-30); no engines/.nvmrc. _(merged with two action-agent runtime rows for the same line)_ |

**Root duplicate resolutions (Low, dedupe wave W5):** F-DEP-020 lru-cache(5.1.1/10.4.3) package-lock.json:42/8261 · F-DEP-021 argparse(1.0.10/2.0.1) :2527/3555 · F-DEP-022 find-up(4.1.0/5.0.0) :2537/5623 · F-DEP-023 js-yaml(3.14.2/4.1.1) :2551/7608 · F-DEP-024 locate-path(5.0.0/6.0.0) :2565/8077 · F-DEP-025 p-limit(2.3.0/3.1.0) :2578/8620 · F-DEP-026 p-locate(4.1.0/5.0.0) :2594/8636 · F-DEP-027 resolve-from(4.0.0/5.0.0) :9145/2607 · F-DEP-028 @jest/environment(29.7.0/30.2.0) :2693/2737 · F-DEP-029 @jest/fake-timers(29.7.0/30.2.0) :2958/2753 · F-DEP-030 @jest/schemas(29.6.3/30.0.5) :3060/2771 · F-DEP-031 @jest/types(29.6.3/30.2.0) :3147/2784 · F-DEP-032 @sinclair/typebox(0.27.8/0.34.41) :3260/2803 · F-DEP-033 @sinonjs/fake-timers(10.3.0/13.0.5) :3277/2810 · F-DEP-034 ansi-styles(4.3.0/5.2.0/6.2.3) :3525/2820/8005 · F-DEP-035 ci-info(3.9.0/4.3.1) :4078/2833 · F-DEP-036 jest-message-util(29.7.0/30.2.0) :7289/2849 · F-DEP-037 jest-mock(29.7.0/30.2.0) :7310/2870 · F-DEP-038 jest-util(29.7.0/30.2.0) :7500/2885 · F-DEP-039 picomatch(2.3.1/4.0.3) :8751/2903 · F-DEP-040 pretty-format(29.7.0/30.2.0) :8892/2916 · F-DEP-041 jest-regex-util(29.6.3/30.0.1) :7343/3006 · F-DEP-042 type-fest(0.20.2/0.21.3) :10043/3502 · F-DEP-043 istanbul-lib-instrument(5.2.1/6.0.3) :3749/6712 · F-DEP-044 ansi-regex(5.0.1/6.2.2) :3515/4134 · F-DEP-045 emoji-regex(8.0.0/10.6.0) :4992/4147 · F-DEP-046 string-width(4.2.3/7.2.0) :9735/4154 · F-DEP-047 strip-ansi(6.0.1/7.1.2) :9809/4172 · F-DEP-048 debug(3.2.7/4.4.3) :5296/4812 · F-DEP-049 doctrine(2.1.0/3.0.0) :5378/4944 · F-DEP-050 semver(6.3.1/7.7.3) :9363/6729 · F-DEP-051 camelcase(5.3.1/6.3.0) :4020/7536 · F-DEP-052 supports-color(7.2.0/8.1.1) :9855/7585 · F-DEP-053 chalk(4.1.2/5.6.2) :4051/7807 · F-DEP-054 commander(7.2.0/13.1.0) :4248/7820 · F-DEP-055 execa(5.1.1/8.0.1) :5506/7830 · F-DEP-056 get-stream(6.0.1/8.0.1) :5833/7854 · F-DEP-057 human-signals(2.1.0/5.0.0) :6101/7867 · F-DEP-058 is-stream(2.0.1/3.0.0) :6578/7877 · F-DEP-059 mimic-fn(2.1.0/4.0.0) :8341/7890 · F-DEP-060 npm-run-path(4.0.1/5.3.0) :8425/7903 · F-DEP-061 onetime(5.1.2/6.0.0/7.0.0) :8568/7919/9182 · F-DEP-062 path-key(3.1.1/4.0.0) :8727/7935 · F-DEP-063 signal-exit(3.0.7/4.1.0) :9579/7948 · F-DEP-064 strip-final-newline(2.0.0/3.0.0) :9832/7961 · F-DEP-065 wrap-ansi(7.0.0/9.0.2) :10445/8059 · F-DEP-066 ansi-escapes(4.3.2/7.2.0) :3486/8127 · F-DEP-067 is-fullwidth-code-point(3.0.0/4.0.0/5.1.0) :6407/9633/8176 · F-DEP-068 slice-ansi(5.0.0/7.1.2) :9603/8192 · F-DEP-069 escape-string-regexp(2.0.0/4.0.0) :9687/5194 · F-DEP-070 json5(1.0.2/2.2.3) :9989/7702 · F-DEP-071 strip-bom(3.0.0/4.0.0) :10002/9822 — all „duplicate package resolutions“ in package-lock.json (parent-major skew declared at package.json:38-39 for the jest 29/30 pairs).

### Landing-page npm (`landing-page/package.json`, `landing-page/package-lock.json`)

| ID        | Package                      | Installed | Gap          | Risk                                | Wave                    | Severity | Evidence                                                   |
| --------- | ---------------------------- | --------- | ------------ | ----------------------------------- | ----------------------- | -------- | ---------------------------------------------------------- |
| F-DEP-105 | react-router-dom             | 6.30.2    | major        | vuln-high (transitive)              | W1 (+W7 for v7)         | High     | pkg:20; lock:5288 (GHSA-2w69, -2j2x via @remix-run/router) |
| F-DEP-108 | @remix-run/router            | 1.23.1    | patch        | vuln-high                           | W1                      | High     | lock:921 (GHSA-2w69, -2j2x)                                |
| F-DEP-110 | brace-expansion              | 1.1.12    | patch        | vuln-high                           | W1                      | High     | lock:1693 (4 advisories)                                   |
| F-DEP-112 | flatted                      | 3.3.3     | minor        | vuln-high                           | W1                      | High     | lock:2989 (GHSA-25h7, -rf6f)                               |
| F-DEP-113 | js-yaml                      | 4.1.1     | minor        | vuln-high                           | W1                      | High     | lock:3906 (3 advisories)                                   |
| F-DEP-114 | minimatch                    | 3.1.2     | patch        | vuln-high                           | W1                      | High     | lock:4135 (3 advisories)                                   |
| F-DEP-115 | nanoid                       | 3.3.11    | patch        | vuln-high                           | W1                      | High     | lock:4167 (GHSA-28wg, -2v37)                               |
| F-DEP-116 | picomatch                    | 2.3.1     | patch        | vuln-high                           | W1                      | High     | lock:4485 (GHSA-3v7f, -c2c7)                               |
| F-DEP-117 | picomatch                    | 4.0.3     | patch        | vuln-high                           | W1                      | High     | lock:6164 (2 advisories)                                   |
| F-DEP-118 | postcss                      | 8.5.6     | patch        | vuln-high                           | W1                      | High     | pkg:33; lock:4528 (4 advisories)                           |
| F-DEP-119 | rollup                       | 4.53.3    | minor        | vuln-high                           | W1                      | High     | lock:5428 (GHSA-mw96)                                      |
| F-DEP-120 | svgo                         | 4.0.0     | patch        | vuln-high                           | W1                      | High     | lock:5968 (GHSA-xpqw, -2p49)                               |
| F-DEP-121 | eslint                       | 8.57.1    | current      | deprecated                          | W3                      | High     | pkg:29; lock:2650 (no longer supported)                    |
| F-DEP-107 | @babel/core                  | 7.28.5    | minor        | vuln-low                            | W2                      | Low      | lock:73 (GHSA-4x5r)                                        |
| F-DEP-109 | ajv                          | 6.12.6    | minor        | vuln-moderate                       | W2                      | Medium   | lock:1376 (GHSA-2g4f)                                      |
| F-DEP-106 | yet-another-react-lightbox   | 3.25.0    | minor        | none                                | W2                      | Low      | pkg:21; lock:6557 (wanted 3.32.2)                          |
| F-DEP-111 | esbuild (via vite)           | 0.21.5    | minor        | vuln-moderate; fix needs Vite major | W3 (isolated toolchain) | Medium   | lock:2588 (GHSA-67mh); audit force-candidate vite@8.2.2    |
| F-DEP-122 | @humanwhocodes/config-array  | 0.13.0    | current      | deprecated                          | W3                      | Medium   | lock:784 (parent F-DEP-121)                                |
| F-DEP-123 | @humanwhocodes/object-schema | 2.0.3     | current      | deprecated                          | W3                      | Medium   | lock:814 (parent F-DEP-121)                                |
| F-DEP-124 | glob                         | 7.2.3     | major        | deprecated                          | W3                      | Medium   | lock:3190 (parent F-DEP-121)                               |
| F-DEP-125 | inflight                     | 1.0.6     | current      | deprecated                          | W3                      | Medium   | lock:3409 (parent F-DEP-121)                               |
| F-DEP-126 | rimraf                       | 3.0.2     | major        | deprecated                          | W3                      | Medium   | lock:5411 (parent F-DEP-121)                               |
| F-DEP-142 | node                         | —         | not declared | not assessed                        | W3                      | Medium   | pkg:1-39 (no engines/.nvmrc anywhere)                      |
| F-DEP-101 | focus-trap-react             | 10.3.1    | major×2      | none; unused in source              | W4                      | Medium   | pkg:16 (latest 12.0.3; zero imports → removable)           |
| F-DEP-103 | react                        | 18.3.1    | major        | none                                | W5 (peer pair)          | Medium   | pkg:18 (latest 19.2.8)                                     |
| F-DEP-104 | react-dom                    | 18.3.1    | major        | none                                | W5 (peer pair)          | Medium   | pkg:19 (latest 19.2.8)                                     |
| F-DEP-102 | lucide-react                 | 0.460.0   | major        | none                                | W6                      | Medium   | pkg:17 (latest 1.37.0)                                     |

**Landing duplicate resolutions (Low, dedupe wave W8):** F-DEP-127 commander(11.1.0) landing-page/package-lock.json:1944 · F-DEP-128 commander(4.1.1) :5932 · F-DEP-129 commander(2.20.3) :6092 · F-DEP-130 css-tree(3.1.0) :2013 · F-DEP-131 css-tree(2.2.1) :2146 · F-DEP-132 doctrine(3.0.0) :2304 · F-DEP-133 doctrine(2.1.0) :2763 · F-DEP-134 glob-parent(6.0.2) :3212 · F-DEP-135 glob-parent(5.1.2) :1904 · F-DEP-136 mdn-data(2.12.2) :4104 · F-DEP-137 mdn-data(2.0.28) :2161 · F-DEP-138 postcss-selector-parser(7.1.1) :5110 · F-DEP-139 postcss-selector-parser(6.1.2) :4904 · F-DEP-140 resolve(2.0.0-next.5) :5372 · F-DEP-141 resolve(1.22.11) :4683 — „duplicated transitive resolutions“; resolve via nearest-parent upgrades + lockfile regeneration; do not force transitive overrides.

### GitHub Actions (`.github/workflows/ci.yml`)

| ID        | Package                 | Installed   | Latest | Gap     | Risk                 | Wave | Severity | Evidence     |
| --------- | ----------------------- | ----------- | ------ | ------- | -------------------- | ---- | -------- | ------------ |
| F-DEP-201 | actions/checkout        | v4 (node20) | v7     | major×3 | eol (node20 runs)    | W6   | Critical | ci.yml:20,57 |
| F-DEP-202 | actions/setup-node      | v4 (node20) | v7     | major×3 | eol                  | W7   | Critical | ci.yml:23,60 |
| F-DEP-203 | actions/upload-artifact | v4 (node20) | v7     | major×3 | eol                  | W4   | Critical | ci.yml:45    |
| F-DEP-204 | codecov/codecov-action  | v4 (node20) | v7     | major×3 | eol                  | W5   | Critical | ci.yml:72,74 |
| F-DEP-207 | ubuntu-latest runner    | 24.04       | 24.04  | current | none (mutable label) | W3   | Medium   | ci.yml:12,53 |

### Runtime and toolchain

| Component              | Declared                 | Installed            | Current stable                 | Status                                                 | Severity                  |
| ---------------------- | ------------------------ | -------------------- | ------------------------------ | ------------------------------------------------------ | ------------------------- |
| Node.js                | CI 18.x/20.x; no engines | v26.7.0 (local only) | v24 LTS / v26 Current          | 18 EOL 2025-04-30; 20 EOL 2026-04-30; no repo-wide pin | Critical (F-DEP-072)      |
| GitHub Actions runtime | actions @v4              | node20               | actions @v7 (node24)           | node20 EOL                                             | Critical (F-DEP-201..204) |
| ESLint                 | 8.57.1                   | 8.57.1               | 9.x (lockfile: v8 unsupported) | deprecated                                             | High (F-DEP-016/121)      |

### Upgrade waves

| Wave | Contents                                                                                                                                  | Lands in |
| ---- | ----------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| W1   | Security patches — root (F-DEP-002..010, 012) + landing (13: F-DEP-105,108,110,112-120); sharp (F-DEP-011) is a major fix → W4            | P1       |
| W2   | Patch/minor batch per ecosystem (F-DEP-106,107,109,001,003,013)                                                                           | P1       |
| W3   | Runtime + toolchain: Node policy (engines/.nvmrc + CI lanes), actions majors, ESLint 8→9 migration, Vite/esbuild toolchain spike          | P2       |
| W4   | Deprecated toolchain transitives via ESLint migration (F-DEP-014..019, 122-126); upload-artifact v4→v7; sharp 0.34→0.35 major (F-DEP-011) | P2       |
| W5   | react + react-dom 18→19 (peer pair), codecov v4→v7                                                                                        | P2       |
| W6   | lucide-react 0.x→1.x; checkout v4→v7                                                                                                      | P2       |
| W7   | react-router-dom v7 major spike (after W1 patch); setup-node v4→v7                                                                        | P2       |
| W8   | Duplicate-resolution convergence (F-DEP-020..071, 127..141)                                                                               | P3       |

## Findings

### BUG — 10 (inline fallback; `CODE_REVIEW.md` artifact)

| ID        | Severity | Evidence                                                                                                                                          | Problem                                                                                                                                           | Fix direction                                            | Effort                                                                          |
| --------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- | ------------------------------------------------------------------------------- | ------------------------ | --- |
| F-BUG-001 | High     | storage.js:177-225; tracking.js:33-45,95-102                                                                                                      | Read-modify-write race on `visits` (onActivated+onUpdated can overlap) → lost or duplicated focus switches                                        | Serialized/atomic storage writer + `lastError` checks    | M                                                                               |
| F-BUG-002 | High     | index.js:49-62 vs 67-83                                                                                                                           | `initializeTracking()` registered in `onInstalled` AND top-level on the same SW instance → duplicate listeners, double counting on install/update | Register listeners top-level only                        | S                                                                               |
| F-BUG-003 | High     | notifications.js:253                                                                                                                              | `checkLimitWarnings` reads `limitConfig.daily.limit` without normalization → legacy numeric limits throw and abort the rest of `trackTabFocus`    | Normalize at every read site                             | S                                                                               |
| F-BUG-004 | Medium   | storage.js:77-79, 511, 521, 538; blocked.js:154-156                                                                                               | UTC date keys vs local-midnight streak anchors → off-by-one day keys for non-UTC users; countdown disagrees with real reset                       | Single date-key utility (local-tz aware) used everywhere | M                                                                               |
| F-BUG-005 | Medium   | dashboard.js:499, sortTableData (dashboard.js:524-549)                                                                                            | Table sorts by range `count` but displays `todayCount` → sorting appears wrong in Week/Month views                                                | Sort on the displayed value                              | S                                                                               |
| F-BUG-006 | Medium   | focus-score.js:55-62                                                                                                                              | Legacy numeric limits silently excluded from compliance scoring                                                                                   | Normalize before filtering                               | S                                                                               |
| F-BUG-007 | Medium   | countdown-toast.js:77; graph.js:329; visualization-page.js:505,658,775,800; blocking.js:49; domain.js:266; dashboard.js (renderSubpathTable rows) | 8+ sites interpolate domain/subpath into innerHTML/tooltip.html — violates project XSS rule (mitigated by CSP)                                    | Replace with createElement/textContent                   | M                                                                               |
| F-BUG-008 | Medium   | storage.js:216-224                                                                                                                                | `set` callbacks never check `chrome.runtime.lastError`; quota-exceeded writes fail silently                                                       | Reject on lastError; surface to UI                       | S                                                                               |
| F-BUG-009 | Low      | blocking.js:111-118                                                                                                                               | `parseInt(...)                                                                                                                                    |                                                          | 10` coerces 0→default; no upper bound; divergent from the two other limit forms | Shared validation helper | S   |
| F-BUG-010 | Low      | categories.js:131                                                                                                                                 | Substring category matching miscategorizes ("target", "news")                                                                                     | Token/ends-with matching + tests                         | S                                                                               |

### PERF — 6 (inline fallback)

| ID         | Severity | Evidence                                                            | Problem                                                                                                                                           | Fix direction                                                                | Effort |
| ---------- | -------- | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | ------ |
| F-PERF-001 | High     | storage.js:177-225                                                  | Every visit rewrites the entire `visits` object; timestamps appended forever → write amplification + unbounded growth toward chrome.storage quota | Bounded timestamps (rolling window), incremental writes, periodic compaction | M      |
| F-PERF-002 | High     | storage.js:594-649; focus-score.js:113-131; achievements.js:150-160 | `calculateOverallStreak` read-computes-WRITES on every call; invoked per tab switch (achievements) and 30× per history render                     | Cache per-day; batch streak in a single daily task                           | M      |
| F-PERF-003 | Medium   | tracking.js:85; limits.js:292-299                                   | Explicit `updateBlockingRules()` per visit duplicates the `onChanged`-triggered recompute → double DNR churn per switch                           | Rely on the onChanged listener only                                          | S      |
| F-PERF-004 | Medium   | focus-score.js:120-131                                              | 30 sequential full-storage reads + 30 streak writes per dashboard load                                                                            | Single read + memoized streak                                                | M      |
| F-PERF-005 | Medium   | visualization-page.js:16-89,114-166; dashboard.js:186-226           | Three near-identical full-history scans per render (current + today + previous)                                                                   | One scan per view; share aggregator                                          | M      |
| F-PERF-006 | Low      | tracking.js:102                                                     | Dynamic `import('./limits.js')` on the hot path when limits already imported statically                                                           | Import once                                                                  | S      |

### CLEAN — 7 (inline)

| ID          | Severity | Evidence                                                                                      | Problem                                                                               | Fix direction                       | Effort |
| ----------- | -------- | --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- | ----------------------------------- | ------ |
| F-CLEAN-001 | Medium   | visualization-page.js:515-1104                                                                | ~590-line god function mixing render/settings/export/listeners                        | Split by responsibility             | L      |
| F-CLEAN-002 | Medium   | storage.js:77-79 vs visualization-page.js:16-89; goals.js:68; notifications.js:84             | 4+ duplicated `getTodayKey`, duplicated `getAggregatedStats` (see F-DEAD-002 pattern) | Extract shared time-range utilities | M      |
| F-CLEAN-003 | Medium   | blocking.js:81-121 vs domain.js:113-150 vs visualization-page.js (limit-form handler, ~1061+) | Limit form logic triplicated with divergent validation (F-BUG-009)                    | One shared form controller          | M      |
| F-CLEAN-004 | Low      | notifications.js:230                                                                          | Contradictory `!preferences.enabled && preferences.enabled !== false`                 | Simplify to truthy check            | S      |
| F-CLEAN-005 | Low      | limits.js:130,237; badge.js:20; dashboard.js:631-632                                          | Magic values (5-hour ms ×3, badge color, 0.8 thresholds)                              | Named constants                     | S      |
| F-CLEAN-006 | Low      | graph.js:37-38                                                                                | Comment says "Import D3 from CDN" but d3 is vendored locally                          | Fix comment                         | S      |
| F-CLEAN-007 | Low      | dashboard.js:1052-1060                                                                        | Duplicated JSDoc block for `updateFocusScoreDisplay`                                  | Remove duplicate                    | S      |

### DEAD — 7 (inline)

| ID         | Severity | Evidence                                         | Problem                                                                                                                                                                                                                  | Fix direction                                              | Effort |
| ---------- | -------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------- | ------ |
| F-DEAD-001 | High     | goals.js:1-417; visualization-page.js:876-1104   | Goals module never imported; achievements/goals/insights/export-PNG handlers reference DOM ids that exist in no HTML and `window.get*` functions that are never defined → ~700 lines unreachable, would crash if reached | Delete subsystem or wire it (decide; deletion recommended) | M      |
| F-DEAD-002 | Medium   | copy.js:1-218                                    | `src/common/copy.js` never imported anywhere                                                                                                                                                                             | Delete or start using it                                   | S      |
| F-DEAD-003 | Medium   | feature-flags.js:6-37; visualization-page.js:739 | 20 of 21 feature flags never read; only RADIAL_GRAPH consulted                                                                                                                                                           | Delete unused flags                                        | S      |
| F-DEAD-004 | Low      | dashboard.js:816, 199-205                        | `handleInlineLimitToggle` unused (with eslint-disable); resize handler only logs                                                                                                                                         | Remove                                                     | S      |
| F-DEAD-005 | Low      | tests/example.test.js:5-9                        | Placeholder test adds no coverage                                                                                                                                                                                        | Delete                                                     | S      |
| F-DEAD-006 | Low      | blocking.js:129-137,156                          | Leftover comment "Let's check storage.js implementation"; hand-rolled delete instead of `deleteDomainData`                                                                                                               | Use storage.js API, drop comment                           | S      |
| F-DEAD-007 | Low      | categories.js:85-86                              | `localhost`/`127.0.0.1` keywords unreachable (parseUrl filters them)                                                                                                                                                     | Remove                                                     | S      |

### UX — 5 (static-only review)

| ID       | Severity | Evidence                                       | Problem                                                                                               | Fix direction                                | Effort |
| -------- | -------- | ---------------------------------------------- | ----------------------------------------------------------------------------------------------------- | -------------------------------------------- | ------ |
| F-UX-001 | High     | popup.html:144-149                             | "High contrast mode" toggle rendered but no JS wires it → visible control does nothing                | Wire or remove; tests for behavior           | S      |
| F-UX-002 | Medium   | dashboard.js:310-315                           | "Visits" column shows today's count in Week/Month views, contradicting header totals (with F-BUG-005) | Label per-range counts                       | S      |
| F-UX-003 | Medium   | blocked.js:154-156 (w/ F-BUG-004)              | Countdown says "until midnight" (local) while daily limits reset on UTC date                          | Align time semantics; show actual reset time | S      |
| F-UX-004 | Low      | popup.html:26-58; dashboard/index.html:104-131 | Emoji-only toolbar buttons rely on tooltips — weak affordance on first run                            | Labeled icon buttons                         | S      |
| F-UX-005 | Low      | dashboard.js:85-88                             | Insights popup auto-opens 1s after load each new day — interruptible but modal-ish surprise           | Non-modal or dismissible inline banner       | S      |

_What works (static):_ two-tap destructive confirm on reset/delete; aria-labels/roles broadly present; FAQ keyboard nav; empty/loading states; quick-limits reduces settings navigation depth.

### TEST — 3 (inline)

| ID         | Severity | Evidence                                                                           | Problem                                                                                                                                                                                                                  | Fix direction                                                    | Effort |
| ---------- | -------- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------- | ------ |
| F-TEST-001 | High     | tests/\*.test.js import surface (only storage, limits, tracking, badge); repo-wide | Zero tests for focus-score, achievements, notifications, goals, visualization-page, graph, dashboard, popup, blocked, domain, help, blocking, countdown-toast, categories, feature-flags; landing-page has no test setup | Add characterization + unit tests per module via `test-coverage` | L      |
| F-TEST-002 | Medium   | tests/storage.test.js, limits.test.js (happy paths only)                           | Error paths untested: storage quota, legacy-limit normalization, concurrency/race behavior, timezone boundary                                                                                                            | Property/edge tests named above                                  | M      |
| F-TEST-003 | Medium   | repo-wide                                                                          | No popup-load smoke test and no background event-handler integration check (AGENTS.md requirement)                                                                                                                       | Jest+jsdom smoke suite + SW event harness                        | M      |

_Checked clean:_ no `.skip`/`.only`/`.todo` in tests; no sleeps/retries/network dependence found in the suite.

### CI — 3 (inline)

| ID       | Severity | Evidence                                           | Problem                                                                                                                                                                                    | Fix direction                                            | Effort |
| -------- | -------- | -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------- | ------ |
| F-CI-001 | Medium   | ci.yml:1-80; landing-page/package.json             | CI covers only the root package — landing-page is never linted, built, or tested in CI                                                                                                     | Add landing job to the workflow via `devops-pipeline`    | S      |
| F-CI-002 | Medium   | scripts/update-version.sh:29-38; .husky/pre-commit | `npm run build` (run by pre-commit and CI) sed-rewrites tracked `manifest.json` version_name → dirty tree after every commit (seen pre-run: `M manifest.json`); build is non-deterministic | Build to a temp manifest or regenerate deterministically | M      |
| F-CI-003 | Low      | ci.yml:74-79                                       | Coverage uploaded with `fail_ci_if_error: false` and no minimum threshold → coverage can silently regress                                                                                  | Raise `fail_ci_if_error`, add threshold gate             | S      |

### SEC — 3 (inline)

| ID        | Severity | Evidence                                                | Problem                                                                                                                                                                | Fix direction                                                               | Effort |
| --------- | -------- | ------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- | ------ |
| F-SEC-001 | High     | dashboard.js:469; blocking.js:45; PRIVACY.md:34,75,102  | Google S2 favicon fetches transmit the user's visited/limited domains to a third party, contradicting "no data transmitted / no third-party services" claims           | Self-host favicons or drop them; document any residual external asset loads | M      |
| F-SEC-002 | Medium   | visualization-page.js (export CSV handler, ≈:1455-1470) | CSV cells (subpath/domain) not escaped for `= + - @` prefixes → formula injection when opened in a spreadsheet                                                         | Prefix-escape / quote cells; re-validate on import                          | S      |
| F-SEC-003 | Medium   | manifest.json:11-19,30-42                               | Broad `host_permissions` `<all_urls>` + content-script `<all_urls>` — justified for DNR redirect but no least-privilege review record; PRIVACY.md:66 lists only `tabs` | Document rationale per permission; revisit scoping with DNR session rules   | S      |

_Checked clean:_ no committed secrets in the current tree or bounded history scan (`AIza`, `BEGIN RSA PRIVATE KEY`); no `.env`/`.pem`/`.crx` tracked (only `landing-page/.env.example`); no telemetry/analytics imports; no remote API calls beyond the favicon fetches above.

### DOCS — 2 (inline)

| ID         | Severity | Evidence                                                            | Problem                                                                                                         | Fix direction                                                        | Effort |
| ---------- | -------- | ------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- | ------ |
| F-DOCS-001 | High     | PRIVACY.md:34,75,102; README.md (privacy section)                   | Privacy docs promise zero external transmission, contradicted by F-SEC-001                                      | Update claims to match behavior (either remove favicons or disclose) | S      |
| F-DOCS-002 | Medium   | README.md (Prerequisites: "Node.js 18+"); package.json (no engines) | README implies Node 18+, but 18 is EOL and nothing declares a supported runtime; landing README guidance absent | Add engines/.nvmrc and document current LTS policy                   | S      |

## Cross-cutting patterns

- **Unbounded read-modify-write storage on hot paths** — every tab switch rescans and rewrites all history; streak recompute writes on each call. (`F-BUG-001`, `F-PERF-001`, `F-PERF-002`, `F-PERF-004`, `F-BUG-008`)
- **HTML-string templating with interpolated data** — 8+ innerHTML/tooltip.html sites across content script, popup, dashboard, blocking. (`F-BUG-007`, adjacent `F-SEC-002`)
- **Duplicated date/time-range aggregation with subtle divergence** — UTC vs local, three aggregators, three limit forms. (`F-CLEAN-002`, `F-CLEAN-003`, `F-BUG-004`, `F-BUG-005`, `F-UX-003`, `F-UX-002`)
- **Legacy limit format not normalized at read sites** — notifications and focus-score crash or silently ignore. (`F-BUG-003`, `F-BUG-006`)
- **Privacy claims vs. actual external fetches** — favicons. (`F-SEC-001`, `F-DOCS-001`)
- **Untracked/dead UI subsystem queried through globals that don't exist** — goals/achievements/insights/export-PNG. (`F-DEAD-001`)

## Artifacts written

| File                      | Why                                                                                        |
| ------------------------- | ------------------------------------------------------------------------------------------ |
| `MODERNIZATION_REPORT.md` | this report                                                                                |
| `MODERNIZATION_PLAN.md`   | the derived plan                                                                           |
| `CODE_REVIEW.md`          | declared artifact — written by the BUG review (inline fallback of code-review mode:review) |

**Tracked files modified: 0.** `git status --porcelain` and `git diff` (staged + unstaged) match the pre-run snapshot; the pre-existing ` M manifest.json` and untracked `.agent/ .claude/ .gemini/ .specify/ .windsurf/` entries were present before the audit and are unchanged. Probe byproducts: none — the build probe ran in a temp copy outside the tree; the readonly dependency scan wrote nothing; `dist/`/`coverage/` predate the run and are gitignored.

## Limitations

- **BUG/PERF/UX ran inline (reduced depth).** The delegate subagent runtime was unavailable (provider usage limit after the DEP audit). BUG used the code-review review checklist + produced `CODE_REVIEW.md`; PERF used the perf checklist; UX used the Krug lenses — all at reduced depth versus their parallel-reviewer workflows. Findings are cited from direct source reading, but the deeper adversarial pass and the live-site usability session were not obtained. **Not** a limitation: CLEAN/DEAD/TEST/CI/SEC/DOCS are inline by design.
- **UX is static-only.** The app has runnable entry points and the build passes in isolation, but no browser/server was launched; flows were assessed from markup+JS.
- **Baseline probes were limited by absent local tooling.** Tests/lint/coverage recorded Not Assessed (Jest/Prettier/ESLint not installed); pass rate taken from the last green CI run. The build probe ran in a temp copy to keep the target tree read-only; it exercised `update-version.sh` + `build.js` but not a full `vite build` (landing) or `npm test`.
- **DEP currency assumed network truth at audit time.** Versions are from the live `npm outdated`/`npm audit`/GitHub API; advisories are as published 2026-08-30. Migration guides for majors were not retrieved (no Context7) — affected tasks are flagged `needs_spike` and their first criterion is retrieving the guide.
- **No runtime behavior of the extension was executed** (would require Chrome); concurrency findings are from static read of the storage API usage.
- Scope excluded: `src/vendor/d3.min.js`, `dist/`, `coverage/`, gitignored agent dirs (`.agent/ .claude/ .gemini/ .specify/ .windsurf/`), and `landing-page/dist/`.

## Next step

The plan derived from this report: [`MODERNIZATION_PLAN.md`](./MODERNIZATION_PLAN.md).
