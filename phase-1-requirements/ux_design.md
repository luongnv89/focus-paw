# User Experience (UX) Design Document: FocusBear

## UX Overview
- **Purpose:**
  Deliver a playful, intuitive, and privacy-first UX that helps users understand and regulate their attention across websites—without friction or cognitive load. The design must emphasize clarity, delight, and instant value within the constraints of a Chrome extension popup and MV3 architecture.

- **Scope:**
  - Popup UI (Home/Graph View)
  - Settings Panel
  - Countdown Bubbles
  - Humorous Block Page
  - Permission Prompts
  - Export Modal (future release)
  - Accessibility & Interaction Patterns

- **Alignment with PRD and GTM Strategy:**
  - **PRD:** Adheres to requirements for speed (<300ms load), WCAG 2.1 AA compliance, playful tone, and local-only privacy.
  - **GTM:** Designed for instant “wow” moments to encourage sharing (graph, block pages).
  - **Lean Canvas:** Supports the UVP: *“Fun, private, visual focus tracking—zero setup.”*

> **Dashboard Update:** The implemented MVP now opens a full-width FocusBear Dashboard tab from the browser action. The interaction patterns and controls described below remain valid, but spacing/typography specs should accommodate a desktop canvas (≈1200px) in addition to the legacy popup layout.

---

## User Personas

### Persona 1: Alex – The Distracted Freelancer
- **Demographics:** 28, freelance designer, intermediate tech skills
- **Goals:** Reduce Facebook/Twitter distractions and complete work on time
- **Pain Points:** Loses 30–90 minutes daily to unconscious tab switching
- **UX Needs:**
  - Clear immediate feedback (toast bubble, graph updates)
  - Minimal settings complexity
  - Design that sparks delight, not guilt

### Persona 2: Sam – The Procrastinating Student
- **Demographics:** 21, CS student, high proficiency
- **Goals:** Stay focused during study cycles
- **Pain Points:** Constant social media tab refreshing
- **UX Needs:**
  - Easy limit-setting
  - Strong, humorous interruptions
  - Motivational streak visualizations

### Persona 3: Taylor – The Data-Oriented Manager
- **Demographics:** 35, PM, data-savvy and privacy-conscious
- **Goals:** Understand browsing patterns; optimize deep work
- **Pain Points:** Overly complex tools that require cloud accounts
- **UX Needs:**
  - Drillable visualizations
  - Time-range filters
  - Secure, local-only storage messaging

---

## Design Principles

1. **Simplicity:**
   - Minimize required actions. No unnecessary controls.
   - Present only what’s essential in either the 400×600 popup (legacy) or the spacious dashboard canvas (primary).

2. **Delightful Micro-interactions:**
   - Friendly animations
   - Humorous block screens
   - “Bear personality” throughout UI

3. **Clarity & Visual Hierarchy:**
   - Clear domain nodes, color-coded categories
   - Intuitive labels, universal icons

4. **Privacy Before Everything:**
   - Explicit messaging: “Data never leaves your device.”
   - No login, no tracking pixels, no analytics.

5. **Accessibility:**
   - WCAG 2.1 AA
   - High-contrast theme
   - Fully keyboard navigable

---

### Dashboard Layout Considerations
- **App header (56px, sticky, `bg-1` hairline):** brand left (28px logo disc + “FocusPaw” + page crumb), Blocks / Help / Settings ghost icon buttons right. The blocking rules, domain detail, and help pages share the same header shell (`src/common/shell.css`), each with its own crumb and a “Dashboard” back action.
- **Toolbar row:** segmented Today / Week / Month filter + Compare toggle; wraps under 480px.
- **KPI strip:** four tiles (visits, unique sites, focus score, streak) across the top of the content.
- **Split view:** topology graph panel + domain table side by side (stacks vertically at ≤1200px; table keeps its own scroll region).
- **Graph stage:** legend top-left, zoom bar bottom-right, summary strip beneath the stage, compact weekly-insights cards row; the SVG scales via `viewBox` so no re-render is needed on resize.
- Keep primary content centered (~1200px) and responsive down to 375–400px for popup parity/testing.

