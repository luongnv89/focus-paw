# Chrome Web Store Listing

This document contains all the information needed to submit FocusPaw to the Chrome Web Store.

---

## Basic Information

### Extension Name

```
FocusPaw - Focus Tracker
```

### Short Description (132 characters max)

```
Track focus-switching habits with privacy-first visualizations. Set limits, build streaks, improve productivity.
```

### Detailed Description (16,000 characters max)

```
🐻 FocusPaw - Your Attention, Mapped with Empathy

FocusPaw is a privacy-first Chrome extension that helps you understand and improve your browsing habits by tracking how often you switch between websites.

Unlike time trackers that measure hours spent, FocusPaw focuses on ATTENTION SWITCHES — each time you navigate to a different domain counts as a "focus switch." Research shows frequent context-switching is one of the biggest productivity killers.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✨ KEY FEATURES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 INTERACTIVE DASHBOARD
Beautiful D3.js radial graph visualization showing your attention patterns. See which sites capture your focus at a glance.

⭐ FOCUS SCORE
Daily 0-100 score based on:
• Limits compliance (40%)
• Visit reduction vs. last week (30%)
• Streak length (20%)
• Domain focus (10%)

🔥 STREAKS
Track consecutive days of staying within your limits. Build momentum and watch your focus habits improve!

🛡️ SITE LIMITS
Set daily visit limits for distracting websites. Get a friendly reminder when you exceed them.

📅 TIME FILTERS
View your data by Today, Week, or Month. Compare periods to see your progress.

🌙 DARK/LIGHT MODE
Easy on the eyes, whether you're working late or in bright daylight.

📥 DATA EXPORT
Download all your data as JSON or CSV anytime. Your data, your control.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔒 100% PRIVACY-FIRST
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

FocusPaw is completely local-only:

✅ ALL data stored locally on your device
✅ NO external servers or cloud sync
✅ NO analytics or tracking
✅ NO account required
✅ NO data ever leaves your computer
✅ Open source - verify the code yourself!

We don't collect, transmit, or store any of your personal information. Period.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📖 HOW IT WORKS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Install FocusPaw and browse normally
2. Click the toolbar icon to open your dashboard
3. See your attention patterns visualized
4. Set limits for distracting sites
5. Build streaks by staying under limits
6. Watch your focus score improve!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
❓ FAQ
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Q: What does FocusPaw track?
A: Only domain visit counts (e.g., "twitter.com: 5 visits"). We don't track page content, time spent, or anything you type.

Q: Does it work in Incognito?
A: No, FocusPaw respects your privacy and doesn't track Incognito browsing.

Q: Can I delete my data?
A: Yes! Export your data first if you want, then use "Reset All Data" in Settings.

Q: Is it open source?
A: Yes! View the code at github.com/luongnv89/focus-paw

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Take control of your attention. Install FocusPaw today!

🐻 Track your focus, privacy-first.
```

### Category

```
Productivity
```

### Language

```
English
```

---

## Store Assets Checklist

### Required Icons

- [x] 16x16 PNG (`assets/icon-16.png`)
- [x] 32x32 PNG (`assets/icon-32.png`)
- [x] 48x48 PNG (`assets/icon-48.png`)
- [x] 128x128 PNG (`assets/icon-128.png`)

### Store Icon

- [ ] **Store Icon:** 128x128 PNG (for store listing)
  - Use: `assets/icon-128.png`

### Promotional Images

- [ ] **Small Promo Tile:** 440x280 PNG
  - Location: `assets/store/promo-small.png`
  - Shows: Logo + tagline on brand background

- [ ] **Large Promo Tile:** 920x680 PNG (optional but recommended)
  - Location: `assets/store/promo-large.png`
  - Shows: Dashboard screenshot + feature highlights

- [ ] **Marquee Promo:** 1400x560 PNG (optional)
  - Location: `assets/store/promo-marquee.png`
  - Shows: Full feature showcase

### Screenshots (Required: 1-5)

- [ ] **Screenshot 1:** 1280x800 or 640x400 PNG
  - Dashboard with radial graph
  - Location: `assets/store/screenshot-1-dashboard.png`

- [ ] **Screenshot 2:** 1280x800 or 640x400 PNG
  - Website activity table
  - Location: `assets/store/screenshot-2-table.png`

- [ ] **Screenshot 3:** 1280x800 or 640x400 PNG
  - Settings page
  - Location: `assets/store/screenshot-3-settings.png`

- [ ] **Screenshot 4:** 1280x800 or 640x400 PNG
  - Block page (when limit exceeded)
  - Location: `assets/store/screenshot-4-blocked.png`

- [ ] **Screenshot 5:** 1280x800 or 640x400 PNG
  - Help & FAQ page
  - Location: `assets/store/screenshot-5-help.png`

---

## Privacy & Permissions

### Privacy Policy URL

```
https://github.com/luongnv89/focus-paw/blob/main/PRIVACY.md
```

### Permission Justifications

| Permission                            | Justification                                                                                                                       |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `tabs`                                | Required to detect tab switches and track which domains you visit. Only the domain name is recorded, not full URLs or page content. |
| `storage`                             | Required to save your visit data, settings, and limits locally on your device. No data is synced externally.                        |
| `notifications`                       | Used to show countdown alerts when you're approaching your configured daily limits.                                                 |
| `declarativeNetRequest`               | Required to block access to websites when you exceed your self-configured daily limits.                                             |
| `declarativeNetRequestWithHostAccess` | Works with declarativeNetRequest to dynamically add blocking rules for specific domains when user-configured limits are exceeded.   |
| `host_permissions (<all_urls>)`       | Required to track domain visits across all websites. Only domain names are recorded for visit counting.                             |

### Single Purpose Description

```
FocusPaw helps users track and limit their focus-switching habits by counting domain visits and enforcing user-configured daily limits.
```

---

## Submission Checklist

### Before Submission

- [ ] Test extension thoroughly in Chrome
- [ ] Verify all features work correctly
- [ ] Test in both dark and light mode
- [ ] Test data export (JSON and CSV)
- [ ] Test limit blocking functionality
- [ ] Verify Help page loads correctly
- [ ] Check all links work (GitHub, etc.)

### Files to Include in ZIP

```
dist/
├── manifest.json
├── src/
│   ├── background/
│   ├── popup/
│   ├── dashboard/
│   ├── blocked/
│   ├── help/
│   ├── content/
│   ├── common/
│   └── vendor/
└── assets/
    ├── icon-16.png
    ├── icon-32.png
    ├── icon-48.png
    ├── icon-128.png
    ├── icon.svg
    └── icon-dark.svg
```

### Build Command

```bash
npm run build
# Creates dist/ folder ready for submission
```

### ZIP Creation

```bash
cd dist
zip -r ../focuspaw-v1.0.0.zip .
```

---

## Developer Account

### Publisher Name

```
FocusPaw Team
```

### Support Email

```
(Add your support email)
```

### Website

```
https://github.com/luongnv89/focus-paw
```

---

## Notes

1. **Review Time:** First submissions typically take 1-3 business days
2. **Privacy Review:** May take longer due to `<all_urls>` permission
3. **Updates:** After initial approval, updates are usually faster
4. **Fees:** One-time $5 developer registration fee required

---

## Post-Submission

After approval:

1. Update README.md with Chrome Web Store link
2. Add Chrome Web Store badge to repository
3. Announce release on social media / relevant communities
