# Brand Kit: FocusPaw

## Brand Overview

**Brand Name:**
FocusPaw — a playful, privacy-first focus tracker. The name keeps the friendly "companion" energy of the original brand while centering the paw as the brand mark: every step of your browsing is a step you can take with intention, one paw at a time.

**Tagline:**
"Track your focus, one paw at a time."

**Brand Mission:**
Help people reclaim their focus from digital distractions with a playful, privacy-first companion that makes self-awareness fun instead of shameful.

**Mascot Concept:**
A friendly **paw print** mascot (replacing the panda/bear). The mark is a single rounded paw print — one main pad and four toe pads — drawn in the brand palette. It represents gentle, step-by-step progress: every "focus switch" you are aware of is one step toward better habits. The mascot appears as the extension icon, block-page companion, and a recurring motif (toast, streaks, empty states). Playful, soft, minimal — no angry claws, always supportive.

**Brand Personality:**
- Playful
- Supportive
- Privacy-first
- Clever
- Minimalist

**Target Audience:**
Knowledge workers, students, freelancers, and productivity enthusiasts who struggle with social media distractions, care about their privacy, and enjoy tools that feel light-hearted rather than clinical. The paw-themed identity is deliberately warm and approachable to keep "productivity" from feeling like a punishment.

**Brand Positioning:**
FocusPaw is the **fun, local-only focus tracker** that turns your tab-switching habits into a visual, humorous experience. Unlike heavy, cloud-based productivity tools, FocusPaw requires no account, stores everything on-device, and uses humor (not guilt) to nudge you into better habits.

---

## Color Palette

> The extension UI uses the "Obsidian instrument panel" token set defined in `src/common/theme.css` (detailed spec: `phase-1-requirements/ui-refresh-spec.md`). Legacy `--color-*` names remain as aliases to these tokens.

### Surfaces (dark, default)

- **`--bg-0` `#070707`** – page background
- **`--bg-1` `#0d0d0d`** – panels, cards
- **`--bg-2` `#131313`** – raised surfaces (inputs, tiles, segmented control)
- **`--bg-3` `#1a1a1a`** – hover / active segment
- **`--line-1` `#1c1c1c`** – hairline borders
- **`--line-2` `#2a2a2a`** – strong borders (inputs, buttons)

### Ink (text)

- **`--ink-1` `#f2f2f2`** – primary text
- **`--ink-2` `#a3a3a3`** – secondary text
- **`--ink-3` `#6b6b6b`** – muted / tertiary text

### Signal Colors

- **Accent / OK:** `--accent`, `--ok` `#1bff6e` with `--accent-ink` `#062b14` (text on accent fill) and soft variants `rgba(27,255,110,.12)`
- **Warning:** `--warn` `#f5b942` (+ `--warn-soft`)
- **Error:** `--bad` `#ff5c5c` (+ `--bad-soft`)
- **Info:** `--info` `#7dd3fc`

Green is a signal color only — primary actions, active/on-track states, focus rings. Surfaces stay near-black and neutral.

### Light Mode (`body.light-mode`)

- Surfaces `--bg-0..3`: `#f6f6f4` / `#ffffff` / `#f1f1ef` / `#e9e9e6`
- Lines `--line-1/2`: `#e6e6e2` / `#d2d2cc`
- Ink `--ink-1..3`: `#141414` / `#5c5c5c` / `#8a8a8a`
- Signals: accent/ok `#0fa958` (accent-ink `#ffffff`), warn `#b7791f`, bad `#d64545`; soft variants follow the same alpha pattern.

---

### Accessibility Guidelines

- **Text on accent fill (`--accent`):** use `--accent-ink` (dark `#062b14` in dark mode, white in light mode).
- **Text on surfaces:** `--ink-1` for primary, `--ink-2` for secondary, `--ink-3` for muted/deemphasized content only.
- **Contrast Ratios:**
  - Primary text vs. backgrounds must maintain at least **4.5:1** for normal text and **3:1** for large text.
  - Buttons and CTAs must meet **3:1** contrast between text and button background.
  - Interactive elements get a visible `:focus-visible` ring in `--accent`.
  - Ensure graph node colors always have sufficient contrast with labels or provide hover tooltips with high-contrast text.

---

## Typography

### Font Families

**Primary (all UI)**
- **Stack (`--font-sans`):** `-apple-system, BlinkMacSystemFont, 'Segoe UI Variable', 'Segoe UI', Roboto, Ubuntu, 'Helvetica Neue', Arial, sans-serif`
- **Source:** system fonts only — no webfont fetches (privacy + popup load time)
- **Weights Used:** 400 (Regular), 600 (Semi-Bold)

