# Chrome Web Store — FocusPaw Submission Package

> **Version:** 1.0.0 (Unreleased — FocusPaw Rebrand)
> **Commit:** `406e9cc`
> **Build dir:** `cws-submission/`
> **Date:** 2025-09-02

---

## 1. Listing Details

| Field | Value |
|-------|-------|
| **Name** | FocusPaw - Focus Tracker |
| **Short description** (max 132 chars) | Track your focus habits with a beautiful privacy-first radial graph. Set visit limits, build streaks, stay productive. |
| **Full description** (max 4000 chars) | See below |
| **Category** | Productivity |
| **Homepage URL** | https://github.com/luongnv89/focus-paw |
| **Privacy Policy URL** | https://focus-paw.luongnv.com/privacy |
| **Author** | FocusPaw Team |
| **Minimum Chrome version** | 100 |

### Full Description

```
FocusPaw helps you understand and improve your browsing focus habits — all locally on your device, with zero tracking.

WHAT IT DOES:
• Visualize your attention patterns with an interactive radial graph — see every domain and subpage you visit
• Set per-site daily visit limits to break distraction loops
• Get gentle countdown notifications when you're approaching your limit
• Fun, themed block pages when you exceed your limit — guilt with a smile
• Track focus streaks and get achievement badges for consistent habits
• Export your data as JSON or CSV anytime

PRIVACY-FIRST DESIGN:
• All data stays on your device — stored in Chrome's local storage
• No accounts, no telemetry, no external API calls
• No page content, passwords, or personal information ever collected
• Only domain names and visit counts are tracked
• Works fully offline

FEATURES:
• Interactive D3.js radial graph with zoom and pan
• Drill down from domain to subpage level
• Time range filters (hour, day, week, month)
• Fuzzy search across domains and subpages
• Per-domain daily visit limits with customizable thresholds
• Five-hour sub-limits for extra control
• Focus streak tracking with best-streak persistence
• Achievement system with unlockable badges
• Dark mode dashboard with beautiful typography
• CSV and JSON data export
• Responsive dashboard layout

PERMISSIONS EXPLAINED:
• tabs — Detect when you switch between websites to track domain visits
• storage — Save your visit data, settings, and limits locally
• notifications — Show countdown alerts when approaching your limits
• declarativeNetRequest + declarativeNetRequestWithHostAccess — Block access to sites when daily limits are exceeded

OPEN SOURCE:
FocusPaw is fully open source. Review the code, report issues, or contribute:
https://github.com/luongnv89/focus-paw
```

---

## 2. Screenshots (1280×800 — 16:10 ratio)

Refreshed for v1.0.1 — same files ship on the landing page gallery
(`landing-page/public/screenshots/`).

| # | File | Caption |
|---|------|---------|
| 1 | `screenshots/dashboard.png` | Dashboard with interactive focus graph |
| 2 | `screenshots/dashboard-map.png` | Explore tracked sites on an interactive map |
| 3 | `screenshots/set-block-rules.png` | Manage your site blocking rules |
| 4 | `screenshots/settings.png` | Customize your focus tracking preferences |
| 5 | `screenshots/help-faq.png` | Comprehensive help documentation |

## 2b. Promo Tiles

| Type | Size | File |
|------|------|------|
| Small Promo Tile | 440×280 | `promo/promo-small-440x280.png` |
| Marquee Promo | 1400×560 | `promo/promo-marquee-1400x560.png` |

---

## 3. Icons

| Size | File | Purpose |
|------|------|---------|
| 128×128 | `icon-128.png` | Store listing icon (required) |
| 48×48 | `icon-48.png` | Extension icon (required) |

Source assets in `assets/` also include 16×16 and 32×32 PNG variants + SVG.

---

## 4. Extension Package

The distributable zip is ready at:

```
cws-submission/focus-paw.zip
```

Contents:
```
dist/
├── manifest.json          (MV3, version 1.0.0)
├── assets/
│   ├── icon-16.png
│   ├── icon-32.png
│   ├── icon-48.png
│   ├── icon-128.png
│   └── icon.svg
├── src/
│   ├── background/        (service worker, tracking, limits, badges)
│   ├── popup/             (popup UI)
│   ├── dashboard/         (dashboard pages)
│   ├── blocking/          (block page)
│   ├── help/              (help/FAQ page)
│   └── content/           (countdown toast)
└── screenshots/           (optional — for store assets)
```

---

## 5. Pre-Submission Checklist

### ✅ Manifest & Permissions
- [x] `manifest_version: 3`
- [x] All permissions justified and minimal
- [x] `optional_host_permissions` used for `<all_urls>` (not required)
- [x] `privacy_policy_url` set and reachable
- [x] `homepage_url` set
- [x] `minimum_chrome_version` set to 100

### ✅ Assets
- [x] 128×128 icon (PNG)
- [x] 6 screenshots at 1280×800 (16:10)
- [x] Full description under 4000 chars
- [x] Short description under 132 chars

### ✅ Code Quality
- [x] `npm run lint` — green
- [x] `npm run format:check` — green
- [x] `npm test -- --ci` — 281/281 passed
- [x] `npm run build` — deterministic, no tracked file mutations

### ✅ Privacy & Security
- [x] No external API calls or telemetry
- [x] All data stored in `chrome.storage.local`
- [x] No `innerHTML` — safe DOM APIs only
- [x] CSV export hardened against formula injection
- [x] CSP set in manifest
- [x] No secrets or API keys in code

### ✅ User Experience
- [x] Graceful error handling (no stack traces in UI)
- [x] First-run onboarding flow
- [x] Quiet hours support for notifications
- [x] Data export (JSON + CSV)
- [x] Dark mode UI

### ✅ Chrome Web Store Policy Compliance
- [x] No deceptive practices
- [x] No malicious code
- [x] Clear privacy policy
- [x] Functional extension (no placeholder features)
- [x] Category: Productivity

---

## 6. Submission Steps

1. Go to [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
2. Select **FocusPaw** listing (or create new if first submission)
3. Upload `cws-submission/focus-paw.zip`
4. Fill in listing details from Section 1
5. Upload screenshots from Section 2
6. Upload icon from Section 3
7. Select category: **Productivity**
8. Fill in the "Content Ratings" questionnaire
9. Review and publish

---

## 7. Release Notes (for CWS)

```
FocusPaw Rebrand & Bug Fixes

• Brand rebrand: FocusBear → FocusPaw with new paw-themed identity
• Fixed notification icon path for reliable Chrome notifications
• Added privacy policy URL to manifest
• Added SPA routing fallback (404.html) for hosted landing page
• Improved category matching to reduce false positives
• All data remains local — zero tracking, full privacy
```
