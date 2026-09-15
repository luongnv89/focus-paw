# FocusPaw UI Refresh — "Obsidian instrument panel" (design spec)

Direction approved 2026-09-15. Refined dark UI: layered near-black surfaces, hairline borders
instead of glows/shadows, green used **only** as signal (active state, on-track, focus ring,
one primary action per page). System font stack with a proper type scale and tabular numerals.
Inline SVG icons replace all emoji in UI chrome. One shared header shell for every page.

Non-negotiables: privacy-first (no web fonts, no CDN), MV3 CSP (no inline event handlers),
WCAG AA contrast, visible `:focus-visible`, `prefers-reduced-motion` respected, no `innerHTML`
with dynamic content, all existing element IDs used by JS preserved.

---

## 1. Tokens — `src/common/theme.css`

Loaded **first** by every page (`popup.html`, `dashboard/*.html`, `help/help.html`,
`blocked/blocked.html`). Per-page `:root { … }` blocks are deleted (popup.css, help.css,
blocked.css). Legacy `--color-*` names are kept as aliases so untouched CSS keeps working.

```css
:root {
  /* Surfaces (dark, default) */
  --bg-0: #070707;  /* page */
  --bg-1: #0d0d0d;  /* panel / card */
  --bg-2: #131313;  /* raised: inputs, tiles, segmented control */
  --bg-3: #1a1a1a;  /* hover / active segment */
  --line-1: #1c1c1c; /* hairline */
  --line-2: #2a2a2a; /* strong border (inputs, buttons) */

  /* Ink */
  --ink-1: #f2f2f2;
  --ink-2: #a3a3a3;
  --ink-3: #6b6b6b;

  /* Signal */
  --accent: #1bff6e;
  --accent-ink: #062b14;                 /* text on accent fill */
  --accent-soft: rgba(27, 255, 110, 0.12);
  --ok: #1bff6e;   --ok-soft: rgba(27, 255, 110, 0.12);
  --warn: #f5b942; --warn-soft: rgba(245, 185, 66, 0.14);
  --bad: #ff5c5c;  --bad-soft: rgba(255, 92, 92, 0.14);
  --info: #7dd3fc;

  /* Type */
  --font-sans: -apple-system, BlinkMacSystemFont, 'Segoe UI Variable', 'Segoe UI', Roboto,
    Ubuntu, 'Helvetica Neue', Arial, sans-serif;
  --font-mono: ui-monospace, 'SF Mono', Menlo, Consolas, monospace;
  --fs-11: 11px; --fs-12: 12px; --fs-13: 13px; --fs-14: 14px; --fs-15: 15px;
  --fs-18: 18px; --fs-22: 22px; --fs-26: 26px; --fs-32: 32px;
  --lh-tight: 1.2; --lh-body: 1.5;
  --track-caps: 0.06em;                  /* uppercase labels */

  /* Shape / space / depth / motion */
  --r-sm: 6px; --r-md: 10px; --r-lg: 14px; --r-pill: 999px;
  --sp-1: 4px; --sp-2: 8px; --sp-3: 12px; --sp-4: 16px; --sp-5: 20px; --sp-6: 24px; --sp-8: 32px;
  --shadow-1: 0 1px 2px rgba(0, 0, 0, 0.5);
  --shadow-2: 0 8px 24px rgba(0, 0, 0, 0.45);
  --dur: 160ms;
  --ease: cubic-bezier(0.2, 0.7, 0.2, 1);

  /* Legacy aliases (keep until every file is migrated) */
  --color-primary: var(--accent);
  --color-primary-light: var(--bg-3);
  --color-primary-lighter: var(--line-1);
  --color-primary-dark: var(--bg-2);
  --color-secondary: var(--line-2);
  --color-secondary-light: var(--ink-3);
  --color-secondary-dark: var(--bg-3);
  --color-success: var(--ok);
  --color-warning: var(--warn);
  --color-error: var(--bad);
  --color-info: var(--info);
  --color-text-dark: var(--ink-1);
  --color-text-muted: var(--ink-2);
  --color-border: var(--line-1);
  --color-border-light: var(--line-2);
  --color-card: var(--bg-1);
  --color-surface: var(--bg-0);
  --color-background: var(--bg-0);
}

body.light-mode {
  --bg-0: #f6f6f4; --bg-1: #ffffff; --bg-2: #f1f1ef; --bg-3: #e9e9e6;
  --line-1: #e6e6e2; --line-2: #d2d2cc;
  --ink-1: #141414; --ink-2: #5c5c5c; --ink-3: #8a8a8a;
  --accent: #0fa958; --accent-ink: #ffffff; --accent-soft: rgba(15, 169, 88, 0.12);
  --ok: #0fa958; --ok-soft: rgba(15, 169, 88, 0.12);
  --warn: #b7791f; --warn-soft: rgba(183, 121, 31, 0.14);
  --bad: #d64545; --bad-soft: rgba(214, 69, 69, 0.12);
  --shadow-1: 0 1px 2px rgba(0, 0, 0, 0.08);
  --shadow-2: 0 8px 24px rgba(0, 0, 0, 0.10);
}
```

