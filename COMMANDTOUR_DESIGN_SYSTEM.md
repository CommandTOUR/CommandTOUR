# CommandTOUR Design System
**Last verified: July 11, 2026 — locked against live code (post side-nav redesign)**

Drop this file into every new Claude Code session. All values here are ground truth.
Do not deviate without explicit instruction from Mark.

This redesign is **in progress**. The Dashboard (`/`) and the app shell
(`app/layout.js`, `components/SideNav.js`, `app/globals.css` tokens) are on the
new system. Every other page still renders the old `TopNav` and old tokens —
see Section 13 for exactly which pages and what that looks like right now.

---

## 1. Stack & Tooling

- **Framework:** Next.js (App Router)
- **Styling:** Pure CSS variables + inline styles — no Tailwind
- **Database:** Supabase (PostgreSQL + Storage + Auth)
- **Icons:** `@tabler/icons-react` components — no CSS icon-font, no other icon library
- **Font:** Inter (`next/font/google`, CSS var `--font-inter`) on the new shell.
  Plus Jakarta Sans still renders on every page not yet migrated (it's loaded
  via `@import` in `globals.css` and hardcoded into legacy utility classes
  `.btn-primary`, `.btn-ghost`, `.form-input`, `.sched-input`) — don't remove
  that `@import` until the last page migrates.
- **Deployment:** Vercel
- **Repo:** github.com/CommandTOUR/CommandTOUR

---

## 2. Color Tokens (`app/globals.css`)

Tokens flipped from dark-first to **light-first**. `:root` is now the light
palette; dark mode requires an explicit `data-theme="dark"` attribute (the
opposite of the old scheme, where `:root` was dark and `[data-theme="light"]`
was the override).

### Light Mode (`:root` default)
```css
--page-bg: #e8e8e5;
--surface-nav: #ffffff;
--surface-card: #ffffff;
--surface-raised: #f5f5f3;
--surface-input: #f5f5f3;
--border-default: rgba(0,0,0,0.08);
--border-strong: rgba(0,0,0,0.14);
--border-stronger: rgba(0,0,0,0.22);
--text-primary: #1a1a1a;
--text-secondary: #555555;
--text-muted: #999999;
--text-disabled: #cccccc;
--accent: #10a060;
--accent-bg: #eaf7f0;
--accent-border: #a3dfc0;
--accent-text: #0a7a46;
--color-danger: #c0392b;
--color-warning: #b07a00;
--color-success: #0a7a46;
--color-info: #1a56db;
--radius-sm: 5px; --radius: 8px; --radius-lg: 10px; --radius-card: 10px;
```

### Dark Mode (`[data-theme="dark"]`)
```css
--page-bg: #111111;
--surface-nav: #1c1c1c;
--surface-card: #1e1e1e;
--surface-raised: #252525;
--surface-input: #252525;
--border-default: rgba(255,255,255,0.07);
--border-strong: rgba(255,255,255,0.12);
--border-stronger: rgba(255,255,255,0.20);
--text-primary: #f2f2f2;
--text-secondary: #888888;
--text-muted: #555555;
--text-disabled: #333333;
--accent: #10E687;
--accent-bg: rgba(16,230,135,0.1);
--accent-border: rgba(16,230,135,0.3);
--accent-text: #10E687;
--color-danger: #FF453A;
--color-warning: #FFD60A;
--color-success: #10E687;
--color-info: #0A84FF;
```

**Legacy tokens removed:** `--bg`, `--bg-card`, `--bg-card-hover`, `--bg-header`,
`--bg-input`, `--border-card`, `--border-input`, `--border-subtle`,
`--glass-border`, `--color-mint*`, `--color-yellow*`, `--color-orange*`,
`--color-red*`, `--color-purple*`, `--color-gray*`, `--card-glass-*`,
`--nav-width`, `--topbar-height` no longer exist. Any un-migrated page/class
still referencing them will render with missing colors until it's converted —
this is expected, not a bug to chase per-page.

---

## 3. "Yellow" Rule — Never Violate

- **UI yellow** (buttons, badges, highlights): `#FFD60A` — this is system yellow
  (now `--color-warning` / `--status-1hold-text` in dark mode)
