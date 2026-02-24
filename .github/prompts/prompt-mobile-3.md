# Mobile Responsive UI — Prompt 3: Interactive Elements

This prompt adds mobile-specific interactive components: bottom sheets, the floating transaction pill, and mobile adaptations for all modals and forms. The navigation and page layouts from prompts 1 and 2 are already in place.

Before starting, re-read `.github/copilot-instructions.md`, `.github/design-system.jsx`, and reference `.github/mobile-prototype.jsx` for bottom sheet designs.

**Critical rule: Desktop modals remain unchanged.** Bottom sheets are only used below the 768px breakpoint. Above 768px, all existing modals render exactly as they do now.

---

## 1. BottomSheet Component

### components/BottomSheet.tsx

A reusable bottom sheet component that replaces modals on mobile.

```typescript
interface BottomSheetProps {
  title: string;
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}
```

**Design (match the prototype):**

**Backdrop:**
- Background: `var(--bg-modal)`
- Covers the entire viewport
- Tapping the backdrop closes the sheet
- `position: fixed; inset: 0; z-index: 50;`

**Sheet container:**
- Background: `var(--bg-card)` (uses the card background so it contrasts with the page)
- `border-radius: 16px 16px 0 0` (rounded top corners only)
- `max-height: 92vh` (never covers the full screen — always shows a sliver of backdrop)
- Slides up from the bottom with a CSS animation:
  ```css
  @keyframes slideUp {
    from { transform: translateY(100%); }
    to { transform: translateY(0); }
  }
  ```
  Duration: 200ms ease-out

**Drag handle:**
- Centered at the top: 36px wide, 4px tall, border-radius 2px
- Color: `var(--bg-card-border)`
- Padding: `8px 0 4px` above the title
- Visual indicator only (drag-to-dismiss is a nice-to-have but not required for v1)

**Header:**
- Title: 16px, weight 700, left-aligned
- Close button: `×` in `var(--text-muted)`, 20px, right side
- Padding: `8px 20px 12px`
- Flex row, space-between, align-center

**Content area:**
- Padding: `0 20px 24px`
- `overflow-y: auto; scrollbar-width: none;`
- `flex: 1` to fill remaining height
- Add bottom padding to account for safe area: `padding-bottom: max(24px, env(safe-area-inset-bottom))`

**Rendering:**
- Render via React portal to document.body (same approach as tooltips)
- When `isOpen` is false, render nothing
- Trap focus inside the sheet for accessibility
- Press Escape to close

### Integration with Existing Modals

Create a wrapper that decides whether to render a desktop modal or a mobile bottom sheet:

```typescript
// components/ResponsiveModal.tsx
interface ResponsiveModalProps {
  title: string;
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

function ResponsiveModal({ title, isOpen, onClose, children }: ResponsiveModalProps) {
  const isMobile = useIsMobile(); // hook that checks window.innerWidth < 768

  if (!isOpen) return null;

  if (isMobile) {
    return <BottomSheet title={title} isOpen={isOpen} onClose={onClose}>{children}</BottomSheet>;
  }

  return <DesktopModal title={title} isOpen={isOpen} onClose={onClose}>{children}</DesktopModal>;
}
```

Replace ALL existing modal usages throughout the app with `<ResponsiveModal>`. The desktop modal component stays exactly the same — it's just now wrapped in a conditional.

**Commit:** `feat(ui): add BottomSheet component and ResponsiveModal wrapper`

---

## 2. useIsMobile Hook

### hooks/useIsMobile.ts

```typescript
function useIsMobile(breakpoint: number = 768): boolean {
  // Uses window.matchMedia for efficient breakpoint detection
  // Listens for resize events
  // Returns true when viewport width < breakpoint
  // SSR-safe: defaults to false
}
```

Use `window.matchMedia('(max-width: 767px)')` with an event listener for changes. This is more performant than listening to resize events and checking innerWidth.

This hook should be used by:
- `ResponsiveModal` (to choose modal vs bottom sheet)
- Any component that needs to conditionally render different mobile/desktop markup
- The FAB pill (to show/hide)

**Commit:** `feat(ui): add useIsMobile hook`

---

## 3. Floating Transaction Pill (FAB)

### components/TransactionPill.tsx