Base rules in theme.css:

```css
*, *::before, *::after { box-sizing: border-box; }
body { margin: 0; font-family: var(--font-sans); font-size: var(--fs-14); line-height: var(--lh-body);
       color: var(--ink-1); background: var(--bg-0); -webkit-font-smoothing: antialiased; }
:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; border-radius: var(--r-sm); }
:focus:not(:focus-visible) { outline: none; }
.tnum { font-variant-numeric: tabular-nums; }
.eyebrow { font-size: var(--fs-11); font-weight: 600; letter-spacing: var(--track-caps);
           text-transform: uppercase; color: var(--ink-2); }
@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation: none !important; transition: none !important; } }
```

Buttons (shared; **keep existing class names** since JS/HTML reference them):

| Class | Look |
|---|---|
| `.btn`, `.pill-button` | inline-flex, gap 8, h 36, padding 0 14, r-md, fs-13/600, transition `background var(--dur) var(--ease), border-color, color` — **no transform, no glow** |
| `.btn-primary`, `.pill-button-primary`, `.save-btn` | bg `--accent`, color `--accent-ink`, border 1px `--accent`; hover: filter brightness(1.06) |
| `.btn-secondary`, `.pill-button-secondary`, `.icon-button` | bg `--bg-2`, color `--ink-1`, border 1px `--line-2`; hover bg `--bg-3` |
| `.btn-ghost` | transparent, color `--ink-2`, border transparent; hover bg `--bg-2`, color `--ink-1` |
| `.btn-danger`, `.pill-button-danger` | transparent, color `--bad`, border 1px rgba(255,92,92,.4); hover bg `--bad-soft` |
| `.btn-icon-only` | 32×32, padding 0, r-md |

Icon sizing inside buttons: `.btn svg, .pill-button svg { width: 16px; height: 16px; }`.

Inputs / selects: bg `--bg-2`, border 1px `--line-2`, r-md, h 36, padding 0 12, color `--ink-1`,
fs-13; focus border `--accent` (plus the global ring). Placeholder `--ink-3`.

Segmented control (time filter): container `.time-filter` bg `--bg-2`, border 1px `--line-1`,
r-pill, padding 3; `.time-filter-btn` transparent, color `--ink-2`, fs-12/600, padding 6 12,
r-pill; `.active` bg `--bg-3`, color `--ink-1`, shadow-1.

Toggle (`.toggle-switch`, `.table-toggle`): track 40×22 bg `--line-2`, knob 18px `#ffffff`;
checked track `--accent`.

Status pills `.status-badge`: inline-flex, gap 6, h 22, padding 0 8, r-pill, fs-11/600, with a
6px dot (`::before`) — `.under-limit` dot/text `--ok`, bg `--ok-soft`; `.near-limit` `--warn`/`--warn-soft`;
`.over-limit` `--bad`/`--bad-soft`; `.no-limit` **no bg, no border, no dot**, color `--ink-3`.

Cards / panels: bg `--bg-1`, border 1px `--line-1`, r-lg, no drop shadow (use shadow-2 **only**
for floating layers: toasts, legend overlay, zoom bar). No hover-lift on cards.

Motion: hovers `var(--dur) var(--ease)`; one page-load stagger on the KPI tiles + panels
(`@keyframes rise` 0→1 opacity, 6px translateY, 240ms, `animation-delay` 0/40/80/120ms).
**Delete** the infinite `flicker`, `sparkle`, `wave` animations.

---