- **HWMTL Gold** (`#C9A84C`): exclusively the HWMTL tour identifier color, never used as a general UI color
- These two values must never be confused or swapped

---

## 4. Six Event Statuses

Exact database strings (case-sensitive). No other values are valid.

| DB value | Display label | Token prefix | Dark text | Light text | Light bg |
|---|---|---|---|---|---|
| `confirmed` | Confirmed | `--status-confirmed-*` | `#33FF99` | `#0a7a46` | `#eaf7f0` |
| `1-hold` | 1-Hold | `--status-1hold-*` | `#FFD60A` | `#8a5a00` | `#fef3e2` |
| `2-hold` | 2-Hold | `--status-2hold-*` | `#FF9F0A` | `#8a3a00` | `#fde8d8` |
| `3-hold` | 3+ Hold | `--status-3hold-*` | `#FF375F` | `#8a0020` | `#fde8ed` |
| `tentative` | Tentative | `--status-tentative-*` | `#BF5AF2` | `#6a30a0` | `#f0e8fc` |
| `date-hold` | Date Hold | `--status-datehold-*` | `#888888` | `#555555` | `#f0f0f0` |

Each prefix has `-text`, `-bg`, `-border` variants. Render with the shared
`.status-pill` utility class (`globals.css`): `border-radius: 4px`,
`border: 0.5px solid`, `font-weight: 600`, `font-size: 10px` — set
`color`/`background`/`borderColor` inline from the token trio above.

---

## 5. Card Treatment (flat, new system)

Glass/blur cards are gone on migrated pages. New recipe:
```css
background: var(--surface-card);
border: 0.5px solid var(--border-default);
border-radius: var(--radius-card);
```
No `backdrop-filter`, no glass shadow, no glass-highlight inset. Colored accent
bars (e.g. a tour-color strip) are still an absolutely-positioned child `<div>`
inside a `position: relative; overflow: hidden` container — same reasoning as
before (avoid conflicting border/backdrop declarations), just no backdrop-filter
to conflict with anymore.

`.glass-card` (the shared utility class) has been repointed at these new
tokens/recipe, so any un-migrated page still using `className="glass-card"`
automatically gets the new flat look — it's the per-page *inline-styled*
backdrop-filter cards (most of them) that still look like the old glass system
until converted.

---

## 6. SideNav (`components/SideNav.js`) — replaces TopNav

- Fixed-width (200px) column, not a fixed/floating overlay — lives inside the
  `app/layout.js` flex shell alongside `<main>`, so there's no `marginTop`
  offset needed on page content anymore (that was a TopNav-era hack).
- Three sections: **Operations** (Dashboard, Tours, Calendar, Staff),
  **Logistics** (Venues, Booking), **Finance** (Budget, Reports).
- Icons are `@tabler/icons-react` components (`IconLayoutDashboard`, `IconRoute`,
  etc.) sized 14px — not a CSS icon-font. There is no Tabler CDN link anywhere
  in the project.
- Active state: `pathname === item.href` for `/`, else
  `pathname === item.href || pathname.startsWith(item.href)`.
- Theme toggle lives in the nav footer (sun/moon `@tabler/icons-react` icon,
  next to the user avatar and settings gear). Toggling calls
  `document.documentElement.setAttribute('data-theme', next)` +
  `localStorage.setItem('theme', next)` — always sets an explicit value,
  it never removes the attribute (unlike the old TopNav toggle, which relied on
  the *absence* of the attribute meaning dark — that no longer works since
  `:root` is light now).
- **`SideNav` renders `null` on `pathname === '/login'`.** The login page has
  never had any nav and is a standalone full-screen card; without this
  exception the layout-level SideNav would show up next to it.
- Theme-init script lives in `app/layout.js`'s `<head>` (not at the end of
  `<body>`) specifically to avoid a flash-of-wrong-theme before first paint:
  `localStorage.getItem('theme') || 'light'` → `setAttribute('data-theme', …)`.

`components/TopNav.js` still exists on disk and is still actively rendered —
see Section 13. It is not dead code.

---

## 7. `/tours` List Page Tile Cards (old system, unmigrated)

