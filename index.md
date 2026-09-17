# FocusPaw — Track Your Focus, Master Your Time

> Markdown alternate of the FocusPaw landing page for agent clients.
> Canonical page: https://focus-paw.luongnv.com/ (HTML). This file is the
> `text/markdown` representation advertised via
> `<link rel="alternate" type="text/markdown" href="/index.md">`.

FocusPaw is a privacy-first Chrome extension that helps you understand your
browsing habits through beautiful visualizations. All data stays on your
device. Now with React 19, Manifest V3, and enhanced privacy.

## Everything You Need to Stay Focused

Powerful features designed to help you understand and improve your focus
habits.

- **Privacy-First, Local-Only Data** — Visit counts stay on your device. No
  cloud sync and no analytics. Map location lookups are optional, off by
  default, and use a named HTTPS provider.
- **Visual Graph Dashboard** — Interactive D3.js visualization shows your
  focus patterns over time with beautiful, intuitive graphs that make data
  easy to understand.
- **Interactive Map View** — Open a Map tab on the dashboard to explore tracked
  sites on OpenStreetMap. Pins appear only after an optional HTTPS lookup;
  device GPS is never used.
- **Customizable Site Limits** — Set daily limits for distracting websites and
  get notified when you approach them. Take control of your browsing time.
- **Focus Score & Streaks** — Track your productivity with daily focus scores
  and build streaks to stay motivated. Watch your focus improve over time.
- **Security & Privacy Hardened** — Manifest V3 migration, XSS protection, CSV
  formula injection fixes, and no analytics. Visit data stays local; Map
  lookups are opt-in only.

## See FocusPaw in Action

- Dashboard with interactive focus graph (`/screenshots/dashboard.png`)
- Explore tracked sites on an interactive map (`/screenshots/dashboard-map.png`)
- Manage your site blocking rules (`/screenshots/set-block-rules.png`)
- Customize your focus tracking preferences (`/screenshots/settings.png`)
- Comprehensive help documentation (`/screenshots/help-faq.png`)

## Install

- [Get FocusPaw from the Chrome Web Store](https://chromewebstore.google.com/detail/focusbear-focus-tracker/hlhhifmjlgekgchkaemeldfhcgcajcoe) —
  free
- [Source code on GitHub](https://github.com/luongnv89/focus-paw) — MIT license
- [Privacy policy](/privacy) (HTML) ·
  [privacy/index.md](/privacy/index.md) (markdown)

## Machine-readable resources

| Resource                  | URL                                        |
| ------------------------- | ------------------------------------------ |
| ARD manifest              | `/.well-known/ai-catalog.json`             |
| A2A agent card            | `/.well-known/agent-card.json`             |
| Agent skills index        | `/.well-known/agent-skills/index.json`     |
| MCP server card           | `/.well-known/mcp/server-card.json`        |
| API catalog (RFC 9727)    | `/.well-known/api-catalog`                 |
| OpenAPI description       | `/.well-known/openapi.json`                |
| Agent registration guide  | `/auth.md`                                 |
| llms.txt                  | `/llms.txt`                                |
| Sitemap                   | `/sitemap.xml`                             |
| Portable response headers | `/_headers` (Netlify/Cloudflare Pages)     |

Content signals (see `/robots.txt`): `ai-train=no, search=yes, ai-input=no`.

---

**FocusPaw** — Track your focus, privacy-first.
