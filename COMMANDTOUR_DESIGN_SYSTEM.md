# CommandTOUR Design System

**Rebuilt from scratch, verified against live code, 2026-07-15** — this version
supersedes all prior copies of this file. Every value below was read directly
out of `app/globals.css`, `components/SideNav.js`, `app/page.js`, and
`app/layout.js` (plus `lib/locationFormat.js` for Section 8). Do not deviate
from these values without explicit instruction from Mark.

This redesign is **in progress**. The Dashboard (`/`) and the app shell
(`app/layout.js`, `components/SideNav.js`, `app/globals.css` tokens) are on
the new system. Every other page still renders the old `TopNav` and old
tokens — see Section 12 for exactly which pages and what that looks like
right now.

---

## 1. Stack & Tooling

- **Framework:** Next.js (App Router)
- **Styling:** Pure CSS variables + inline styles — no Tailwind
- **Database:** Supabase (PostgreSQL + Storage + Auth)
- **Icons:** `@tabler/icons-react` components only — no CSS icon-font, no
  Tabler CDN link anywhere in the project
- **Font:** Inter (`next/font/google`, loaded in `app/layout.js`, exposed as
  CSS var `--font-inter`, applied to `html, body` in `globals.css`). This is
  the sitewide font on migrated pages (shell + Dashboard).
  Plus Jakarta Sans is still `@import`-ed at the top of `globals.css` and is
  hardcoded into the legacy utility classes `.btn-primary`, `.btn-ghost`,
  `.form-input`, `.sched-input` — those classes still render Jakarta Sans
  regardless of theme/page. Don't remove that `@import` until every page
  migrates and those classes are retired.
- **Deployment:** Vercel
- **Repo:** github.com/CommandTOUR/CommandTOUR

---

## 2. CSS Token Values (`app/globals.css`)

`:root` is the **light** palette (default, no attribute needed).
`[data-theme="dark"]` is an explicit override attribute set on `<html>`.
There is no `[data-theme="light"]` token block for Section 2 purposes — light
values live directly in `:root`. (A large block of `[data-theme="light"]`
*rules*, as opposed to *tokens*, does still exist further down the file —
see the "Legacy light-mode override rules" note at the end of this section.)

### Light Mode — `:root`

```css
/* Page */
--page-bg: #edeef0;
--page-bg-dark: #111111;   /* defined but not referenced by any component — vestigial */

/* Surfaces */
--surface-nav: #ffffff;
--surface-card: #ffffff;
--surface-raised: #f5f5f3;
--surface-input: #f5f5f3;

/* Borders */
--border-default: rgba(0,0,0,0.08);
--border-strong: rgba(0,0,0,0.14);
--border-stronger: rgba(0,0,0,0.22);

/* Text */
--text-primary: #1a1a1a;
--text-secondary: #555555;
--text-muted: #999999;
--text-disabled: #cccccc;

/* Brand */
--accent: #10a060;
--accent-bg: #eaf7f0;
--accent-border: #a3dfc0;
--accent-text: #0a7a46;

/* Status colors — light mode */
--status-confirmed-text: #0a7a46;
--status-confirmed-bg: #eaf7f0;
--status-confirmed-border: #a3dfc0;
--status-1hold-text: #8a5a00;
--status-1hold-bg: #fef3e2;
--status-1hold-border: #f5c842;
--status-2hold-text: #8a3a00;
--status-2hold-bg: #fde8d8;
--status-2hold-border: #f5a442;
--status-3hold-text: #8a0020;
--status-3hold-bg: #fde8ed;
--status-3hold-border: #f5426a;
--status-tentative-text: #6a30a0;
--status-tentative-bg: #f0e8fc;
--status-tentative-border: #c090f0;
--status-datehold-text: #555555;
--status-datehold-bg: #f0f0f0;
--status-datehold-border: #cccccc;

/* Semantic */
--color-danger: #c0392b;
--color-warning: #c48a00;   /* changed from #b07a00 same day as this doc */
--color-success: #0a7a46;
--color-info: #1a56db;

/* Spacing */
--radius-sm: 5px;
--radius: 8px;
--radius-lg: 10px;
--radius-card: 10px;

/* Glass tile (water-on-glass — Dashboard only, see Section 5) */
--glass-tile-bg: rgba(255, 255, 255, 0.72);
--glass-tile-border: rgba(255, 255, 255, 0.6);
--glass-tile-highlight: rgba(255, 255, 255, 0.85);   /* defined, currently unused in JS — see Section 5 */
--glass-tile-shadow: 0 2px 8px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.85);
```

### Dark Mode — `[data-theme="dark"]`