**Monospace (`--font-mono`)**
- **Stack:** `ui-monospace, 'SF Mono', Menlo, Consolas, monospace`
- **Usage:** KPI values, timers, counters — always with tabular numerals (`.tnum` / `font-variant-numeric: tabular-nums`)

---

### Typography Scale

| Element            | Token      | Size | Weight | Notes                          |
|--------------------|------------|------|--------|--------------------------------|
| **Page title**     | `--fs-26`  | 26px | 600    | line-height 1.15               |
| **Timer / hero**   | `--fs-32`  | 32px | 600    | mono + tabular                 |
| **Stat value**     | `--fs-22`  | 22px | 600    | mono + tabular                 |
| **Section heading**| `--fs-18`  | 18px | 600    |                                |
| **Card title**     | `--fs-15`  | 15px | 600    |                                |
| **Body**           | `--fs-14`  | 14px | 400    | line-height 1.5                |
| **Compact body**   | `--fs-13`  | 13px | 400    | popup default                  |
| **Secondary**      | `--fs-12`  | 12px | 400    |                                |
| **Caps label**     | `--fs-11`  | 11px | 600    | uppercase, `--track-caps` 0.06em |

> In the Chrome popup, default body size is 13–14px for clarity in compact layouts.

---

### Typography Guidelines

- Use **H1/H2 sparingly** in the popup; most headings will be H3/H4 for spatial economy.
- Maintain **line length of 40–60 characters** in the popup and 50–75 on landing pages.
- Use **weight and color, not just size**, to express hierarchy (e.g., H4 bold vs. Body regular).
- On mobile/very small layouts (landing page), reduce H1 to 24–28px.

---

## Logo Guidelines

### Logo Variations

- **Primary Logo:**
  - Wordmark "FocusPaw" with a simple paw print icon to the left.
  - Colors: Sky Blue (`#87CEEB`) for icon, Gray 900 (`#111827`) for wordmark.

- **Secondary Logo:**
  - Horizontal lockup with paw icon + wordmark in single color (White or Gray 900) for small headers or narrow spaces.

- **Icon / Symbol:**
  - Simplified paw print in a circle using Sky Blue background and Gray 900 icon.
  - Used for Chrome extension icon, favicon, avatars.

### Logo Usage

- **Clear Space:**
  - Minimum clear space = height of the paw icon on all sides.
- **Minimum Size:**
  - Digital: 24px height for icon-only, 32px height for logo + wordmark.

- **Color Variations:**
  - Full-color logo on white / light backgrounds.
  - White logo on dark backgrounds.
  - Do not use gradients anywhere in the design system.

### Logo Don’ts

- Do not stretch, squish, or rotate the logo.
- Do not change logo colors outside the defined palette.
- Do not apply outlines, drop shadows, or glows.
- Do not place logo on low-contrast or overly busy backgrounds.
- Do not pair logo with off-brand typefaces.

---

## Iconography

**Icon Style:**
- Lucide-style outlined icons: 24×24 viewBox, 1.75px stroke, `currentColor`, round caps/joins.
- Minimal detail, easy to parse at small sizes (16px).

**Icon Set:**
- `assets/icons.svg` — a single SVG `<symbol>` sprite (ids `i-*`, e.g. `i-shield`, `i-settings`, `i-check`) referenced via `<svg class="icon"><use href=".../assets/icons.svg#i-*"/></svg>`.
- `src/common/icons.js` `svgIcon(name, {size, className, label})` builds icons via DOM APIs for JS-rendered UI (no `innerHTML`).
- Emoji are no longer used in UI chrome; the bear mascot remains on the blocked page and the popup empty state.

**Icon Sizes:**
- **Small (16px):** Inline with text (labels, tags)
- **Medium (20–24px):** Buttons, navigation, settings icon
- **Large (32px):** Empty states, feature highlights
- **XL (48px+):** Hero illustrations, block page paw icon

**Icon Guidelines:**

- Use icons to **support text, not replace it**.
- Always provide text or tooltips for critical actions.
- Maintain consistent stroke width and corner radius.
- Ensure all icon buttons have `aria-label` or visible text for accessibility.

---

## Imagery Style

### Photography Style (for landing & marketing)

- **Look & Feel:** Bright, clean, modern work/study environments.
- Natural lighting, real people, authentic setups (laptops, home offices, campuses).
- Focus on **individuals working and smiling**, showing relief from distraction.

- **Color Treatment:**
  - Slightly warm tones, moderate saturation.
  - Avoid overly stylized filters that clash with the brand palette.

### Illustration Style (for product & marketing)

