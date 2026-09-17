# Privacy Policy

> Markdown alternate of the FocusPaw privacy policy for agent clients.
> Canonical page: https://focus-paw.luongnv.com/privacy (HTML). This file is
> the `text/markdown` representation advertised via
> `<link rel="alternate" type="text/markdown" href="/privacy/index.md">`.

Last Updated: September 16, 2026

## Overview

FocusPaw is a privacy-first Chrome extension designed to help you track and improve your browsing focus habits. We are committed to protecting your privacy and being transparent about our data practices.

**The short version: Visit tracking stays on your device. We don't collect accounts or analytics. Optional Map location lookup is off by default and is disclosed below.**

## What We Collect

FocusPaw collects the following data **locally on your device only**:

- **Domain visit counts:** The number of times you switch to each website domain (e.g., "twitter.com: 5 visits")
- **Visit timestamps:** When you visited each domain (used for time-based filtering)
- **User preferences:** Your settings, limits, and configuration choices

## What We Do NOT Collect

- Page content or text you read
- Form inputs or passwords
- Personal identifying information
- URLs beyond the domain level
- Browsing history in Incognito/Private mode
- Data from Chrome internal pages (chrome://, chrome-extension://)
- Time spent on individual pages

## Data Storage

All data is stored **locally** using Chrome's built-in `chrome.storage.local` API. This means:

- Visit counts and settings never leave your device
- No cloud sync or backup services are used
- No third-party analytics or tracking
- The Map view loads OpenStreetMap tiles when you open the Map tab
- Optional hostname geolocation (off by default) is described under Third-Party Services

## Data Usage

Your locally stored data is used exclusively to:

1. Display your browsing patterns in the dashboard
2. Calculate your focus score and streaks
3. Enforce daily visit limits you configure
4. Show statistics and insights about your habits

## Data Sharing

**We do not share your data with anyone.** Since all data is stored locally and never transmitted, there is no data to share.

## Data Retention

Your data is retained locally until you choose to delete it. You can:

- **Export your data:** Download your data in JSON or CSV format anytime
- **Delete specific domains:** Remove individual domain data from the dashboard
- **Delete all data:** Use the "Reset All Focus Data" option in Settings
- **Uninstall the extension:** This removes all extension data from your browser

## Permissions Explained

FocusPaw requests the following Chrome permissions:

| Permission | Why We Need It |
|------------|----------------|
| `tabs` | To detect when you switch between websites and track domain visits |
| `storage` | To save your visit data, settings, and limits locally |
| `notifications` | To show countdown alerts when approaching your limits |
| `declarativeNetRequest` | To block access to sites when daily limits are exceeded |
| `declarativeNetRequestWithHostAccess` | To dynamically add blocking rules for specific domains |
| `host_permissions (<all_urls>)` | Required to track visits across all websites you browse |

## Third-Party Services

FocusPaw does not use analytics or advertising networks.

**Map tiles:** when you open the Map tab, the dashboard loads standard map images from the OpenStreetMap tile service (`tile.openstreetmap.org`) so Leaflet can render the world. These are ordinary HTTPS image fetches (your IP is visible to the tile servers, as with any map on the web). No visit counts or domain lists are sent with tile requests. Attribution is shown on the map per the OpenStreetMap tile usage policy.

**Optional location lookup (off by default):** if you enable "Look up website locations" in Settings, the extension may request optional host access to resolve tracked hostnames via Cloudflare DNS-over-HTTPS (`https://cloudflare-dns.com/dns-query`, `application/dns-json`) and then look up the resulting IP at `https://ipwho.is/{ip}` over HTTPS to estimate where a site is hosted. Hostnames are never sent as the ipwho.is path. Responses are cached locally for about 7 days, with a size cap. You can clear that cache from the Map view. Device GPS / the Chrome `geolocation` permission are not used.

## Children's Privacy

FocusPaw does not knowingly collect information from children under 13. The extension is intended for general audiences who want to improve their browsing habits.

## Open Source

FocusPaw is open source. You can review our code at any time:

**Repository:** [https://github.com/luongnv89/focus-paw](https://github.com/luongnv89/focus-paw)

## Changes to This Policy

If we make changes to this privacy policy, we will update the "Last Updated" date and notify users through the extension update notes.

## Contact

If you have questions about this privacy policy or FocusPaw's data practices:

- **GitHub Issues:** [https://github.com/luongnv89/focus-paw/issues](https://github.com/luongnv89/focus-paw/issues)
- **Repository:** [https://github.com/luongnv89/focus-paw](https://github.com/luongnv89/focus-paw)

## Summary

| Question | Answer |
|----------|--------|
| Do you collect personal data? | No |
| Do you send data to servers? | OSM map tiles when you open Map; Cloudflare DNS + ipwho.is only if you opt in |
| Do you use analytics? | No |
| Do you sell data? | No |
| Can I delete my data? | Yes, anytime |
| Can I export my data? | Yes, JSON or CSV |
| Is the code open source? | Yes |

---

**FocusPaw** — Track your focus, privacy-first.