```css
--page-bg: #1e2130;
--surface-nav: #191c28;
--surface-card: #0d0d0f;
--surface-raised: #252525;
--surface-input: #252525;

--border-default: rgba(255,255,255,0.07);
--border-strong: rgba(255,255,255,0.12);
--border-stronger: rgba(255,255,255,0.20);

--text-primary: #f2f2f2;
--text-secondary: #a8a8a8;
--text-muted: #707070;
--text-disabled: #333333;

--glass-tile-bg: rgba(0, 0, 0, 0.55);
--glass-tile-border: rgba(255, 255, 255, 0.07);
--glass-tile-highlight: rgba(255, 255, 255, 0.05);
--glass-tile-shadow: 0 2px 12px rgba(0,0,0,0.5), 0 1px 3px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05);

--accent: #10E687;
--accent-bg: rgba(16,230,135,0.1);
--accent-border: rgba(16,230,135,0.3);
--accent-text: #10E687;

--status-confirmed-text: #33FF99;
--status-confirmed-bg: rgba(51,255,153,0.1);
--status-confirmed-border: rgba(51,255,153,0.3);
--status-1hold-text: #FFD60A;
--status-1hold-bg: rgba(255,214,10,0.1);
--status-1hold-border: rgba(255,214,10,0.3);
--status-2hold-text: #FF9F0A;
--status-2hold-bg: rgba(255,159,10,0.1);
--status-2hold-border: rgba(255,159,10,0.3);
--status-3hold-text: #FF375F;
--status-3hold-bg: rgba(255,55,95,0.1);
--status-3hold-border: rgba(255,55,95,0.3);
--status-tentative-text: #BF5AF2;
--status-tentative-bg: rgba(191,90,242,0.1);
--status-tentative-border: rgba(191,90,242,0.3);
--status-datehold-text: #888888;
--status-datehold-bg: rgba(255,255,255,0.05);
--status-datehold-border: rgba(255,255,255,0.15);

--color-danger: #FF453A;
--color-warning: #FFD60A;
--color-success: #10E687;
--color-info: #0A84FF;
```

Dark mode does **not** redefine `--radius-*` or `--page-bg-dark` — those fall
through from `:root` (radii are theme-invariant by design; `--page-bg-dark`
is unused either way).

**Legacy tokens removed and no longer defined anywhere:** `--bg`, `--bg-card`,
`--bg-card-hover`, `--bg-header`, `--bg-input`, `--bg-shell`, `--border-card`,
`--border-input`, `--border-subtle`, `--glass-border`, `--color-mint*`,
`--color-yellow*`, `--color-orange*`, `--color-red*`, `--color-purple*`,
`--color-gray*`, `--nav-width`, `--topbar-height`. **These tokens are still
referenced** by the legacy utility classes lower in `globals.css`
(`.btn-primary`, `.btn-ghost`, `.pill*`, `.badge*`, `.form-input`,
`.sched-input`, `.topnav-backdrop`) and by the large `[data-theme="light"]`
override block described below — those rules currently resolve to nothing /
`unset` for those properties. This is expected breakage on unmigrated pages,
not a bug to chase per-page; it clears up as each page migrates off these
classes.

**Legacy light-mode override rules:** `globals.css` also contains a large
block of `[data-theme="light"] ...` selectors (tables, `.glass-card`,
inputs, `[style*="color: #94a3b8"]` attribute-selector hacks, etc.) dating
from the pre-flip token scheme, plus `.tile-sub1` / `.tile-sub2` /
`.tile-next-event-text` (hardcoded `#B8C2CC` / `#8B96A8` / dark, `#4A5250`
light — feeds the legacy `/tours` list tiles, Section 5) and
`.topnav-backdrop` (feeds `components/TopNav.js`, Section 12). None of this
touches the Dashboard or SideNav. Leave it alone until the page(s) it backs
are migrated.

---

## 3. Color Rules — Never Violate

- **UI/system yellow**: `#FFD60A` — this is `--color-warning` /
  `--status-1hold-text` in **dark mode only** (light mode's warning/1-hold
  colors are darker ochre tones per Section 2, not `#FFD60A` itself). It is
  also hardcoded directly (not token-driven) in the Dashboard's "Needs
  Attention" section-header icon (`app/page.js`, the layered
  `IconAlertTriangleFilled` behind `IconAlertTriangle`) — a sanctioned
  exception, see Section 11.
- **HWMTL Gold** (`#C9A84C`): exclusively the HWMTL tour identifier color
  (comes from `tours.color` in the database for that one tour), never used
  as a general UI color.
- These two values must never be confused or swapped.

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

Each prefix has `-text`, `-bg`, `-border` variants (see full values in
Section 2). Render with the shared `.status-pill` utility class
(`globals.css`): `display: inline-block; font-size: 10px; font-weight: 600;
padding: 2px 7px; border-radius: 4px; border: 0.5px solid; white-space:
nowrap` — set `color` / `background` / `border-color` inline from the token
trio above. `.status-pill` itself is theme-invariant; only the inline token
values change per theme.

---

## 5. Card / Tile Treatment — three coexisting systems

There are currently **three** distinct "card" recipes live in the codebase.
Do not cross-apply tokens between them.

### 5a. Flat card (current shared default — `.glass-card` class)

```css
background: var(--surface-card);
border: 0.5px solid var(--border-default);
border-radius: var(--radius-card);
color: var(--text-primary);
```

No `backdrop-filter`, no shadow, no inset highlight. This is what the
`.glass-card` utility class in `globals.css` now compiles to — the class
name is legacy (pre-dates the flip to flat tokens) but the recipe is flat.
Any un-migrated page/component still using `className="glass-card"`
automatically gets this look.