---

## Wireframes and Mockups
*(Text descriptions; visuals created separately)*

### Screen 1: **Popup – Home / Radial Graph View**
- **Description:**
  - Header: FocusPaw logo + ghost icon buttons (Blocks, Help, Settings)
  - Sub-header: Time-filter dropdown (“Today / 24h / Week / Month”) + Refresh ghost button
  - Main Area: Interactive radial graph
    - User node at center
    - Domains orbit at radius level 1
    - Subpaths orbit at level 2 (if zoomed)
  - Search bar at top for domain filtering
  - Footer: “Data stored locally · No cloud”

- **Purpose:**
  Provide instant insight into browsing habits with minimal friction.

---

### Screen 2: **Settings Panel**
- **Description:**
  - Limit Toggles section (Facebook, Twitter, Reddit, etc.)
  - Custom domain limit entry
  - Data management: Export JSON / Reset All Data
  - Appearance: High Contrast mode toggle
  - About: Privacy statement + version number

- **Purpose:**
  Allow users to configure behavior with minimal cognitive load.

---

### Screen 3: **Countdown Bubble**
- **Description:**
  - Small pill-shaped toast near top-right of browser window
  - Message example: “Facebook: 3 visits left today”
  - Mild animation fade
  - Auto-dismiss after 3 seconds

- **Purpose:**
  Provide lightweight, non-intrusive feedback.

---

### Screen 4: **Block Page (“You’re Over the Limit”)**
- **Description:**
  - Centered card (`bg-1`, hairline border, max-width 480px) on a `bg-0` page
  - Bear mascot illustration (single settle animation on load; no looping motion)
  - Rotating supportive heading + message with limit type and domain
  - Two stat tiles (today’s visits, limit) + countdown timer to reset
  - Buttons: “Back to work” (primary) + “Adjust limits” (secondary)

- **Purpose:**
  Enforce limits while adding humor and motivation.

---

## Interaction Flows

### Flow 1: **First-Time Experience**
1. User clicks extension icon
2. Popup shows onboarding message: “Start browsing—FocusBear will track your focus.”
3. Permissions prompt (“Allow access to tabs?”)
4. Graph loads (empty state)
5. User visits distracting site → graph updates
   - **Alternative Path:** User denies permission → show retry prompt
   - **Error State:** Chrome API restricted → show fallback error

---

### Flow 2: **Setting a Daily Limit**
1. User opens popup
2. Clicks gear → Settings panel
3. Toggles “Limit Facebook” → enters number (15 visits)
4. Confirmation micro-animation
5. On visit #14 → toast warning
6. On visit #15 → Block page
   - **Alternative Path:** User disables limit during the day
   - **Error State:** Invalid number input → inline error

---

### Flow 3: **Exploring the Radial Graph**
1. User types “reddit” in search
2. Node highlights
3. User clicks node → zooms into subpages
4. User selects “Last 7 days” filter
5. Graph animates to updated state
   - **Alternative Path:** No matching node → display “No results”
   - **Error State:** Graph render timeout (rare) → fallback text list

---

### Flow 4: **Exporting Data (Future Release)**
1. User opens settings
2. Clicks “Export Graph”
3. Modal: “Save as PNG / CSV / JSON”
4. UI triggers export library
   - **Alternative Path:** Cancel export
   - **Error State:** Browser download fail → retry prompt

---

## Visual Design

### Color Scheme
- **Surfaces:** layered near-black (`--bg-0` page → `--bg-3` hover) with `--line-1/2` hairline borders; light mode inverts to warm whites (`body.light-mode`)
- **Text:** `--ink-1` primary / `--ink-2` secondary / `--ink-3` muted
- **Signal colors:** green `--accent`/`--ok` `#1bff6e` (actions, on-track), `--warn` amber (nearing limit), `--bad` red (limit exceeded), `--info` blue — each with a soft background variant
- Full token list: `src/common/theme.css`; spec: `phase-1-requirements/ui-refresh-spec.md`