## 2. Icons — `assets/icons.svg` sprite + `src/common/icons.js`

`assets/icons.svg`: one `<symbol id="i-<name>" viewBox="0 0 24 24" fill="none"
stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">`
per icon. Names (Lucide-style geometry, hand-authored, no dependency):

`shield, help-circle, settings, chart-bar, flame, target, globe, mouse-pointer-click, arrow-left,
arrow-right, search, zoom-in, zoom-out, maximize, x, download, braces, table, eye, contrast,
trash, alert-triangle, lock, sparkles, trophy, info, chevron-down, check, pause, play, pencil, sun,
moon, refresh-cw, clock, ban, lightbulb`.

HTML usage (pages are all two levels deep under `src/`):

```html
<svg class="icon" aria-hidden="true"><use href="../../assets/icons.svg#i-shield"></use></svg>
```

`src/common/icons.js`:

```js
const SPRITE = '../../assets/icons.svg';
/** Build an inline <svg><use> icon via DOM APIs (no innerHTML). */
export function svgIcon(name, { size = 16, className = 'icon', label } = {}) { /* returns SVGElement */ }
```
Sets `aria-hidden="true"` unless `label` given (then `role="img"` + `aria-label`).
Used by dashboard.js / blocking.js / visualization-page.js wherever they currently write emoji
into `textContent` (🏆 badge, 🚫, ✅, etc.).

`.icon { width: 16px; height: 16px; flex-shrink: 0; }` in theme.css.

Verify `scripts/build.js` copies `assets/` so `../../assets/icons.svg` resolves inside `dist/`.

---

## 3. Dashboard (`src/dashboard/index.html` + `dashboard.css`) — Phase 1

### 3.1 Shell

```
.app-header  (sticky, h 56, bg --bg-1, border-bottom --line-1, padding 0 24, flex, space-between)
  .header-brand#dashboard-home-trigger   [logo 28px] "FocusPaw" fs-15/600 · <span class="header-crumb">Dashboard</span> fs-13 --ink-2
  .header-actions                          a#blocking-btn.btn.btn-ghost [shield] Blocks · a#help-btn.btn.btn-ghost [help-circle] Help · button#settings-btn.btn.btn-ghost [settings] Settings
.toolbar     (bg --bg-0, padding 12 24, border-bottom --line-1, flex, space-between, wrap)
  .time-filter[role=tablist]  (unchanged IDs/attrs)
  label.comparison-toggle  → styled like a single segmented button with [chart-bar] "Compare"; checked = bg --bg-3, color --ink-1, border --line-2 (keep #comparison-toggle-input)
.kpi-strip#stats-summary   (grid repeat(4, minmax(0,1fr)), gap 12, padding 16 24)
  .kpi  (bg --bg-1, border --line-1, r-md, padding 14 16, min-h 84)
     .kpi-label.eyebrow  [icon 14px --ink-3] "Domains" | "Visits" | "Day streak" | "Focus score"
     .kpi-value.tnum  fs-26/600 --ink-1 lh 1.1   → contains existing <strong id="total-domains"> etc.
     .kpi-sub fs-12 --ink-2 ("in selected period" / "in selected period" / "within all limits" / "today, out of 100")
```
Preserve these IDs exactly (JS uses them): `total-domains`, `total-visits`, `current-streak`,
`focus-score`, `streak-stat` (wrapper `.kpi` of the streak tile), `focus-score-stat` (wrapper
`.kpi` of the score tile), `stats-summary`. Check `dashboard.js` ~L1051–1110 for the classes it
toggles on `#streak-stat` / `#focus-score-stat` and `#score-celebration` and keep those selectors
styled (celebration: a brief accent ring pulse on the tile, 600ms, once).

Remove: 9px `.stat-label`s, `.streak-icon`/`.focus-score-icon` emoji and their infinite
animations, `style="text-decoration:none"` inline attributes.

### 3.2 Main split

`.view-container` grid `minmax(0, 1.1fr) minmax(0, 1fr)`, gap 0, panels bg `--bg-1` separated by
a `--line-1` vertical border; `.panel-header` h 48, padding 0 20, flex space-between, border-bottom
`--line-1`, **no gradient**; `h3` fs-14/600 `--ink-1`. **Delete** `.panel-subtitle` copy
("Interactive visualization…"). Table panel header holds `#table-search` (with [search] icon inside
an `.input-with-icon` wrapper) and `#table-sort`.

