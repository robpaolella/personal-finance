# Mobile Responsive UI — Prompt 1: Navigation & Layout Foundation

This prompt sets up the responsive foundation: breakpoint system, bottom tab bar, mobile header, and the responsive shell that wraps the entire app. Before starting, re-read `.github/copilot-instructions.md` and `.github/design-system.jsx`.

---

## 1. Breakpoint System

### CSS Custom Properties for Breakpoints

The app uses a single breakpoint: **768px**. Below 768px = mobile layout. At 768px and above = desktop layout (unchanged).

Add a CSS media query block in the global stylesheet:

```css
@media (max-width: 767px) {
  /* Mobile overrides go here */
}
```

### Utility Classes

Add utility classes for responsive visibility:

```css
/* Hide on mobile */
@media (max-width: 767px) {
  .desktop-only { display: none !important; }
}

/* Hide on desktop */
@media (min-width: 768px) {
  .mobile-only { display: none !important; }
}
```

These will be used throughout the app to conditionally show/hide elements.

**Commit:** `feat(ui): add responsive breakpoint system and utility classes`

---

## 2. Responsive App Shell

### Current Structure
The app currently has a layout like:
```
[Sidebar (fixed left)] [Main Content (flex: 1)]
```

### Updated Structure
Wrap both layouts in a responsive container:

```
Desktop (≥768px):
  [Sidebar (fixed left)] [Main Content (flex: 1)]

Mobile (<768px):
  [Mobile Header (fixed top)]
  [Main Content (full width, scrollable)]
  [Bottom Tab Bar (fixed bottom)]
```

### Implementation

The existing sidebar should get the `desktop-only` class. It must remain completely unchanged for desktop — do not restructure it.

Create a new `MobileHeader` component and a new `BottomTabBar` component, both with the `mobile-only` class.

The main content area needs responsive padding:
- Desktop: existing padding (probably `padding-left` to account for sidebar width)
- Mobile: `padding: 16px 16px 80px` (80px bottom padding to clear the tab bar + FAB)

**Commit:** `feat(ui): add responsive app shell with mobile/desktop layout switching`

---

## 3. Mobile Header Component

### components/MobileHeader.tsx

A compact header shown only on mobile, fixed to the top of the viewport.

**Design (match the prototype):**
- Background: `var(--bg-card)`
- Border bottom: `1px solid var(--bg-card-border)`
- Padding: `10px 20px 12px`
- Height: auto (approximately 50px)
- Display: flex, space-between, align-center
- `position: sticky; top: 0; z-index: 40;`

**Left side:**
- Ledger logo (same gradient square with $ as the sidebar logo, 22px)
- Page title (17px, weight 700) — dynamically shows the current page name
- For settings sub-pages, show the sub-page title (e.g., "Accounts" instead of "Settings")