`app/tours/page.js` still uses the pre-redesign tile recipe below. The
Dashboard no longer uses this pattern (see Section 8) — `components/TourTiles.js`
and `components/ThisWeek.js` are now **orphaned** (not imported anywhere) but
kept on disk.

### Card container
```css
border: 2.5px solid {tourColor};   /* uniform all 4 sides */
border-radius: 12px;
backdrop-filter: blur(8px) saturate(1.3);   /* legacy — will look broken, --bg-card etc. no longer exist */
overflow: hidden;
position: relative;
padding: 14px 16px;
```
Text hierarchy, stats, progress bar, next-event mini-tile, and the
`.tile-sub1` / `.tile-sub2` / `.tile-next-event-text` classes are unchanged
from before — see git history prior to July 11, 2026 for the last known-good
screenshot. Don't invest in fixing this page's colors ad hoc; it gets the full
flat-card/token treatment when its turn comes.

---

## 8. Dashboard (`/`) — current, new system

- **Topbar:** plain flex row, no card background. Left: "Dashboard" (18px/700).
  Right: live clock, ticking every second — `SAT, JUL 11, 2026 · 6:26:21 PM`,
  date in `var(--text-secondary)`, time in `var(--accent)` (600 weight,
  `fontVariantNumeric: 'tabular-nums'`). `now` state is null-initialized and
  set in a `useEffect` for hydration safety.
- **Stat strip:** 4 cards — Active tours (domestic/intl split), Events this
  week, Unconfirmed staff, Holds expiring (14-day window). Value color flips
  to `--color-warning`/`--color-danger` when the count is meaningful, else
  `--color-success`/`--text-primary`.
- **This week row:** up to 4 event cards (city via `formatLocation`, load-in/out
  date range, tour name in tour color); empty state; a 4th "+N more" overflow
  card when more than 4 events exist that week.
- **Active tours tile:** scrollable list of *rows*, not a tile grid — logo (or
  color-tinted initials) → color bar → name/region/director + mini progress
  bar → total/done/left → next event → status pill. Row click navigates to
  `/tours/{id}`.
- **Needs attention tile:** derived alerts (unconfirmed-staff count,
  hold-events expiring soon, a static travel placeholder) with icon box +
  title + body + optional action link; "All clear" state with a green check
  when empty.
- **Budget tile:** placeholder — tour names + `$—` + 0%-fill progress bars,
  "Finance module coming soon" note. No real data source yet.
- No hardcoded colors anywhere except `tour.color` (from DB) — including status
  pill and icon-box colors, which map to the CSS custom properties in Section 2
  even where a mockup showed a literal hex (the hex values were chosen to match
  existing tokens exactly).

---

## 9. Location Formatting (`lib/locationFormat.js`)

Always use `formatLocation()` — never build city/state/country strings manually.

| mode | US/Canada | International |
|---|---|---|
| compact | City, ST | City, Country |
| full | City, ST, Country | City, Country |

All event queries must select `city, state, country`.

---

## 10. Database Schema (key columns)

**tours table:**
`id, name, tour_type, type, region, year, color, status, logo_url,
director_name, tour_category, notes`
- `tour_type` = short code (e.g. `hwss`, `hwmt`); `type` = its display label
  (e.g. "Hot Wheels Stunt Show") — both exist, set together from the same dropdown.
- `region` = free-text descriptive string (e.g. "North America"), display-only.
- `tour_category` = `domestic` / `international` / `uncategorized` — this is
  what actually drives any domestic-vs-international split, not `region`.
- `director_name` is the real column (not `director_id` — corrected from a
  prior version of this doc).

**events table:**
`id, tour_id, city, state, country, venue_name, venue_id, load_in_date,
load_out_date, status, num_shows, saturday_date, sunday_date`
- `tour.color` is always a full 7-char `#RRGGBB` hex string
- Event `status` must always be one of the six canonical values (Section 4)

**staff_assignments table:**
`id, tour_position_id, slot_index, staff_id, event_id, status, confirmed,
notes, travel_in_date, travel_out_date`
- `status` is a free string (`pending`, etc.), independent of the boolean
  `confirmed` column — dashboard "unconfirmed staff" counts rows where
  `confirmed = false AND status = 'pending' AND staff_id IS NOT NULL`.