### 5b. Water-on-glass tile (Dashboard only — `GLASS_CARD` object in `app/page.js`)

```js
const GLASS_CARD = {
  background: 'var(--glass-tile-bg)',
  backdropFilter: 'blur(12px) saturate(1.4)',
  border: '0.5px solid var(--glass-tile-border)',
  borderRadius: 14,
  boxShadow: 'var(--glass-tile-shadow)',
}
```

This is a **local JS object in `app/page.js`**, not a shared CSS class —
every Dashboard tile (stat strip, This Week cards, Active Tours rows, Needs
Attention alerts, Budget Overview rows) spreads `...GLASS_CARD` into its
inline `style`. It is backed by the `--glass-tile-*` tokens (Section 2),
which are the **only** tokens with real light/dark blur-appropriate values
(translucent white in light, translucent black in dark) — this is the
"water-on-glass" look from the July 11 redesign commits. Note
`--glass-tile-highlight` is defined in both theme blocks but not currently
consumed anywhere in JS (the inset highlight is baked directly into the
`--glass-tile-shadow` value instead) — reserved/vestigial for now.

`border-radius: 14` here is a literal pixel value, not `var(--radius-card)`
— the Dashboard's glass tiles intentionally use a larger, non-tokenized
radius than the flat-card system.

### 5c. Legacy `/tours` list tile (pre-redesign, unmigrated — `app/tours/page.js`)

Not touched by this rebuild pass (out of scope of the 4 files read), carried
forward from the prior version of this doc:

```css
border: 2.5px solid {tourColor};   /* uniform all 4 sides */
border-radius: 12px;
backdrop-filter: blur(8px) saturate(1.3);   /* legacy — references removed --bg-card etc, will look broken */
overflow: hidden;
position: relative;
padding: 14px 16px;
```

Uses `.tile-sub1` / `.tile-sub2` / `.tile-next-event-text` (hardcoded hex,
Section 2) for its text hierarchy. Don't invest in fixing this page's colors
ad hoc — it gets the Section 5b or 5a treatment (TBD) when its turn comes.
`components/TourTiles.js` and `components/ThisWeek.js` implement a related
older pattern and are **orphaned** (not imported anywhere) but kept on disk.

---

## 6. SideNav (`components/SideNav.js`)

- Renders as a `<nav>` element that is itself styled like a card: fixed
  `width: 200, minWidth: 200`, `background: var(--surface-nav)`,
  `border-radius: var(--radius-lg)`, `border: 0.5px solid
  var(--border-default)`, `flex-shrink: 0`. It lives inside the
  `app/layout.js` flex shell (`display: flex; gap: 10; padding: 10`)
  alongside `<main>` — normal flow, not a fixed/floating overlay, so no
  `marginTop` offset is needed on page content.
- Three sections, in order: **Operations** (Dashboard `/`, Tours `/tours`,
  Calendar `/calendar`, Staff `/staff`), **Logistics** (Venues `/venues`,
  Booking `/bc`), **Finance** (Budget `/budget`, Reports `/reports`). A
  0.5px `border-default` divider (`margin: 4px 10px`) separates each group
  after the first.
- Section labels: `fontSize: 10, fontWeight: 700, letterSpacing: '0.1em',
  textTransform: 'uppercase', color: 'var(--text-secondary)'`.
- Icons are `@tabler/icons-react` components rendered at `size={14}
  stroke={1.75}` with an explicit `width: 16` style override (so the glyph
  itself is drawn at 14px but occupies a 16px box) — not a CSS icon-font,
  no Tabler CDN link anywhere in the project.
