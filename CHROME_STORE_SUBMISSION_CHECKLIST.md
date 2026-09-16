# Chrome Web Store Submission Checklist — FocusPaw v1.0.0

## ✅ Pre-Submission Verification

### Build & Code Quality

- [x] All tests pass (281/281)
- [x] Lint/format checks green
- [x] Build produces clean dist/ folder
- [x] Manifest v3 compliant
- [x] Icons present (16, 32, 48, 128 PNG)
- [x] ZIP created: `focuspaw-v1.0.0.zip` (338KB)

### Manifest.json Verification

- [x] `manifest_version`: 3
- [x] `name`: "FocusPaw - Focus Tracker"
- [x] `version`: "1.0.0"
- [x] `description`: Present and under 132 chars for short description
- [x] `icons`: All sizes present (16, 32, 48, 128)
- [x] `action`: Configured with default icon and title
- [x] `background`: Service worker configured
- [x] `content_security_policy`: Present
- [x] `homepage_url`: https://github.com/luongnv89/focus-paw

### Privacy & Permissions

- [x] Privacy policy URL: https://github.com/luongnv89/focus-paw/blob/main/PRIVACY.md
- [x] All permissions justified (tabs, storage, notifications, declarativeNetRequest)
- [x] Single purpose description prepared
- [x] No unnecessary permissions

---

## 📋 Required Store Assets

### Icons (Required)

| Size    | File                  | Status   |
| ------- | --------------------- | -------- |
| 16x16   | `assets/icon-16.png`  | ✅ Ready |
| 32x32   | `assets/icon-32.png`  | ✅ Ready |
| 48x48   | `assets/icon-48.png`  | ✅ Ready |
| 128x128 | `assets/icon-128.png` | ✅ Ready |

### Promotional Images (Optional but Recommended)

| Type             | Size     | Status                  | Action                             |
| ---------------- | -------- | ----------------------- | ---------------------------------- |
| Store Icon       | 128x128  | ✅ Use icon-128.png     | Ready                              |
| Small Promo Tile | 440x280  | ✅ Ready                | `cws-submission/promo/promo-small-440x280.png` |
| Large Promo Tile | 920x680  | ⚠️ Create               | Dashboard screenshot               |
| Marquee Promo    | 1400x560 | ✅ Ready                | `cws-submission/promo/promo-marquee-1400x560.png` |

### Screenshots (Required: 1-5 images)

Use screenshots from `landing-page/public/screenshots/` (v1.0.1 refresh):

| #   | Content                     | Source File            | Status   |
| --- | --------------------------- | ---------------------- | -------- |
| 1   | Dashboard with radial graph | `dashboard.png`        | ✅ Ready |
| 2   | Map view with location pins | `dashboard-map.png`    | ✅ Ready |
| 3   | Blocking rules              | `set-block-rules.png`  | ✅ Ready |
| 4   | Settings page               | `settings.png`         | ✅ Ready |
| 5   | Help & FAQ                  | `help-faq.png`         | ✅ Ready |

**Screenshot dimensions:** All screenshots are ~1280x800, which meets the requirement.

---

## 📝 Store Listing Content

### Basic Information

- **Extension Name:** FocusPaw - Focus Tracker
- **Category:** Productivity
- **Language:** English
- **Publisher:** FocusPaw Team

### Descriptions

- **Short Description (132 chars max):**

  ```
  Track focus-switching habits with privacy-first visualizations. Set limits, build streaks, improve productivity.
  ```

- **Detailed Description:** See `STORE_LISTING.md` for full content

### Privacy Policy

- **URL:** https://github.com/luongnv89/focus-paw/blob/main/PRIVACY.md
- **Content:** Comprehensive privacy policy covering all data practices

---

## 🚀 Submission Steps

### 1. Prepare Developer Account

- [ ] Create/Log in to [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
- [ ] Pay one-time $5 registration fee (if first time)
- [ ] Complete developer profile

### 2. Create New Extension

- [ ] Click "New item"
- [ ] Upload `focuspaw-v1.0.0.zip`
- [ ] Fill in all required fields

### 3. Upload Assets

- [ ] Upload icons (16, 32, 48, 128)
- [ ] Upload promotional images (optional)
- [ ] Upload screenshots (1-5 images)

### 4. Fill Details

- [ ] Extension name
- [ ] Category
- [ ] Short description
- [ ] Detailed description
- [ ] Privacy policy URL
- [ ] Support email
- [ ] Website URL

### 5. Review Permissions

- [ ] Review all requested permissions
- [ ] Add permission justifications
- [ ] Add single purpose description

### 6. Submit for Review

- [ ] Review all information
- [ ] Click "Submit for review"
- [ ] Wait for approval (typically 1-3 days)

---

## 🔍 Post-Submission

### After Approval

- [ ] Verify extension appears in store
- [ ] Test installation from store
- [ ] Verify all features work after installation
- [ ] Monitor initial user feedback

### Ongoing Maintenance

- [ ] Set up version bumping for updates
- [ ] Monitor reviews and ratings
- [ ] Plan regular updates (security, features)
- [ ] Keep privacy policy updated

---

## 📦 File Locations Summary

```
focus-bear/
├── focuspaw-v1.0.0.zip          # Submission ZIP (338KB)
├── dist/                        # Built extension
│   ├── manifest.json
│   ├── assets/
│   │   ├── icon-16.png
│   │   ├── icon-32.png
│   │   ├── icon-48.png
│   │   └── icon-128.png
│   └── src/                     # All extension source files
├── landing-page/public/screenshots/  # Store screenshots
│   ├── dashboard.png
│   ├── dashboard-reddit.png
│   ├── settings.png
│   ├── set-block.png
│   └── Help-FAQ.png
├── STORE_LISTING.md             # Full store listing content
└── PRIVACY.md                   # Privacy policy
```

---

## ⚠️ Important Notes

1. **Repository URL:** All references now point to `github.com/luongnv89/focus-paw`
2. **Brand Name:** Extension is "FocusPaw" (not FocusBear)
3. **Privacy-First:** No data leaves the device — emphasize this in listing
4. **Open Source:** Link to GitHub repository in listing
5. **Support Email:** Add your support email before submission

---

## 🎯 Ready to Submit?

When you're ready, follow the steps above. The ZIP file `focuspaw-v1.0.0.zip` is ready for upload.

**Estimated submission time:** 30-45 minutes
**Review time:** 1-3 business days