- Soft, round shapes mirroring the paw mascot.
- Minimalist, flat or semi-flat style with subtle shadows.
- Use brand colors as primary fills; avoid introducing a large new palette.
- Illustrations of the paw mascot doing human tasks: working at a desk, blocking distractions, celebrating streaks.

### Image Guidelines

- Use WebP or optimized PNG/JPEG for performance.
- Avoid generic stock imagery that feels staged or cliché.
- Strive for diversity and inclusivity in human subjects.
- For the block page, prioritize **funny but kind** memes and illustrations (no shaming).

---

## Spacing & Layout

### Spacing System (8px base)

- 4px – Tight / micro spacing
- 8px – Small spacing between related elements
- 16px – Default spacing between sections
- 24px – Space around cards or components
- 32px – Large gaps between major layout groups
- 48–64px – Section spacing on landing pages

### Grid System (for website / docs)

- **Max Width:** 1200–1280px centered container
- **Columns:** 12-column grid
- **Gutter:** 24px
- **Breakpoints:**
  - Mobile: 0–640px
  - Tablet: 641–1024px
  - Desktop: 1025px+

### Layout Principles

- Popup UI: Simple, single-column layout with stacked sections (search, filters, graph, legend).
- Landing page:
  - Hero with left-aligned text and right-aligned illustration.
  - Below: benefit sections in 2–3 column layouts.
- Use whitespace aggressively to avoid feeling cramped in the popup.

---

## Component Styles

### Buttons

Four tiers, all 36px high, `--r-md` radius, 13px/600 (`.btn` / `.pill-button` in `src/common/theme.css`):

- **Primary (`.btn-primary`)** – `--accent` fill, `--accent-ink` text; commit actions (Save rule, Back to work).
- **Secondary (`.btn-secondary`)** – `--bg-2` fill, `--line-2` border, `--ink-1` text; navigation and neutral actions.
- **Ghost (`.btn-ghost`)** – transparent, `--ink-2` → `--bg-2` hover; header/toolbar actions. `.btn-icon-only` = 32px square icon button.
- **Danger (`.btn-danger`)** – transparent, `--bad` text + border → `--bad-soft` hover; destructive actions (Reset data, Delete).

### Status Pills

`.status-badge` — 11px, nowrap, soft background + matching ink: `.under-limit` (ok), `.near-limit` (warn), `.over-limit` (bad), `.no-limit` (muted `--bg-2`/`--ink-2`).

### KPI Tile

`.kpi` — `--bg-1` card, `--line-1` hairline, `--r-md`; uppercase `.eyebrow` label with 14px icon, `--font-mono` tabular value, `--ink-2` sub-line. State is signaled by value color only (`--ok`/`--warn`/`--bad`), never by the border.

### Segmented Control

`.time-filter` — `--bg-2` pill container, active segment `--bg-3` + `--shadow-1`, 12px/600 labels (Today / Week / Month).

### App Header

`.app-header` (in `src/common/shell.css`) — 56px sticky, `--bg-1`, `--line-1` hairline. Brand: 28px logo disc (light disc in dark mode, `--bg-3` disc in light mode) + "FocusPaw" wordmark + `.header-crumb` page name; `.header-actions` right-aligned ghost buttons. Shared by the dashboard, blocking rules, domain detail, and help pages.

---

### Input Fields

- Background: `--bg-2`
- Border: 1px solid `--line-1` (`--line-2` on emphasis)
- Border Radius: `--r-md`
- Padding: 10px 12px
- Placeholder: `--ink-3`
- Focus: `--accent` border + `accent-soft` ring (no glow)

**Error State:**
- Border / helper text in `--bad`, 12px caption.

---

### Cards

- Background: `--bg-1` (raised sections `--bg-2`)
- Border: 1px hairline `--line-1`
- Radius: `--r-lg` (14px); nested rows use `--r-md`
- Shadow: `--shadow-1` at most — no gradients, glows, or hover lifts
- Padding: 16–24px

Cards are used for:
- Settings blocks
- Add-rule / limit / history panels
- KPI tiles (see above).

---

### Modals / Dialogs

- Background: `--bg-1`
- Overlay: `rgba(0, 0, 0, 0.6)`
- Radius: `--r-lg`
- Max Width: 480–600px
- Padding: 24–32px
- Close Icon: top-right, 24px hit area.

---

## Brand Voice

**Tone:**
- Friendly, clever, and slightly teasing—but never mean.
- Calm and reassuring about privacy: “We’re on your side.”
- Encouraging rather than authoritarian.

**Writing Style:**

- Use **second person** (“you”) and active voice.
- Short, punchy sentences.
- Simple language; no jargon in user-facing copy.
- Use humor in low-risk areas (block page, toasts), be neutral in critical UX (errors, permissions).