### 3.3 Graph stage

```
.graph-stage  (position relative, flex 1, min-h 0)
  #graph-container.graph-container  (position absolute, inset 0, padding 0)  ← D3 wipes its innerHTML, so overlays MUST be siblings
  .graph-legend#graph-legend  (absolute top 12 right 12, bg --bg-1 @ 92% + backdrop-blur 8, border --line-1, r-md, padding 10 12, shadow-2, fs-11)
      .legend-title.eyebrow "Status"
      4 × .legend-item  [.legend-ring 12px circle, 2px ring in --ok/--warn/--bad/--line-2] label ("On track", "Near limit", "Over limit", "No limit")
      .legend-foot fs-11 --ink-3 "Bubble size = visits"   (keep <span id="legend-hint-text">)
  .graph-zoom  (absolute bottom 12 right 12, flex, bg --bg-1 @ 92%, border --line-1, r-md, overflow hidden)
      button#zoom-out.btn.btn-ghost.btn-icon-only [zoom-out] aria-label="Zoom out"
      button#zoom-reset.btn.btn-ghost  → <span id="zoom-level" class="tnum">100%</span> title="Reset zoom"
      button#zoom-in.btn.btn-ghost.btn-icon-only [zoom-in] aria-label="Zoom in"
```
Remove the category legend + 💡 hint + old zoom text from the overlay.

`.graph-summary#graph-summary` stays below the stage as a quiet footer: bg `--bg-1`, border-top
`--line-1`, 2px left rule `--accent`, padding 12 20, fs-13 `--ink-2`; `.summary-warning` → `--warn`,
`.summary-success` → `--ok`.

`.insights-banner` restyle with tokens (no gradient); close button uses [x] icon.

### 3.4 Zoom API (`src/popup/graph.js` + `src/common/visualization-page.js`)

`renderRadialGraph` keeps returning the cleanup **function** (callers/tests unchanged) but the
function gets methods attached:

```js
const cleanup = () => { if (simulation) simulation.stop(); tooltip.remove(); backBtn.remove(); };
cleanup.zoomIn    = () => svg.transition().duration(160).call(zoomBehavior.scaleBy, 1.25);
cleanup.zoomOut   = () => svg.transition().duration(160).call(zoomBehavior.scaleBy, 0.8);
cleanup.resetZoom = () => svg.transition().duration(200).call(zoomBehavior.transform, d3.zoomIdentity);
return cleanup;
```
`.on('zoom', …)` additionally calls `options.onZoomChange?.(event.transform.k)`.

In `visualization-page.js`: add `bindZoomControls(ctx)` called **once** during setup — binds
`#zoom-in/#zoom-out/#zoom-reset` (if present) to `ctx.cleanupGraph?.zoomIn()` etc. Pass
`onZoomChange: (k) => { const el = document.getElementById('zoom-level'); if (el) el.textContent = `${Math.round(k * 100)}%`; }`
in the `renderRadialGraph` options at ~L528.

Unit test to add (`tests/graph.test.js`): after `renderRadialGraph(...)` with the existing d3
mock, `expect(typeof result.zoomIn).toBe('function')` and same for `zoomOut`, `resetZoom`.
Extend the d3 mock's `zoom()` return (`scaleExtent`, `on`, `scaleBy`, `transform`) if needed.

### 3.5 Table

- `.data-table` `border-collapse: collapse; border-spacing: 0; margin: 0;` — **delete** the floating
  row look (`border-spacing 0 8px`, row shadows, radius, `translateY` hover).
- `th`: fs-11/600 uppercase `--ink-2` tracking `--track-caps`, padding 10 16, sticky top 0,
  bg `--bg-1`, border-bottom 1px `--line-1`. Sort indicator = [chevron-down] icon 12px, rotated
  180° for asc, `--ink-3` → `--ink-1` when sorted.
- `td`: fs-13, padding 12 16, border-bottom 1px `--line-1`, vertical-align middle.
- `tbody tr:hover td { background: var(--bg-2); }` — no transform.
- Alignment: Website left · Visits right (`.tnum`) · Change right · Last visit left `--ink-2` ·
  Limit left · Status right. Remove the `nth-child` centring block (it targets 7 columns; HTML has 6).
