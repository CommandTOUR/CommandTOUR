# CommandTOUR Design System
**Last verified: July 5, 2026 — locked against live screenshots**

Drop this file into every new Claude Code session. All values here are ground truth.
Do not deviate without explicit instruction from Mark.

---

## 1. Stack & Tooling

- **Framework:** Next.js (App Router)
- **Styling:** Pure CSS variables + inline styles — no Tailwind
- **Database:** Supabase (PostgreSQL + Storage + Auth)
- **Icons:** Tabler Icons (`@tabler/icons-react`) — no other icon library
- **Font:** Plus Jakarta Sans — sole typeface sitewide, everywhere, always
- **Deployment:** Vercel
- **Repo:** github.com/CommandTOUR/CommandTOUR

---

## 2. Color Tokens (globals.css)

### Dark Mode (`:root` default)
```css
--bg: #0B1220;
--bg-card: rgba(255,255,255,0.045);
--bg-card-hover: rgba(255,255,255,0.06);
--border-card: rgba(255,255,255,0.08);
--card-glass-highlight: rgba(255,255,255,0.12);
--card-glass-shadow: rgba(0,0,0,0.18);
--color-mint: #10E687;
--color-mint-bg: rgba(16,230,135,0.12);
--color-mint-border: rgba(16,230,135,0.40);
--color-yellow: #F59E0B;
--color-yellow-bg: rgba(245,158,11,0.12);
--color-yellow-border: rgba(245,158,11,0.40);
--color-red: #E24B4A;
--color-red-bg: rgba(226,75,74,0.12);
--color-red-border: rgba(226,75,74,0.40);
--color-purple: #A78BFA;
--color-purple-bg: rgba(167,139,250,0.15);
--color-purple-border: rgba(167,139,250,0.40);
--color-alert: #FCB132;
--text-primary: #f1f5f9;
--text-secondary: #94a3b8;
--text-muted: #64748b;
--nav-bg: #0B1220;
--table-row-text-dark: #A8B2C2;
```

### Light Mode (`[data-theme="light"]`)
```css
--bg: #EEF0F0;
--bg-card: #FFFFFF;
--bg-card-hover: #F4F5F5;
--border-card: #DDE1E0;
--color-mint: #0F8F5C;
--color-mint-bg: #DCF3E7;
--color-mint-border: #86D9B2;
--color-yellow: #B5720B;
--color-yellow-bg: #FBE9D2;
--color-red: #C23B3B;
--color-purple: #8B6FE8;
--color-alert: #9A6B0A;
--text-primary: #1A2422;
--text-secondary: #4A5250;
--text-muted: #606866;
```

---

## 3. "Yellow" Rule — Never Violate

- **UI yellow** (buttons, badges, highlights): `#FFD60A` — this is system yellow
- **HWMTL Gold** (`#C9A84C`): exclusively the HWMTL tour identifier color, never used as a general UI color
- These two values must never be confused or swapped

---

## 4. Six Event Statuses

Exact database strings (case-sensitive). No other values are valid.

| DB value | Display label | Dark mode color | Light mode color | Light mode bg |
|---|---|---|---|---|
| `confirmed` | Confirmed | `#33FF99` | `#0F8F5C` | `#DCF3E7` |
| `1-hold` | 1-Hold | `#FFD60A` | `#8A6D00` | `#FCF2C9` |
| `2-hold` | 2-Hold | `#FF9F0A` | `#B5560A` | `#FCE2C2` |
| `3-hold` | 3+ Hold | `#FF375F` | `#C2294A` | `#FBDEE5` |
| `tentative` | Tentative | `#BF5AF2` | `#8B6FE8` | `#EAE3FB` |
| `date-hold` | Date Hold | `#AEAEB2` | `#717977` | `#EEEEEF` |

Status pills: `border-radius: 6px`, `border: 1px solid`, `font-weight: 700`
NOT oval/pill shaped — rounded rectangle only.

---

## 5. Card Treatment (Frosted Glass)

```css
background: var(--bg-card);
backdrop-filter: blur(14px) saturate(1.3);
-webkit-backdrop-filter: blur(14px) saturate(1.3);
border: 1px solid var(--border-card);
border-radius: 10px;
box-shadow: inset 0 1px 0 var(--card-glass-highlight), 0 4px 14px var(--card-glass-shadow);
```

**CRITICAL:** Never put a colored `border-*` property on an element that also has `backdrop-filter`.
Use an absolutely-positioned child `<div>` for any colored accent bar.

---

## 6. TopNav

- `position: fixed; top: 16px; left: 16px; right: 16px;`
- `border-radius: 14px`
- Same glass recipe as cards
- Page content offset: `marginTop: 88` / `top: 88` on sticky headers
- Theme toggle: IconSun (shown in dark = switch to light) / IconMoon (shown in light = switch to dark)
- Avatar: dark mode `rgba(255,255,255,0.08)` bg / light mode `var(--text-primary)` bg + white text
- `suppressHydrationWarning` on `<html>` in layout.js — intentional, do not remove

---

## 7. Tour Tile Cards

Both `components/TourTiles.js` (Dashboard) and `app/tours/page.js` use identical structure.