### Example Phrases

- **Success Message:**
  - “Nice! Your limit is set.”
  - “Focus streak upgraded. Keep going.”

- **Warning / Soft Nudge:**
  - “You’re close to today’s limit. Future you will be proud if you stop now.”

- **Error Message:**
  - "Hmm, something broke. Try again—FocusPaw is still on your side."

- **Empty State:**
  - “No distractions tracked… yet. Either you’re a focus ninja or it’s early in the day.”

- **Block Page Copy:**
  - “That’s enough scrolling for today. Your brain says ‘thank you’.”

---

## Usage Examples

### Example 1: Landing Page Hero Section

- **Background:** White or Sky Blue (`#E0F4FF`) solid color (no gradients).
- **Heading (H1):** "Keep your focus, one paw at a time." in Gray 900.
- **Subheading (Body Large):** "FocusPaw tracks your tab hopping—locally—and nudges you back to deep work."
- **Primary CTA:** "Add to Chrome" (primary button, Sky Blue).
- **Secondary CTA:** "View the graph demo" (secondary text button).
- **Illustration:** Paw mascot at a desk, radial graph behind them.

---

### Example 2: Extension Popup – Main State

- **Background:** White.
- **Header:**
  - Left: Paw icon + "FocusPaw" in H4.
  - Right: gear icon (Settings).

- **Search Bar:** Standard input with placeholder “Search sites…”.

- **Filter Row:**
  - Dropdown (Today / 24h / Week / Month) styled as secondary button.

- **Graph:**
  - Central area with radial graph, nodes colored using primary and secondary palette.
  - Light Gray 100 background behind the graph.

- **Footer:** Small caption: “Data never leaves your browser.” in Gray 500.

---

### Example 3: Block Page

- **Background:** Light Primary (`#E0F2FF`).
- **Center Card:** White card with paw illustration.
- **Title (H2):** "You've hit your [Site] limit."
- **Body:** "Let's give your brain a break. Try again tomorrow or change your limit in FocusPaw settings."
- **Primary Button:** "Back to work" (Sky Blue).
- **Secondary Text:** Soft, playful line such as “We’ll be here if you need another nudge.”

---

## Appendix

### AI Research Insights

**Research Round 1 – Color Psychology & Industry Trends**
- Blues and purples dominate productivity and SaaS tools for trust + creativity.
- Many competitors use very sterile, corporate blues; FocusPaw differentiates with a light, airy sky blue that evokes openness and mental clarity, paired with warm supporting colors (orange and yellow).

**Research Round 2 – Typography**
- Inter is widely used in modern web apps; proven readable at small sizes and optimized for screen.
- Single-family usage (Inter for both headings and body) reduces complexity and improves performance—ideal for a solo founder.

**Research Round 3 – Brand Kits from Similar Products**
- Successful Chrome extensions use very compact type scales and strong contrast due to popup constraints.
- Playful mascots (e.g., paw prints, owls, robots) help make "productivity" feel less intimidating and more approachable.

**Research Round 4 – Accessibility Validation**
- Bright blues and purples need careful selection to pass AA contrast; Sky Blue uses dark text (Gray 900) for sufficient contrast, and Focus Purple variants were chosen with adequate contrast in mind.
- Clear color roles (primary, semantics) reduce the risk of inconsistent or inaccessible combinations.
- No gradients are used to ensure consistent contrast ratios across all UI elements.

**Research Round 5 – Holistic Review**
- Brand language, visuals, and component styles are consistent with the privacy-first, fun-but-serious-about-focus mission.
- The kit is simple enough for a solo dev to implement (Tailwind, CSS variables, or design tokens) while being extensible for future products (web dashboard, pro features).

---

### Design System Resources (Suggested)

- **Design Tool:** Figma file: `/FocusPaw/BrandSystem` (structure suggestion)
- **CSS / Tailwind Tokens:**
  - `--color-primary: #87CEEB;`
  - `--color-primary-light: #B3E0F7;`
  - `--color-primary-dark: #5DADE2;`
  - `--color-secondary: #6C5CE7;`
  - `--color-success: #55EFC4;`
  - `--color-warning: #FF9F43;`
  - `--color-error: #D63031;`
  - `--color-info: #FFDD57;`

---

### Glossary

- **Brand Identity:** Visual and verbal system that makes FocusPaw recognizable and memorable.
- **Semantic Colors:** Colors that communicate meaning (success, error, warning, info).
- **WCAG:** Web Content Accessibility Guidelines – standards to ensure web content is accessible.
- **Mascot:** Character (the paw print) representing the brand personality across UI and marketing.