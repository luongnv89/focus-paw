<div align="center">
  <img src="assets/icon.svg" alt="FocusPaw Logo" width="128" height="128">

# FocusPaw

### Track your focus, one paw at a time

A playful, privacy-first Chrome extension that helps you track focus-switching habits through beautiful D3.js visualizations.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-yellow.svg)](https://www.google.com/chrome/)
[![Privacy First](https://img.shields.io/badge/Privacy-100%25%20Local-green.svg)](#privacy)
[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](manifest.json)

</div>

---

## What is FocusPaw?

FocusPaw helps you understand and improve your browsing habits by tracking how often you switch between websites. Unlike time trackers, FocusPaw focuses on **attention switches** — each time you navigate to a different domain counts as a "focus switch."

**Key insight:** Frequent context-switching is one of the biggest productivity killers. FocusPaw helps you see the pattern and build better habits.

## Features

- **Interactive Dashboard** — D3.js radial graph of attention patterns, plus a dashboard Map tab with a bundled world atlas
- **Optional site locations** — Opt-in HTTPS lookup (off by default) to place tracked domains on the Map; default Map path is offline
- **Focus Score** — Daily 0-100 score based on limit compliance, visit reduction, and streaks
- **Streaks** — Track consecutive days of staying within your limits
- **Site Limits** — Set daily visit limits for distracting websites
- **Block Page** — Friendly reminder when you exceed limits
- **Time Filters** — View data by today, week, or month
- **Dark/Light Mode** — Easy on the eyes, day or night
- **Data Export** — Download your data as JSON or CSV anytime
- **100% Private** — All data stays on your device, always

## Installation

### From Chrome Web Store (Coming Soon)

<!-- [Install FocusPaw](https://chrome.google.com/webstore/detail/focusbear/YOUR_EXTENSION_ID) -->

### Manual Installation (Developer Mode)

1. Download or clone this repository

   ```bash
   git clone https://github.com/luongnv89/focus-paw.git
   cd focus-paw
   npm install
   npm run build
   ```

2. Open Chrome and go to `chrome://extensions/`

3. Enable **Developer mode** (toggle in top right)

4. Click **Load unpacked**

5. Select the `dist/` folder (or project root)

6. Click the FocusPaw icon in your toolbar to start!

## How It Works

1. **Browse normally** — FocusPaw quietly tracks domain switches in the background
2. **Open the dashboard** — Click the toolbar icon for the radial graph, table, and Map tab
3. **Set limits** — Configure daily limits for distracting sites
4. **Build streaks** — Stay under limits to build consecutive day streaks
5. **Improve focus** — Watch your focus score improve over time

## Screenshots

<div align="center">
  <p><em>Dashboard with attention visualization</em></p>
  <!-- Add screenshots here -->
  <!-- <img src="docs/screenshots/dashboard.png" width="600" alt="Dashboard"> -->
</div>

## Privacy

**Visit tracking is 100% local.** Counts stay in Chrome storage on your device.

- ✅ Visit data stored locally in Chrome's storage
- ✅ No analytics, telemetry, or third-party favicons, fonts, or images
- ✅ No account required
- ✅ Map atlas is bundled (no tile servers); optional site-location lookup is **off by default**
- ✅ Open source — verify yourself

If you enable **Look up website locations** in Settings, the extension may use Cloudflare DNS-over-HTTPS and ipwho.is over HTTPS to estimate where a tracked site is hosted. Clear that cache from the Map view. Device GPS is not used. Details: Help in the extension, or the [hosted privacy policy](https://luongnv89.github.io/focus-paw/privacy/).

Read the full [Privacy Policy](https://luongnv89.github.io/focus-paw/privacy/).

## Key Concepts

### Focus Score (0-100)

Your daily focus score is calculated from:

- **Limits Compliance (40%)** — Staying within your set limits
- **Visit Reduction (30%)** — Reducing visits vs. previous week
- **Streak Bonus (20%)** — Longer streaks = higher contribution
- **Domain Focus (10%)** — Fewer unique sites = better focus

### Streaks

Consecutive days where you stayed within ALL your configured limits. Exceed any limit and the streak resets to 0.

## Development

### Prerequisites

- Node.js 22+ (LTS) and npm — see `engines.node` in `package.json` and `.nvmrc`
- Chrome browser (version 100+)

### Setup

```bash
# Install dependencies
npm install

# Development mode (watch for changes)
npm run dev

# Build for production
npm run build

# Run tests
npm run test

# Lint and format
npm run lint
npm run format
```

### Project Structure

```
focus-paw/
├── src/
│   ├── background/     # Service worker (tracking, limits)
│   ├── popup/          # Popup styles
│   ├── dashboard/      # Main dashboard UI
│   ├── blocked/        # Block page
│   ├── help/           # Help & FAQ page
│   └── content/        # Content scripts (toast notifications)
├── assets/             # Icons and images
├── scripts/            # Build scripts
├── tests/              # Jest tests
├── manifest.json       # Chrome extension manifest (MV3)
└── package.json
```

### Code Quality

- **ESLint** — Code linting
- **Prettier** — Code formatting
- **Jest** — Unit testing
- **Husky** — Pre-commit hooks
- **GitHub Actions** — CI/CD pipeline

## Tech Stack

- **Frontend:** Vanilla JavaScript (ES modules), D3.js v7, HTML5, CSS3
- **Storage:** Chrome Storage API (local)
- **APIs:** Chrome Tabs, Notifications, DeclarativeNetRequest
- **Build:** Node.js, ESLint, Prettier, Jest
- **CI/CD:** GitHub Actions

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Support

- **Bug Reports:** [GitHub Issues](https://github.com/luongnv89/focus-paw/issues)
- **Feature Requests:** [GitHub Issues](https://github.com/luongnv89/focus-paw/issues)
- **Help & FAQ:** Available in the extension's Help page

## License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- D3.js for beautiful data visualizations
- The Chrome Extensions team for Manifest V3
- All contributors and users who help improve FocusPaw

---

<div align="center">
  <strong>FocusPaw</strong> — Track your focus, privacy-first 🐻
  <br><br>
  <a href="https://github.com/luongnv89/focus-paw">GitHub</a> •
  <a href="PRIVACY.md">Privacy Policy</a> •
  <a href="LICENSE">License</a>
</div>

---

## Landing Page

The FocusPaw landing page is hosted on GitHub Pages at:

**https://focus-paw.luongnv.com**

The Privacy Policy is available at:

**https://focus-paw.luongnv.com/privacy**

To rebuild and deploy:

```bash
cd landing-page
npm run build
# Deploy to gh-pages branch
npx gh-pages -d dist
```