- **Active state is blue, not green.** `active` is computed as
  `pathname === '/'` for the Dashboard item, else `pathname === item.href ||
  pathname.startsWith(item.href)` for every other item. When active: `color:
  var(--color-info)`, `fontWeight: 600`, `background: 'rgba(26,86,219,0.08)'`
  — that background is a **hardcoded rgba literal matching `--color-info` at
  ~8% opacity**, not derived from the token via `color-mix()`. If
  `--color-info` is ever changed, this literal must be updated by hand to
  match, or it will drift. Inactive: `color: var(--text-secondary)`,
  `fontWeight: 400`, transparent background. Row transition:
  `background 0.1s, color 0.1s` (background-color easing, not the blanket
  300ms rule from `globals.css` — see Section 11 on the "no transitions on
  color" rule).
- **Logo**: `<img>` swapped by `theme` state —
  `/images/V1_CommandTOUR_Dark1.png` in dark mode,
  `/images/V1_CommandTOUR_Light1.png` in light mode. Wrapped in a `<Link
  href="/">`. Container: `padding: '16px 14px 12px'`, `border-bottom: 0.5px
  solid var(--border-default)`. Image: `width: '100%', maxWidth: 200, height:
  'auto', display: 'block'`. (Other logo files exist on disk in
  `public/images/` — `V1_CommandTOUR_Dark.png` / `V1_CommandTOUR_Light.png`
  without the `1` suffix, plus several `CommandTOUR_Branding-*` and
  `CommandTOUR_Splash*` files, and `commandtour-logo.png` — none of those
  are referenced by `SideNav.js`; the `*1.png` pair is the only pair
  actually wired in.)
- **Theme toggle**: lives in the nav footer, a plain `<button>` (no
  `.btn-*` class) containing `IconSun` (shown when `theme === 'dark'`, i.e.
  the icon shows the *destination* state) or `IconMoon` (shown in light
  mode), both at `size={16} stroke={1.75}`, `color: 'var(--text-muted)'`.
  `onClick` → `handleThemeToggle`: computes `next = theme === 'dark' ?
  'light' : 'dark'`, calls
  `document.documentElement.setAttribute('data-theme', next)` +
  `localStorage.setItem('theme', next)` + `setTheme(next)` — always sets an
  explicit value, never removes the attribute (removal-means-dark doesn't
  work since `:root` is light now).
- **Footer row** (`marginTop: 'auto', padding: '10px 8px', borderTop: 0.5px
  solid var(--border-default)`, inner flex row `gap: 8, padding: '4px 6px'`):
  - Avatar: 24×24 circle, `background: 'var(--color-info)'`, `color:
    '#ffffff'` (both light and dark mode — this is a hardcoded literal, not
    `--text-primary`/`--text-on-info` or similar, because white-on-blue
    reads correctly in both themes without a token), `fontSize: 9,
    fontWeight: 700`, text content `"MA"` (hardcoded initials, not derived
    from any user-name state — there is no user-profile data source wired
    up yet).
  - Name label: `"Mark A."` (also hardcoded, not from a data source),
    `fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500`.
  - Theme toggle button (above).
  - Settings link: `<Link href="/settings">` wrapping `IconSettings`,
    `size={16} stroke={1.75}`, `color: 'var(--text-muted)'`,
    `marginLeft: 6`.
- **`SideNav` renders `null` on `pathname === '/login'`.** The login page
  has never had any nav and is a standalone full-screen card; without this
  exception the layout-level SideNav would show up next to it.
- Theme-init script lives in `app/layout.js`'s `<head>` (not at the end of
  `<body>`) specifically to avoid a flash-of-wrong-theme before first paint:
  ```js
  try{var t=localStorage.getItem('theme')||'light';document.documentElement.setAttribute('data-theme',t);}catch(e){}
  ```
  `<html>` also has `suppressHydrationWarning` to tolerate this script
  mutating an attribute before React hydrates.

`components/TopNav.js` still exists on disk and is still actively rendered
on every unmigrated page — see Section 12. It is not dead code.

---

## 7. `app/layout.js` — App Shell

```jsx
<html lang="en" suppressHydrationWarning>
  <head>{/* theme-init script, see Section 6 */}</head>
  <body className={inter.variable} style={{ margin: 0, padding: 0 }}>
    <div style={{
      display: 'flex', gap: 10, padding: 10,
      height: '100vh', overflow: 'hidden',
      background: 'var(--page-bg)',
    }}>
      <SideNav />
      <main style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
        {children}
      </main>
    </div>
  </body>
</html>
```

- `metadata` = `{ title: 'CommandTOUR', description: 'Tour Management
  Platform' }`.