A floating pill button that appears on the Dashboard and Transactions pages on mobile only.

**Design (match the prototype):**
- `position: fixed; bottom: 72px; left: 50%; transform: translateX(-50%);`
- Background: `var(--btn-primary-bg)`, text: `var(--btn-primary-text)`
- Box shadow: `0 4px 12px rgba(0,0,0,0.15)` (light) / `0 4px 12px rgba(0,0,0,0.3)` (dark)
- Padding: `10px 24px`, border-radius: 20px
- Font: 13px DM Sans, weight 600
- Content: `+ Transaction` (plus sign with space then "Transaction")
- z-index: 10 (below modals/sheets but above content)
- `mobile-only` class — hidden on desktop

**Positioning:**
- `bottom: 72px` clears the bottom tab bar (56px) with a gap
- If the device has a safe area inset, the tab bar is taller, so use: `bottom: calc(56px + env(safe-area-inset-bottom, 18px) + 8px)`

**Behavior:**
- Tapping opens the Add Transaction modal (which renders as a bottom sheet on mobile)
- Only visible on Dashboard and Transactions pages
- Hidden when any modal/sheet is open

**Integration:**
- Place the component in the app shell (same level as the bottom tab bar)
- Use the current route to determine visibility
- Use a state check to hide when modals are open

**Commit:** `feat(ui): add floating Transaction pill for mobile`

---

## 4. Add Transaction — Bottom Sheet

The existing Add Transaction modal should work inside the bottom sheet container with minimal changes.

### Mobile Form Adjustments
- All form fields: full width
- Date and Account fields: stack vertically on narrow screens OR use a 2-column grid if they fit (match prototype: 2-column grid works at 390px)
- Category dropdown: full width, touch-friendly height (min 44px)
- Amount field: `inputMode="decimal"` attribute to trigger the numeric keyboard on mobile
- The Expense/Income toggle at the top uses the existing Toggle component (already mobile-friendly)

### What NOT to change
- The form fields, validation, and submit logic are identical to desktop
- The same API call, same state management
- Only the container changes (modal → bottom sheet)

**Commit:** `feat(ui): adapt Add Transaction form for mobile bottom sheet`

---

## 5. Update Balances — Bottom Sheet

The existing Update Balances modal on the Net Worth page.

### Mobile Adjustments
- Bank Sync / Manual toggle: full width (already works)
- Bank Sync tab: each account as a card/row with current vs SimpleFIN balance
  - 3-column layout within each account card: Current | SimpleFIN | Change
  - Checkbox on each account row
  - This layout works at mobile width — just verify it fits
- Manual tab: account name on one line, input field on the next (stack if the row gets too tight)
- "Apply Selected Updates" / "Save Balances" button: full width

### Holdings Checkbox
- If the holdings update checkbox was added (from the earlier prompt), it should appear below the balance cards on the Bank Sync tab
- Works the same on mobile

**Commit:** `feat(ui): adapt Update Balances modal for mobile bottom sheet`

---

## 6. Bank Sync Import — Bottom Sheet

The Import → Bank Sync flow, which currently may be inline or a modal.

### Step 1: Account Selection & Date Range
- Account checkboxes: full width rows, 44px min height
- Date range chips: horizontal scrollable row (same as Transaction date filters)
- "Fetch Transactions" button: full width primary

### Step 2: Review Transactions
- "{N} of {M} selected" count at top
- Each transaction as a tappable card:
  - Checkbox + payee name on first line
  - Date · category badge (or "Uncategorized" / "Transfer" badge) · confidence % on second line
  - Amount on the right, flush with the card edge
- Tapping the card toggles the checkbox
- Unchecked cards show at reduced opacity (0.5)
- "Import {N} Transactions" button: full width, green/success style
- "← Back to Selection" link centered below the button

### Transfer and Duplicate Badges
- Transfer badge: orange, same as desktop
- Uncategorized badge: warning colors
- Likely Duplicate / Possible Duplicate: same badges as desktop but verify they fit within the card width without wrapping awkwardly

**Commit:** `feat(ui): adapt Bank Sync import flow for mobile bottom sheet`

---

## 7. Other Modals — Bottom Sheet Adaptation

Audit ALL other modals in the app and ensure they use `<ResponsiveModal>`. These include:

- **Edit Transaction modal** — verify form fits in bottom sheet
- **Edit Account modal** — verify fields fit
- **Edit Category modal** — verify fields fit
- **Add Account / Add Category modals** — verify fields fit
- **Edit User / Add User modals** — verify fields fit
- **Delete User confirmation modal** — the two-step flow should work in a bottom sheet. Both steps should fit within the 92vh max height. The type-to-confirm input needs `autocapitalize="off"` for mobile keyboards.
- **SimpleFIN connection edit/delete modals** — verify they fit

For each modal: the content stays the same, just the container switches. If any modal's content is too tall for 92vh, the content area scrolls.

**Commit:** `feat(ui): convert all remaining modals to ResponsiveModal`

---

## 8. Mobile Form Input Enhancements

### Input Modes
Add appropriate `inputMode` attributes to number inputs throughout the app to trigger the correct mobile keyboard:

- Amount fields: `inputMode="decimal"` (shows number pad with decimal point)
- Last four digits: `inputMode="numeric"` (shows number pad)
- Year fields: `inputMode="numeric"`
- Budget values: `inputMode="decimal"`
- Percentage fields (depreciation rate): `inputMode="decimal"`
- Text fields: default (no attribute needed)

### Autocapitalize
- Username fields: `autoCapitalize="off"` (prevents iOS from capitalizing the first letter)
- Description fields: `autoCapitalize="sentences"` (or leave default)

### Autofocus
- On desktop modals: first field autofocuses (existing behavior)
- On mobile bottom sheets: do NOT autofocus (prevents the keyboard from immediately covering the sheet on open). Let the user tap the field they want.

**Commit:** `fix(ui): add mobile input modes and keyboard optimizations`

---

## 9. Learnings to Add

### Mobile Responsive Design (YYYY-MM-DD)
**Context:** The app needed to work on phones for quick viewing and transaction entry
**Problem:** Desktop layout with sidebar navigation and wide tables doesn't work on small screens
**Resolution:** Single breakpoint at 768px. Desktop layout unchanged above breakpoint. Below breakpoint: sidebar → bottom tab bar with More menu, tables → card lists, modals → bottom sheets, FAB pill for quick transaction entry. Settings uses drill-through sub-page pattern.
**Rule going forward:** All new features must be tested at both desktop and mobile widths. New modals must use ResponsiveModal (renders desktop modal or mobile bottom sheet automatically). New tables need a mobile card alternative. Minimum touch target: 44px. No horizontal scrolling except intentional scrollable areas.

### Bottom Sheet vs Modal (YYYY-MM-DD)
**Context:** Needed consistent mobile interaction pattern
**Problem:** Desktop-style centered modals feel wrong on mobile — they float awkwardly and don't use the full width
**Resolution:** Created a BottomSheet component that slides up from the bottom with a drag handle. ResponsiveModal wrapper automatically chooses modal (desktop) or bottom sheet (mobile) based on viewport width.
**Rule going forward:** Never render a centered floating modal on mobile. Always use ResponsiveModal. Content inside the sheet should be identical to the desktop modal — only the container changes.

**Commit:** `docs: add mobile responsive design learnings`

---

## Final Verification

Complete end-to-end mobile test:

1. Open every page at 390px width and verify it matches the prototype
2. **Add Transaction:** tap pill → bottom sheet opens → fill form → save → sheet closes, toast shows
3. **Update Balances:** Net Worth → Update Balances → bottom sheet with Bank Sync/Manual toggle → apply
4. **Bank Sync Import:** Import → Sync Now → step 1 (accounts + date) → step 2 (review cards) → import
5. **Settings drill-through:** Settings → tap Accounts → sub-page loads → "← Back" returns to list
6. **Edit Transaction:** Transactions → tap a transaction card → edit bottom sheet opens
7. **Delete User:** Settings → Users → edit → deactivate/delete → confirmation bottom sheet
8. All number inputs trigger numeric keyboard on mobile
9. No autofocus on sheet open (keyboard doesn't auto-appear)
10. Username field doesn't auto-capitalize
11. All above in both light and dark mode
12. Test at 390px, 375px, and 320px widths
13. Open at desktop width — verify ZERO changes to desktop layout