---

## 11. Tour Logo System

- Supabase Storage bucket: `tour-logos` (public)
- Column: `logo_url` (text, nullable) on tours table
- Filename pattern: `{tourId}-{timestamp}.{ext}` (no subfolder)
- Upload UI: Edit Tour form (`app/tours/[id]/edit/page.js`)
- Display: Tour Detail header, tour tiles/rows
- No CSS filter — render as-is in both modes

---

## 12. Hard Rules — Never Violate

1. **Inter is the sitewide font going forward** — every newly-migrated page
   uses it via `--font-inter`. Un-migrated pages keep Plus Jakarta Sans until
   converted; don't mix fonts within a single page.
2. **No hardcoded hex** except tour-identity colors from DB and the legacy
   `/tours`-page tile subtext overrides (`#B8C2CC`, `#8B96A8`, `#4A5250`,
   Section 7) until that page migrates.
3. **No colored border on `backdrop-filter` elements** — only still relevant to
   un-migrated pages (Section 7); the new flat-card system (Section 5) has no
   `backdrop-filter` at all.
4. **`formatLocation()` always** — never build location strings manually.
5. **Six event statuses only** — exact DB strings, exact display labels per Section 4.
6. **Diagnose before fixing** — read-only diagnostic first when something is broken.
7. **One file scope per prompt** when possible — "don't touch anything else" is non-negotiable.
8. **Screenshot verify** after every visual change before moving to next task.
9. **`#FFD60A` for UI yellow** — never use `#C9A84C` (HWMTL Gold) as a general UI color.
10. **Mock before coding** any layout or design decision.
11. **No transitions on color** — theme switching must be instant, no fade.
    (Known pre-existing inconsistency: `globals.css` still has a blanket
    `*, *::before, *::after { transition: background-color 300ms ease, … }`
    rule that predates this rule being written down — not yet removed.)
12. **Native scrollbars only** — no `::-webkit-scrollbar`, `scrollbar-width`,
    or `scrollbar-color` rules anywhere.
13. **Legacy TopNav must fully occlude scrolled content** — `.topnav-backdrop`
    (`globals.css`) still backs `components/TopNav.js` wherever it's still
    rendered (Section 13). SideNav has no equivalent need (it's laid out in
    normal flow, not fixed/floating), so this rule doesn't apply to it.
14. **Token default is now light** — `:root` = light palette,
    `[data-theme="dark"]` = override (flipped from the pre-July-11 scheme).
    Any new code that assumes "no attribute = dark" is wrong.
15. **`SideNav` is nav-less on `/login`** — don't add a nav to the login page;
    `SideNav` already special-cases this (Section 6).

---

## 13. Page Inventory

### New system (Inter, SideNav via layout, flat tokens)
- `app/layout.js` — shell, Inter font, theme-init script
- `components/SideNav.js`
- `app/globals.css` — token system (Section 2)
- Dashboard (`/`)

### Old system — still render their own `<TopNav>` inline
Because `SideNav` now wraps every route at the layout level, **these pages
currently show SideNav *and* their own inline TopNav at the same time** — a
real double-nav visual bug, not just "unstyled." Fix arrives when each page is
migrated (drop the `TopNav` import/render, adopt Section 2 tokens + Section 5
cards):
- `/tours`, `/tours/new`, `/tours/[id]`, `/tours/[id]/edit`
- `/tours/[id]/events/new`, `/tours/[id]/events/[eventId]`,
  `/tours/[id]/events/[eventId]/edit`
- `/staff`, `/staff/new`, `/staff/[staffId]`, `/staff/[staffId]/edit`, `/staff/settings`
- `/calendar`, `/venues`, `/venues/new`, `/venues/[venueId]`, `/venues/[venueId]/edit`
- `/bc`, `/reports`, `/settings`, `/staffing-grid`

### Orphaned files (kept on disk, no longer imported)
- `components/TourTiles.js`
- `components/ThisWeek.js`

### Exception — no nav at all
- `/login` — never had one; `SideNav` explicitly returns `null` there (Section 6).