- The outer flex row (SideNav + `<main>`) has a `10px` gap and `10px`
  padding on all sides, height locked to `100vh` with `overflow: hidden` —
  the page itself never scrolls; individual sections inside `<main>` scroll
  internally (see Dashboard's `overflowY: 'auto'` columns, Section 8).
  `background: var(--page-bg)` is set on this wrapper div, not on `body`
  directly (though `body`'s own CSS rule in `globals.css` also sets
  `background: var(--page-bg)` — redundant but harmless, same value both
  places).

---

## 8. Dashboard (`app/page.js`) — Current Structure, In Full

Root container: `display: flex; flex-direction: column; gap: 10; height:
100%; overflow: hidden`.

### Topbar
Plain flex row, `justify-content: space-between`, no card background,
`padding: '4px 4px 0'`.
- Left: `"Dashboard"`, `fontSize: 26, fontWeight: 700, color:
  var(--text-primary)`.
- Right: live clock, only rendered once `now` state is non-null (avoids SSR
  hydration mismatch — `now` starts `null`, gets set in a `useEffect` that
  also starts a `setInterval(tick, 1000)`). Format:
  `SAT, JUL 11, 2026 · 6:26:21 PM` — date span in `var(--text-secondary)`,
  time span in `var(--color-info)` (`fontWeight: 600,
  fontVariantNumeric: 'tabular-nums'`).

### Row 1 — Stat strip
`display: grid; grid-template-columns: repeat(7, 1fr); gap: 8`. **Seven**
cards total, not four — only the first three are wired to real data; the
remaining four are `"Coming soon"` placeholders reserved for future
metrics. Each is a `GLASS_CARD` (Section 5b) with `padding: '11px 13px'`.

```js
const STATS = [
  { label: 'Active Tours',      value: activeCount,       sub: `${domesticCount} domestic · ${intlCount} intl`, color: 'var(--text-primary)' },
  { label: 'Unconfirmed Staff', value: unconfirmedCount,  sub: 'awaiting confirmation', color: unconfirmedCount > 0 ? 'var(--color-warning)' : 'var(--color-success)' },
  { label: 'Holds Expiring',    value: holdEvents.length, sub: 'within 14 days',        color: holdEvents.length > 0 ? 'var(--color-danger)' : 'var(--color-success)' },
  { label: '—', value: '—', sub: 'Coming soon', color: 'var(--text-muted)' },  // ×4
]
```

Per card:
- Label (`stat.label`): `fontSize: 11, fontWeight: 600, letterSpacing:
  '0.08em', textTransform: 'uppercase', color: 'var(--text-secondary)'` —
  applies uniformly to all 7 cards, including the placeholders (the literal
  em-dash `"—"` is the label text for those, styled the same as real
  labels).
- Value (`stat.value`): `fontSize: 24, fontWeight: 700, lineHeight: 1, color:
  stat.color` — `stat.color` is the only per-card-varying color; it flips to
  `--color-warning`/`--color-danger` when the count is meaningful, else
  `--color-success`, and is hardcoded to `--text-muted` for the 4 placeholder
  cards.
- Sub-text (`stat.sub`): `fontSize: 12, color: 'var(--text-secondary)'` —
  uniform across all 7 cards regardless of `stat.color` (there is no
  per-card sub-text color in the data model; only the big value's color
  varies).

`domesticCount` / `intlCount` = tours where `status === 'active'` AND
`tour_category === 'domestic'` / `'international'`, respectively.
`activeCount` = tours where `status === 'active'` (independent of category).

### "This Week" section label
`fontSize: 15, fontWeight: 700, color: 'var(--color-info)', marginBottom: 6,
paddingLeft: 2` — this exact style (15/700/color-info) is reused verbatim
for "Active Tours", "Needs Attention", and "Budget Overview" section labels
further down; treat it as the de facto Dashboard section-header style even
though it isn't factored into a shared constant in the code.

### Row 2 — This Week events
`display: grid; grid-template-columns: repeat(6, 1fr); gap: 8; flex-shrink:
0`. Events are fetched for the current Mon–Sun week (`weekStart`/`weekEnd`
computed from `today`, ISO-style Monday start regardless of locale).
- Empty state: single cell spanning `gridColumn: '1 / -1'`, `GLASS_CARD`,
  centered `fontSize: 11, color: 'var(--text-muted)'`, text "No events this
  week".
- Event cards (up to 6 cells total, see below): `GLASS_CARD`, `padding:
  '10px 12px'`, `cursor: pointer`, `onClick` → `/tours/{tourId}/events/{id}`.
  - Location line (`formatLocation(..., 'compact')`): `fontSize: 14,
    fontWeight: 700, color: 'var(--text-primary)'`.
  - Date range: `fontSize: 12, color: 'var(--text-secondary)'` — shows
    `"{start} – {end}"` (en dash) if `load_out_date` differs from
    `load_in_date`, else just the single short date.
  - Venue name (if present): `fontSize: 12, color: 'var(--text-secondary)'`.
  - Show count (if `num_shows != null`): `fontSize: 12, color:
    'var(--text-muted)'`, `"{n} show"` / `"{n} shows"`.
  - Tour name: `fontSize: 12, fontWeight: 600, marginTop: 4, color:
    tour?.color || 'var(--text-secondary)'` — uses the tour's own DB color
    when available.
- **"See all →" overflow tile**: only rendered when `thisWeekEvents.length >
  6`. When shown, only the **first 5** events render (`shownWeekEvents =
  thisWeekEvents.slice(0, 5)`) so the see-all tile becomes the 6th cell —
  the grid never exceeds 6 cells regardless of how many events exist that
  week. Style: `GLASS_CARD`, centered, `fontSize: 13, color:
  'var(--color-info)', cursor: 'pointer'`, `onClick` → `/calendar`.

### Row 3 — Two-column main area
`display: grid; grid-template-columns: 5fr 2fr; gap: 10; flex: 1; min-height:
0`.

#### Left column — Active Tours
Section label (see "This Week" style above), then a scrollable list
(`overflowY: 'auto', flex: 1, min-height: 0`) of **rows**, one per tour
where `status === 'active'` (not `'upcoming'` — note the fetch query pulls
both `active` and `upcoming` tours, but only `active` ones render here).
- Loading / empty states: `padding: '14px', fontSize: 12, color:
  'var(--text-muted)'`, text "Loading…" / "No active or upcoming tours."
  (the empty-state copy says "upcoming" even though upcoming tours are
  filtered out of this list — a pre-existing wording mismatch, not fixed by
  this doc).
- Each row: `GLASS_CARD`, `display: grid; grid-template-columns: 40px 4px
  1fr 180px; align-items: center; padding: '10px 14px'; cursor: pointer`,
  `onClick` → `/tours/{tour.id}`.
  1. **Logo cell**: `<img>` at 48×48, `border-radius: 8, object-fit:
     contain` if `tour.logo_url` exists; otherwise a 48×48 fallback box,
     `border-radius: 8`, `background: color-mix(in srgb, ${tour.color ||
     'var(--accent)'} 10%, transparent)`, `color: tour.color ||
     'var(--accent)'`, showing up-to-2-letter initials at `fontSize: 8,
     fontWeight: 700`.
  2. **Color bar**: 4px-wide, `border-radius: 2`, `align-self: stretch`,
     `margin-left: 14`, `background: tour.color || 'var(--accent)'`.
  3. **Name / region / next-event cell** (`min-width: 0, margin-left: 16,
     padding-left: 10`):
     - Tour name: `fontSize: 16, fontWeight: 700, color:
       'var(--text-primary)'`, ellipsis-truncated.
     - Region/director line: `fontSize: 13, color: 'var(--text-secondary)'`
       — `[tour.region, tour.director_name || '—'].filter(Boolean).join('
       · ')`.
     - Next-event line: `fontSize: 13, color: 'var(--text-muted)'` — if a
       next event exists, renders a clickable inner `<span>`
       (`e.stopPropagation()` so it doesn't also trigger the row's own
       navigate-to-tour click) styled `color: 'var(--color-info)',
       fontWeight: 600`, text `"Next: {location compact} · {short date}"`,
       navigating to `/tours/{tourId}/events/{nextEvent.id}`; else literal
       `"—"`.
  4. **Stats cell** (`display: flex; justify-content: space-around;
     margin-left: 16`): three sub-columns, Total / Done / Left.
     - Value: `fontSize: 16, fontWeight: 700, color: item.color ||
       'var(--text-primary)'` — only "Done" has an explicit color
       (`var(--color-success)`); Total/Left fall through to
       `--text-primary`.
     - Label: `fontSize: 10, fontWeight: 500, textTransform: 'uppercase',
       letterSpacing: '0.06em', color: 'var(--text-secondary)', text-align:
       'center'`.

  `stats` per tour = `{ total, done, left }` computed client-side from every
  event across all tours (not scoped to the current tour by the query — the
  query pulls **all** events, then the code buckets by `tour_id` in JS):
  `total` = event count, `done` = count where `load_in_date < today`,
  `left` = `total - done`.

#### Right column
`display: flex; flex-direction: column; gap: 10; min-height: 0; overflow-y:
auto`.

**Needs Attention** block:
- Header: flex row, `gap: 6`, same 15/700/color-info label style, plus a
  16×16 layered icon: `IconAlertTriangleFilled` at `color="#FFD60A"`
  (hardcoded, sanctioned exception — Section 3) with `IconAlertTriangle` at
  `color="#111111"` (also hardcoded — not theme-aware, does not use
  `--text-primary`) absolutely positioned on top, producing an outlined
  yellow-triangle glyph. Label text: "Needs Attention".
- `alerts` array is built dynamically, in this order:
  1. If `unconfirmedCount > 0`: `icon: 'warning'`, `color:
     'var(--color-warning)'`, `bg: 'var(--status-1hold-bg)'`, title
     `"{n} unconfirmed staff"`, body `"Awaiting confirmation on upcoming
     events"`, action `"View staffing"` → `/staff`.
  2. Up to 3 entries from `holdEvents` (events with a hold status expiring
     within 14 days): `icon: 'clock'`, same warning color/bg, title `"Hold
     expiring"`, body `"{tourName} — {location compact}"`, action
     `"Review"` → `/tours/{tourId}`.
  3. **Always** one static entry: `icon: 'plane'`, `color:
     'var(--color-info)'`, `bg: 'color-mix(in srgb, var(--color-info) 12%,
     transparent)'`, title `"Travel arriving today"`, body `"Check travel
     tab for arriving crew"`, `action: null, href: null` — this is a
     hardcoded placeholder, not backed by any query.
  - **Because entry 3 is unconditional, `alerts.length` can never be 0** —
    the `alerts.length === 0` "All clear" empty state (green `IconCheck`,
    "All clear" text) is dead code under current logic. Don't silently
    delete it or the travel placeholder without asking Mark which one is
    wrong — this is a known quirk introduced by the placeholder, not
    something to unilaterally resolve.
  - Each alert row: `GLASS_CARD`, `display: flex; align-items: flex-start;
    gap: 10; padding: '9px 12px'`, `cursor: pointer` only if `alert.href` is
    set, `onClick` → `router.push(alert.href)` if present. Icon box: 26×26,
    `border-radius: 6`, `background: alert.bg`, centered, icon at `size={13}
    color={alert.color}`. Title: `fontSize: 13, fontWeight: 600, color:
    'var(--text-primary)'`. Body: `fontSize: 12, color:
    'var(--text-secondary)', lineHeight: 1.35`. Action label (if present):
    `fontSize: 12, color: 'var(--accent)', fontWeight: 600` — styled as a
    link but has no `onClick` of its own; clicking anywhere on the row
    (including the action text) triggers the parent row's navigation.

**Budget Overview** block (`marginTop: 14`):
- Same 15/700/color-info section-label style.
- Renders the first 3 `activeTours` only (`activeTours.slice(0, 3)`) — not
  paginated, no "see all".
- Each row: `GLASS_CARD`, `padding: '10px 14px'`. Top line: tour name
  (`fontSize: 14, color: 'var(--text-secondary)'`) and `"$—"` placeholder
  amount (`fontSize: 14, fontWeight: 600, color: 'var(--text-primary)'`),
  space-between. Below: a 2px-tall progress-bar track (`background:
  var(--border-default), border-radius: 2, overflow: hidden`) containing a
  fill div permanently at `width: '0%'` (`background: tour.color ||
  'var(--accent)'`) — this is a static placeholder, not wired to any real
  budget data.
- Footer note: `text-align: center, fontSize: 10, fontStyle: 'italic',
  color: 'var(--text-muted)'`, text "Finance module coming soon".

**No hardcoded colors anywhere on the Dashboard** except: `tour.color` (from
the DB, used for color bars/initials/tour-name accents/progress-bar fills),
and the two sanctioned literals in the Needs Attention header icon
(`#FFD60A`, `#111111`) — everything else routes through the CSS custom
properties in Section 2, including status-pill and icon-box colors that
happen to match a token exactly.

---

## 9. Location Formatting (`lib/locationFormat.js`)

Always use `formatLocation(city, state, country, context)` — never build
city/state/country strings manually. `context` defaults to `'full'` if
omitted.

| context | North America* | Elsewhere |
|---|---|---|
| `'compact'` | `"City, ST"` (state only, country suppressed) | `"City, Country"` (country only, state suppressed) |
| `'full'` (default) | `"City, ST, Country"` | `"City, Country"` |

\* North America = `country` is exactly `'United States'`, `'Canada'`, or
`'Mexico'` (`NORTH_AMERICA` array in the file) — this check runs only in
`'compact'` mode; `'full'` mode joins whatever of `[city, state, country]`
is non-empty for **every** country, no special-casing.

If `city` is empty/falsy, the function short-circuits and returns `'—'`
regardless of context.

A second helper, `shortCountry(country)`, is also exported: looks up a
2-letter code from a `COUNTRY_SHORT` table (`'United States'` → `'US'`,
etc.) for ~35 countries, falling back to the first two letters of the
country name uppercased if not in the table. Intended for tight spaces like
calendar dots — not currently used by the Dashboard or SideNav, but part of
the shared location-formatting contract.

All event queries must select `city, state, country` so `formatLocation`
has what it needs.

---

## 10. Database Schema (key columns)

Confirmed via current Supabase queries across the app (not limited to the
Dashboard) as of this rebuild:

**`tours` table:**
`id, name, tour_type, type, region, year, color, status, logo_url,
director_name, tour_category, notes`
- `tour_type` = short code (e.g. `hwss`, `hwmt`); `type` = its display label
  (e.g. "Hot Wheels Stunt Show") — both exist, set together from the same
  dropdown.
- `region` = free-text descriptive string (e.g. "North America"),
  display-only.
- `tour_category` = `domestic` / `international` / `uncategorized` — this is
  what actually drives the Dashboard's domestic-vs-international split, not
  `region`.
- `director_name` is the real column (not `director_id`).

**`events` table:**
`id, tour_id, city, state, country, venue_name, venue_id, load_in_date,
load_out_date, status, num_shows, saturday_date, sunday_date`
- `tour.color` is always a full 7-char `#RRGGBB` hex string.
- Event `status` must always be one of the six canonical values (Section 4).

**`staff_assignments` table:**
`id, tour_position_id, slot_index, staff_id, event_id, status, confirmed,
notes, travel_in_date, travel_out_date`
- `status` is a free string (`pending`, etc.), independent of the boolean
  `confirmed` column — the Dashboard's "unconfirmed staff" stat counts rows
  where `confirmed = false AND status = 'pending' AND staff_id IS NOT
  NULL`.

**`venues` table:** `id, name, city, state, country, address` (plus more not
enumerated here — seen selected with `*` in several places).

Other tables referenced elsewhere in the app but out of scope for this
Dashboard-focused rebuild — exist and are queried, but their full column
lists were not audited here: `departments`, `positions`, `tour_positions`,
`venue_contacts`, `show_list`, `staff`. Audit these directly before relying
on a specific column name from memory.

---

## 11. Tour Logo System

- Supabase Storage bucket: `tour-logos` (public)
- Column: `logo_url` (text, nullable) on `tours` table
- Filename pattern: `{tourId}-{timestamp}.{ext}` (no subfolder)
- Upload UI: Edit Tour form (`app/tours/[id]/edit/page.js`)
- Display: Tour Detail header, Dashboard Active Tours rows (48×48,
  `object-fit: contain`, `border-radius: 8`)
- No CSS filter — rendered as-is in both themes
- Falls back to a color-tinted initials box (Section 8, Active Tours cell 1)
  when `logo_url` is null

---

## 12. Hard Rules — Never Violate

1. **Inter is the sitewide font going forward** — every newly-migrated page
   uses it via `--font-inter`. Un-migrated pages keep Plus Jakarta Sans
   until converted; don't mix fonts within a single page.
2. **No hardcoded hex** except: tour-identity colors from the DB
   (`tour.color`); the legacy `/tours`-page tile subtext overrides
   (`#B8C2CC`, `#8B96A8`, `#4A5250`, Section 5c); and the Dashboard's Needs
   Attention header icon (`#FFD60A`, `#111111`, Section 8/3). Any other new
   hardcoded color is a bug.
3. **No colored border on `backdrop-filter` elements** on the legacy
   `/tours` page (Section 5c) — irrelevant to the Dashboard's water-on-glass
   tiles (Section 5b), which use theme-tokenized borders, not tour-colored
   ones.
4. **`formatLocation()` always** — never build location strings manually
   (Section 9).
5. **Six event statuses only** — exact DB strings, exact display labels per
   Section 4.
6. **Diagnose before fixing** — read-only diagnostic first when something is
   broken.
7. **One file scope per prompt** when possible — "don't touch anything
   else" is non-negotiable.
8. **Screenshot verify** after every visual change before moving to the next
   task.
9. **`#FFD60A` for UI yellow** — never use `#C9A84C` (HWMTL Gold) as a
   general UI color (Section 3).
10. **Mock before coding** any layout or design decision.
11. **No transitions on color** — theme switching must be instant, no fade.
    (Known pre-existing inconsistency: `globals.css` still has a blanket
    `*, *::before, *::after { transition: background-color 300ms ease, … }`
    rule that predates this rule being written down — not yet removed. The
    SideNav's own nav-item hover/active transition, `background 0.1s, color
    0.1s`, is a separate, intentional, much-faster transition and is fine.)
12. **Native scrollbars only** — no `::-webkit-scrollbar`,
    `scrollbar-width`, or `scrollbar-color` rules anywhere.
13. **Legacy TopNav must fully occlude scrolled content** — `.topnav-backdrop`
    (`globals.css`) still backs `components/TopNav.js` wherever it's still
    rendered (Section 12). SideNav has no equivalent need (normal flow, not
    fixed/floating), so this rule doesn't apply to it.
14. **Token default is light** — `:root` = light palette,
    `[data-theme="dark"]` = override. Any new code that assumes
    "no attribute = dark" is wrong.
15. **`SideNav` is nav-less on `/login`** — don't add a nav to the login
    page; `SideNav` already special-cases this (Section 6).
16. **SideNav active-item color is `--color-info` (blue), not
    `--accent`/green** — this changed during the dashboard redesign; don't
    revert it. The active background (`rgba(26,86,219,0.08)`) is a hardcoded
    literal tied to that token's current value, not a `color-mix()` — if
    `--color-info` changes, update this literal by hand (Section 6).
17. **Don't confuse the three card systems** (Section 5): `.glass-card`
    class = flat, no blur; Dashboard's local `GLASS_CARD` object = real
    `backdrop-filter` blur using `--glass-tile-*` tokens; legacy `/tours`
    tile = tour-colored border + old broken blur. Applying one system's
    tokens to another will silently produce nothing (removed tokens) or the
    wrong visual (flat where blur was intended, or vice versa).
18. **The 4 placeholder stat-strip cards ("Coming soon") are intentional
    reserved slots** — the grid is `repeat(7, 1fr)` on purpose; don't
    "clean up" by dropping to 3 columns without checking with Mark first,
    since more real stats are expected to land in those slots.
19. **The Needs Attention "All clear" empty state is currently
    unreachable** because a static travel-placeholder alert is always
    appended to the `alerts` array (Section 8). This is a known quirk, not
    something to silently "fix" (e.g. by deleting the empty-state branch or
    by removing the placeholder) without confirming which behavior Mark
    actually wants.
20. **Avatar and footer-icon sizing standard**: SideNav avatar is a 24×24
    circle with `background: var(--color-info)` and literal `#ffffff` text
    (not a text-color token) in both themes; footer theme-toggle and
    settings icons render at `size={16}` (nav-item icons elsewhere stay at
    `size={14}`, box-forced to 16px width — don't conflate the two icon
    sizing conventions).

---

## 13. Page Inventory

### New system (Inter, SideNav via layout, flat + water-on-glass tokens)
- `app/layout.js` — shell, Inter font, theme-init script
- `components/SideNav.js`
- `app/globals.css` — token system (Section 2)
- Dashboard (`/`)

### Old system — still render their own inline `<TopNav>`
Because `SideNav` now wraps every route at the layout level, **these pages
currently show SideNav *and* their own inline TopNav at the same time** — a
real double-nav visual bug, not just "unstyled." Fix arrives when each page
is migrated (drop the `TopNav` import/render, adopt Section 2 tokens +
Section 5 card treatment):
- `/tours`, `/tours/new`, `/tours/[id]`, `/tours/[id]/edit`
- `/tours/[id]/events/new`, `/tours/[id]/events/[eventId]`,
  `/tours/[id]/events/[eventId]/edit`
- `/staff`, `/staff/new`, `/staff/[staffId]`, `/staff/[staffId]/edit`,
  `/staff/settings`
- `/calendar`, `/venues`, `/venues/new`, `/venues/[venueId]`,
  `/venues/[venueId]/edit`
- `/bc`, `/reports`, `/settings`, `/staffing-grid`, `/budget`

### Orphaned files (kept on disk, no longer imported)
- `components/TourTiles.js`
- `components/ThisWeek.js`

### Exception — no nav at all
- `/login` — never had one; `SideNav` explicitly returns `null` there
  (Section 6).