### Card container
```css
border: 2.5px solid {tourColor};   /* uniform all 4 sides */
border-radius: 10px (Dashboard) / 12px (Tours list);
backdrop-filter: blur(8px) saturate(1.3);
overflow: hidden;
position: relative;
padding: 14px 16px;
```

### Text hierarchy
- **Tour name:** 17px, weight 700, `var(--text-primary)`, truncate with ellipsis
- **Year · Director (line 2):** 13px, class `tile-sub1` → dark: `#B8C2CC` / light: `#4A5250`
- **Region (line 3):** 12px, class `tile-sub2` → dark: `#8B96A8` / light: `#4A5250`
- **Logo:** inline flex sibling right side, height 52/64, no filter, only if `tour.logo_url` exists

### Stats
- TOTAL / DONE / LEFT: 26px, weight 700
- DONE value: `var(--color-mint)`
- Labels: 11px

### Progress bar
- 4px height, no label, no %, tour color fill, `marginBottom: 14`

### Status pill
- Centered, `border-radius: 6px`, `marginBottom: 12`

### Next Event mini-tile
- `background: var(--bg-card-hover)`, `border: 1px solid {tourColor}`, `border-radius: 7px`
- "NEXT EVENT" label: 10px, uppercase, `var(--text-muted)`
- City + date: 13px, weight 600, class `tile-next-event-text` → dark: `#B8C2CC` / light: `#4A5250`
- Clickable → `/tours/{tourId}/events/{nextEventId}`, `e.stopPropagation()`

### Theme-specific tile text classes (in globals.css)
```css
.tile-sub1 { color: #B8C2CC; }
.tile-sub2 { color: #8B96A8; }
.tile-next-event-text { color: #B8C2CC; }

[data-theme="light"] .tile-sub1 { color: #4A5250; }
[data-theme="light"] .tile-sub2 { color: #4A5250; }
[data-theme="light"] .tile-next-event-text { color: #4A5250; }
```

---

## 8. Dashboard Header Clock

- Format: `WED, JUL 5, 2026 • 6:35:26 PM`
- Date portion: `var(--text-primary)`, 13px, weight 600
- Bullet separator: `var(--text-muted)`
- Time portion: `var(--color-mint)`, 14px, weight 700
- `fontVariantNumeric: 'tabular-nums'` — prevents layout shift
- Live ticking via useState/useEffect/setInterval, null-initialized for hydration safety

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
`id, name, tour_type, region, year, color, status, logo_url, director_id, notes`

**events table:**
`id, tour_id, city, state, country, venue_name, venue_id, load_in_date, status, num_shows`

- `tour.color` is always a full 7-char `#RRGGBB` hex string
- `tour.tour_type` = show type string (e.g. "Hot Wheels Monster Trucks Live")
- Event `status` must always be one of the six canonical values (Section 4)

---

## 11. Tour Logo System

- Supabase Storage bucket: `tour-logos` (public)
- Column: `logo_url` (text, nullable) on tours table
- Filename pattern: `{tourId}-{timestamp}.{ext}` (no subfolder)
- Upload UI: Edit Tour form (`app/tours/[id]/edit/page.js`)
- Display: Tour Detail header (replaces color dot, spans both text rows), tour tiles
- No CSS filter — render as-is in both modes

---

## 12. Hard Rules — Never Violate

1. **Plus Jakarta Sans only** — no other font anywhere in the UI
2. **No hardcoded hex** except tour-identity colors from DB and the tile subtext overrides (`#B8C2CC`, `#8B96A8`, `#4A5250`)
3. **No colored border on backdrop-filter elements** — use absolutely-positioned child div for accent bars
4. **`formatLocation()` always** — never build location strings manually
5. **Six event statuses only** — exact DB strings, exact display labels per Section 4
6. **Diagnose before fixing** — read-only diagnostic first when something is broken
7. **One file scope per prompt** when possible — "don't touch anything else" is non-negotiable
8. **Screenshot verify** after every visual change before moving to next task
9. **`#FFD60A` for UI yellow** — never use `#C9A84C` (HWMTL Gold) as a general UI color
10. **Mock before coding** any layout or design decision
11. **No transitions on color** — theme switching must be instant, no fade

---

## 13. Page Inventory

### Done
- Dashboard (`/`)
- Tours list (`/tours`)
- Tour Detail — Schedule tab (`/tours/[id]`)
- TopNav (`components/TopNav.js`)
- globals.css token system

### In Progress / Partial
- Tour Detail — Staffing tab
- Tour Detail — Travel tab
- Tour Detail — Calendar tab
- Tour Detail — Venues tab
- Tour Detail — Files tab
- Staff profile (`/staff/[staffId]`)
- Edit Tour (`/tours/[id]/edit`)

### Not Started
- Staff list (`/staff`)
- Calendar (`/calendar`)
- Venues list + detail + edit (`/venues`)
- Reports (`/reports`)
- Settings (`/settings`)
- Booking & Contracts — 7 tabs (`/bc`)
- Event detail (`/tours/[id]/events/[eventId]`)
- New/Edit event pages
- Login page
- All Tours Staffing Grid (`/staffing-grid`)