**Right side:**
- No dark mode toggle here (it's in Settings/Preferences)
- Could optionally show a user avatar or nothing — keep it clean

The header should read the current route to determine the page title. Use the same routing context/hook that the sidebar currently uses.

**Commit:** `feat(ui): add mobile header component`

---

## 4. Bottom Tab Bar Component

### components/BottomTabBar.tsx

A fixed bottom navigation bar shown only on mobile.

**Design (match the prototype):**
- Background: `var(--bg-card)` (not --bg-nav, since card and nav are the same in both themes)
- Border top: `1px solid var(--bg-card-border)`
- `position: fixed; bottom: 0; left: 0; right: 0; z-index: 40;`
- Padding: `6px 0 env(safe-area-inset-bottom, 18px)` — the `env()` function handles iPhone home indicator notch. Fallback to 18px for non-notched phones.
- Display: flex, justify-around, align-center

**Four tabs:**

| Tab | Icon | Route |
|---|---|---|
| Home | ⊞ (or a home SVG icon) | /dashboard |
| Transactions | ☰ (or a list SVG icon) | /transactions |
| Budget | ▭ (or a chart SVG icon) | /budget |
| More | ··· (or an ellipsis SVG icon) | Opens popover |

**Tab styling:**
- Each tab: flex column, center aligned, gap 2px
- Icon: 18px
- Label: 9px, weight 400 (600 when active)
- Active color: `var(--color-accent)` (#3b82f6)
- Inactive color: `var(--text-muted)` (light) / `var(--text-muted)` (dark)
- The "More" tab highlights as active when the user is on any of its sub-pages (Reports, Net Worth, Import, Settings)

**Icons:** Prefer simple SVG icons over Unicode characters for consistent rendering across devices. Use Lucide React icons if already installed, otherwise simple inline SVGs. The prototype uses Unicode for demonstration — the real implementation should use proper icons.

**More Menu Popover:**
- Opens above the "More" tab when tapped
- Background: `var(--bg-card)`, border: `1px solid var(--bg-card-border)`, border-radius: 12px
- Box shadow: `0 8px 24px rgba(0,0,0,0.15)`
- Position: fixed, bottom ~66px, right 16px
- z-index: 45 (above tab bar)
- Contains: Reports, Net Worth, Import, Settings
- Each item: padding 10px 16px, flex row with icon + label, 13px font
- Active item highlighted with `var(--color-accent)` text color and weight 600
- Tapping outside the popover (on a backdrop) closes it
- Tapping an item navigates to that page and closes the popover

**Navigation behavior:**
- Tapping Home, Transactions, or Budget navigates directly (same as clicking sidebar items)
- The tab bar must work with the existing routing (React Router or whatever is in use)
- The active tab should reflect the current route
- When navigating via the More menu, the More tab stays visually "active" while on those pages

**Commit:** `feat(ui): add bottom tab bar with More menu popover`

---

## 5. Hide Sidebar on Mobile

The existing sidebar component needs a `desktop-only` class (or equivalent CSS media query) so it's hidden on mobile.

```css
@media (max-width: 767px) {
  .sidebar {
    display: none;
  }

  .main-content {
    margin-left: 0;  /* or padding-left: 0, depending on current layout */
  }
}
```

Do NOT modify the sidebar's desktop appearance in any way. Just hide it on mobile.

**Commit:** `feat(ui): hide sidebar on mobile breakpoint`

---

## 6. Safe Area Handling

For iOS devices with the home indicator (notched iPhones), the bottom tab bar needs safe area insets.

Add to the HTML `<meta>` viewport tag:
```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
```

The `viewport-fit=cover` allows the app to extend into the safe area, and the `env(safe-area-inset-bottom)` in the tab bar padding handles the notch offset.

Also add to the body/root:
```css
body {
  -webkit-overflow-scrolling: touch; /* Smooth scrolling on iOS */
}
```

**Commit:** `feat(ui): add iOS safe area and smooth scrolling support`

---

## 7. Responsive Page Title Hook

Create a hook or context that provides the current page title for the mobile header:

```typescript
function usePageTitle(): string {
  // Read from current route
  // Map route to title:
  // /dashboard → "Dashboard"
  // /transactions → "Transactions"
  // /budget → "Budget"
  // /reports → "Reports"
  // /networth → "Net Worth"
  // /import → "Import"
  // /settings → "Settings"
  // /settings/accounts → "Accounts"
  // /settings/categories → "Categories"
  // /settings/users → "Users & Permissions"
  // etc.
}
```

This should work with the existing routing. If settings sub-pages are currently rendered as part of the Settings page (not separate routes), this hook should also accept an optional override for sub-page titles.

**Commit:** `feat(ui): add usePageTitle hook for mobile header`

---

## Verification

After all commits, test at BOTH widths using browser dev tools (toggle device toolbar):

**Desktop (≥768px):**
- Sidebar visible, bottom tab bar hidden, mobile header hidden
- All pages look exactly as they did before — zero visual changes
- Navigation works via sidebar as before

**Mobile (<768px):**
- Sidebar hidden, bottom tab bar visible, mobile header visible
- Page title in header updates when navigating
- Tapping Home/Transactions/Budget tabs navigates correctly
- Tapping More opens the popover with 4 items
- Tapping an item in More navigates and closes the popover
- Tapping outside the popover closes it
- Active tab highlights correctly (including More for overflow pages)
- Bottom padding on content area clears the tab bar
- No horizontal scrolling
- Test on both light and dark mode

**Stop here and wait for confirmation before proceeding to prompt-mobile-2.md.**