### Typography
- **Font:** system stack only (`-apple-system`, Segoe UI, Roboto…); `ui-monospace` for numbers
- **Scale:** 11 / 12 / 13 / 14 / 15 / 18 / 22 / 26 / 32px (`--fs-*` tokens)
- KPI values, timers, and counts use tabular numerals

### Icons & Imagery
- Bear mascot: playful, friendly (blocked page + popup empty state only)
- Graph nodes: soft-round shapes, muted category palette
- Icons: `assets/icons.svg` stroke sprite (24px viewBox, 1.75 stroke, `currentColor`) — no emoji in UI chrome

### Design System Components
- Buttons (primary, secondary, ghost)
- Toasts
- Pills / Tags
- Graph nodes
- Toggle switches
- Input fields

---

## Accessibility

- **Compliance:** WCAG 2.1 AA
- **Requirements:**
  - Full keyboard navigation in popup
  - ARIA labels for graph elements
  - Minimum 4.5:1 contrast ratio
  - Reduced motion mode (OS preference detection)
  - Accessible block-page messaging

---

## Content Strategy

- **Tone:** Playful, empathetic, humorous
- **Voice:** Friendly bear companion
- **Key Messages:**
  - “Stay focused, human.”
  - “Your data never leaves your device.”
  - “You’re stronger than the scroll.”

- **Content Types:**
  - Microcopy (toasts, tooltips)
  - Error messages
  - Empty states (“No distractions detected—nice!”)
  - Block pages (humor + motivation)

---

## Responsive Design

- **Supported Devices:** Desktop only
- **Popup Fixed Size:** 400×600px
- **Block Page:** Responsive to browser window
- **Adaptations:**
  - Graph nodes reflow based on available space
  - Settings panel scrolls on smaller screens

---

## Testing and Validation

### Usability Testing Plan
- 5 rapid tests with real users
- Focus on:
  - Graph clarity
  - Limit-setting discoverability
  - Block-page delight

### A/B Tests
- Test block page variants (humor intensity)
- Test color for countdown bubble
- Test graph animation speed

### Tools
- Chrome DevTools Lighthouse
- Figma for prototypes
- User feedback via GitHub Issues

### Validation Metrics
- Time-to-first-insight (<5 seconds)
- Limit-setting completion rate (>80%)
- User comprehension (“What does this graph mean?”)

---

## Risks and Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Graph too complex | Confuses users | Provide simplified “List View” fallback |
| Block page annoyance | High uninstall rate | Add “Disable humor” toggle |
| Accessibility gaps | Excludes users | Conduct manual WCAG audits |
| Popup too dense | Cognitive load | Progressive disclosure controls |

---

## Appendix

### AI Research Insights

**Round 1 – Persona Validation (2025-11-14)**
- Chrome extension reviews show users strongly prefer *instant insight* and minimal onboarding.
- Productivity extension users dislike nagging; humor increases feature adoption.

**Round 2 – Competitor UI Analysis**
- RescueTime dashboards too dense → FocusBear’s graph must stay simple.
- StayFocusd’s block pages are effective but unfriendly → humor provides differentiation.

**Round 3 – Accessibility & Responsive Standards**
- WCAG best practices emphasize keyboard navigation for extensions.
- Many Chrome popup UIs fail contrast → FocusBear must exceed minimums.

**Round 4 – UX Risk Assessment**
- Graph visualizations often overwhelm novices → include onboarding tooltip.
- Users complain when settings are deeply nested → keep 1-click access.

**Round 5 – Holistic UX Review**
- UX aligns with PRD, Lean Canvas, and brand strategy.
- Touchpoints optimized for delight, speed, and privacy messaging.

---

### Glossary
- **Radial Graph:** A circular hierarchical visualization of browsing activity
- **Focus Visit:** Each user-initiated return to a distracting tab
- **Countdown Bubble:** Toast showing remaining daily visits
- **Block Page:** Humorous screen shown when daily limit exceeds