- Header text: "Times Opened" → **"Visits"**; "Last Visit" → "Last visit".
- `.domain-link`: `--ink-1` 500; hover `--accent`, underline offset 3px.
- Category header row (`.category-header-row td`): bg `--bg-0`, fs-11 eyebrow, padding 8 16,
  dot 8px. **Move every inline style in `renderTableRows` into classes**: `.domain-content`,
  `.limit-meter` (`.limit-meter-label`, `.limit-meter-bar` 96×4 r-pill bg `--line-2`,
  `.limit-meter-fill` — width still via `style.width`; colour via class `is-ok|is-warn|is-bad`
  instead of `getStatusColor` inline background), `.is-blocked` label → `--bad` 600 with [ban]
  icon 12px instead of 🚫. Fix `colSpan` 5 → 6. Remove the dead `var(--color-text-primary)` /
  `var(--color-bg-subtle)` references.
- Trophy badge `🏆` → `svgIcon('trophy', { size: 14 })` with `--warn` colour, keep `title`.
- "Unlimited" limit text → "—" with `title="No limit set"`, `--ink-3`.
- `.table-pagination`: bg `--bg-1`, border-top `--line-1`, padding 8 16, fs-12; prev/next are
  `.btn.btn-ghost.btn-icon-only` with arrow icons; `.pagination-size` styled like inputs, h 28.
- `.table-empty`: fs-13 `--ink-2`, no bg.

### 3.6 Settings panel (`#settings-view`)

Keep IDs and structure. `.settings-header`: back button `.pill-button.pill-button-secondary`
[arrow-left] "Back"; title fs-22/600; replace "CONTROL CENTER" eyebrow with nothing (title +
subtitle only). `.settings-card` tokens (no hover lift); `.card-icon` 40×40 bg `--bg-2` border
`--line-1` r-md holding an SVG icon (`eye` / `download` / `alert-triangle` with `--bad`). Export
buttons: `.export-btn` bg `--bg-2` border `--line-2`, icon boxes `[braces]`, `[table]`; hover border
`--accent` (no translateX). `.info-banner` [lock] icon; `.danger-warning` tokens `--bad-soft`/`--bad`;
reset button `.pill-button.pill-button-danger` [trash] "Reset all focus data". Rename
"Color Blind Mode" → **"High contrast"** (label text only; keep `#color-blind-mode`).

### 3.7 States, footer

- Loading skeleton: tokens only. Empty state: replace 🐻👋 with the logo `<img>` 56px;
  step icons → `[mouse-pointer-click] [chart-bar] [target] [lock]`; demo button `.btn.btn-primary` [sparkles].
- Error state: [alert-triangle] `--bad`; buttons `.btn.btn-primary` [refresh-cw] / `.btn.btn-secondary` [help-circle].
- Footer: fs-12 `--ink-3`, version in `--font-mono` chip bg `--bg-2`; 🔒 → [lock] icon 12px.

### 3.8 Responsive

- ≤1200: `.view-container` single column (graph 48vh, then table); `.kpi-strip` 2×2.
- ≤768: header action labels hidden (`.btn-ghost .label { display: none }`), toolbar wraps,
  KPI strip 2×2, table `overflow-x: auto`, Limit column hidden
  (`.data-table th:nth-child(5), .data-table td:nth-child(5) { display: none }`).
- 375 / 768 / 1280 / 1440 must have **no horizontal overflow**.

---

## 4. Phase 2 (after Phase 1 review) — blocking, domain, help, blocked, popup

Same `.app-header` shell on `blocking.html`, `domain.html`, `help.html`:
brand (logo + "FocusPaw" + crumb with page name) · right side `.pill-button.pill-button-secondary`
[arrow-left] "Dashboard". Move `blocking.html` inline `<style>` → `src/dashboard/blocking.css`.
Page bodies get `.page` container max-w 880, padding 32 24. Hero titles fs-26/600, no gradient
text. Rule cards, history items, stat cards → token styles; action icons via sprite
([pause]/[play], [pencil], [trash]). `blocked.html`: keep the bear emoji as the single
illustrative element (brand mascot) but tokens + system stack; primary action `.btn-primary`,
secondary `.btn-secondary`. Popup: tokens already flow through aliases; tidy `#settings-btn` /
`#refresh-btn` to `.btn-ghost`.
