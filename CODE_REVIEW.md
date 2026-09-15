# Code Review Report

**Date**: 2026-08-30
**Scope**: Full Audit (Mode 2 — batched inline) — root package `src/`
**Files Reviewed**: 44 of 66 source files (vendored `d3.min.js`, `dist/`, `landing-page/` dist assets excluded; landing-page covered by separate dimensions)
**Mode note**: run inline by codebase-modernizer (BUG dimension) because the delegate agent runtime was unavailable (provider usage limit). Reduced depth vs. parallel reviewer fleet is disclosed in `MODERNIZATION_REPORT.md` → Limitations.

## Summary

| Severity | Count |
| -------- | ----- |
| Critical | 0     |
| Major    | 3     |
| Minor    | 5     |
| Info     | 2     |

Focus: correctness of the tracking/limit pipeline, storage concurrency, MV3 service-worker lifecycle, and the project's own XSS/innerHTML rule.

## Major Issues

### [Bug]: Storage read-modify-write race loses visits

**File**: `src/background/storage.js:177-225`
**Smell**: Race condition / unawaited promises

`incrementVisit()` does `get → mutate → set` with no serialization. `trackTabFocus` is invoked from both `tabs.onActivated` and `tabs.onUpdated` (`src/background/tracking.js:33-45,95-102`), so two overlapping calls can both read the same `visits` snapshot and the last `set` wins — a focus switch is silently lost. The same pattern exists in `setLimitForDomain`, `addGoalToday`, `checkGoalProgress`, and `checkAchievements`.

**Before**:

```js
chrome.storage.local.get(['visits'], (data) => {
  const visits = data.visits || {};
  visits[dateKey][domain].count += 1;   // stale snapshot under concurrency
  chrome.storage.local.set({ visits }, () => resolve(...));
});
```

**Suggested Fix**:

```js
// Serialize per-domain mutations (mutex queue) or use a single
// atomic writer; reject on chrome.runtime.lastError.
await withVisitLock(domain, () => applyIncrement(domain, subpath));
```

### [Bug]: Tracking listeners registered twice on install/update

**File**: `src/background/index.js:32-46` (vs. top-level `index.js:59-60`)
**Smell**: Duplicate side effect

`chrome.runtime.onInstalled` calls `initializeTracking()` while top-level module scope also calls it. On an install/update SW instance both run, so `tabs.onActivated`/`tabs.onUpdated` handlers are registered twice → every focus switch is counted twice until the SW is recycled. `initializeLimitEnforcement()` is likewise doubled (duplicate `onChanged` listeners → duplicate rule recompute).

**Suggested Fix**: register listeners only at top level; inside `onInstalled` do only first-run data seeding.

### [Bug]: Legacy limit format crashes the tracking pipeline

**File**: `src/background/notifications.js:276-280`
**Smell**: Missing normalization at read site

`checkLimitWarnings()` reads `limitConfig.daily.limit` without `normalizeLimitConfig()`. A legacy numeric limit (`limits[domain] = 10`) throws `TypeError: Cannot read properties of undefined (reading 'limit')`; the exception propagates into `trackTabFocus`'s catch (`tracking.js:86-89`), skipping achievement checks and `updateBlockingRules()` for that visit. `focus-score.js:60` silently ignores legacy limits in scoring for the same reason.

**Suggested Fix**: normalize at every read: `const cfg = normalizeLimitConfig(limitConfig);`.

## Minor Issues

### [Bug]: UTC date keys vs. local midnight

**File**: `src/background/storage.js:47-52,527-535,596-649`
`getTodayKey()` uses UTC (`toISOString`), but `calculateLimitStreak`/`calculateOverallStreak` anchor on local `setHours(0,0,0,0)`. For non-UTC users day keys shift by one; streaks and daily limits disagree with the blocked page's "until midnight" countdown (`src/blocked/blocked.js:121-126`).

### [Bug]: Dashboard sort key ≠ displayed value

**File**: `src/dashboard/dashboard.js:310-315` + `sortTableData`
The "Visits" column renders `row.todayCount` while sorting uses `row.count` (range aggregate); in Week/Month views rows appear sorted by numbers the user cannot see.

### [Bug]: innerHTML with interpolated untrusted-ish data

**File**: `src/content/countdown-toast.js:61`, `src/popup/graph.js:341-357`, `src/common/visualization-page.js:447-452,836-842`, `src/dashboard/blocking.js:66-89`, `src/dashboard/dashboard.js` (`renderSubpathTable`)
Domain/subpath strings are interpolated into `innerHTML`/`tooltip.html()`. MV3 CSP blocks script execution, but the project rule (AGENTS.md: "Never use innerHTML with untrusted content") is violated at 8+ sites; URL pathnames can contain HTML metacharacters.

### [Bug]: Storage errors swallowed

**File**: `src/background/storage.js:216-224`
`set` callbacks never check `chrome.runtime.lastError`; a quota-exceeded write fails silently and the resolved count lies.

### [Bug]: Weak limit validation on blocking page

**File**: `src/dashboard/blocking.js:96-103`
`parseInt(x,10) || 10` coerces an entered `0` into the default; no upper bound. The other two limit forms (`domain.js:127-140`, `visualization-page.js:1076-1090`) validate properly — three divergent implementations.

## Info

### [Quality]: Category matching by substring

`src/common/categories.js:141-148` — `includes('target')`/`includes('news')` miscategorizes any domain containing those substrings.

### [Quality]: Redundant explicit recompute

`src/background/tracking.js:85` calls `updateBlockingRules()` after every visit although the `storage.onChanged` listener (`limits.js:292-299`) already recomputes — double work per switch.

## Recommendations

1. Introduce one serialized storage-writer utility and route every `visits` mutation through it (fixes the race and the swallowed errors together).
2. Register all service-worker listeners exclusively at top level; keep `onInstalled` for data seeding only.
3. Normalize legacy limit configs once, at the storage boundary, instead of at each consumer.
4. Replace HTML-string templates with `createElement`/`textContent` in content-script and extension pages.

**Merge-conflict markers**: none found. **No fabricated findings**: every citation above was read from source at the cited lines.
