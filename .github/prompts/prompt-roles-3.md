# Roles & Permissions — Prompt 3: Frontend

This prompt covers all frontend changes: the first-run setup page, Settings/Preferences tabs, user management UI, and permission-aware component rendering. Before starting, re-read `.github/copilot-instructions.md`, `.github/design-system.jsx`, and review the mockup at `.github/settings-permissions-mockup.jsx` for the approved visual design.

### Important: Mockup vs Implementation

The mockup file contains some elements that are ONLY for demonstration purposes and should NOT be implemented in the actual app:

- **The Admin/Member view toggle at the top of the mockup** — this is a tool for reviewing the design. The actual app determines the view automatically based on the logged-in user's role. Do not add a view switcher.
- **The "How Permissions Affect the UI" legend card at the bottom** — this documents the design rules for reference. Do not render this in the app.

Everything else in the mockup (the tab navigation, Bank Sync section, Accounts/Categories cards with disabled states, Users & Permissions section, Preferences tab layout) represents the actual target implementation.

---

## 1. Auth Context — Add Permissions

### Update AuthContext.tsx

The auth context currently stores user info from GET /api/auth/me. Expand it to include role and permissions:

```typescript
interface AuthUser {
  id: number;
  username: string;
  displayName: string;
  role: "admin" | "member";
  permissions: Record<string, boolean>;
}
```

Add helper functions to the context:

```typescript
const isAdmin = () => user?.role === "admin";
const hasPermission = (permission: string) => {
  if (!user) return false;
  if (user.role === "admin") return true;
  return user.permissions[permission] === true;
};
const canPerform = (permission: string) => hasPermission(permission);
```

These should be available to any component via `useAuth()`:
```typescript
const { user, isAdmin, hasPermission } = useAuth();
```

After login and on app load (GET /api/auth/me), store the full permission map. This avoids per-action API calls to check permissions on the frontend.

**Commit:** `feat(ui): add role and permissions to auth context`

---

## 2. First-Run Setup Page

### pages/SetupPage.tsx

A standalone page shown when the app has no users. Clean, centered design — similar to the login page but for initial setup.

**Detection flow:**
- On app load, before showing the login page, call GET /api/setup/status
- If `setupRequired` is true → show the Setup page instead of login
- If false → show the normal login page

### Setup Page Design

- Centered card on the page background (same as login page layout)
- Logo at the top (Ledger logo, same as sidebar)
- Title: "Welcome to Ledger"
- Subtitle: "Create your administrator account to get started."
- Form fields:
  - Display Name (text input, required)
  - Username (text input, required, hint: "Lowercase letters and numbers only")
  - Password (password input, required, hint: "Minimum 8 characters")
  - Confirm Password (password input, required, must match)
- "Create Account & Get Started" button (primary style)
- On submit: POST /api/setup/create-admin
- On success: store the returned JWT, redirect to the Dashboard
- On error: show inline error notification in the form
- No link to login page (there are no accounts to log into yet)

### After Setup

After the admin account is created:
- The app redirects to Dashboard
- The sidebar shows the admin's name at the bottom
- Settings → Users & Permissions is immediately accessible for the admin to create additional users
- Categories are already seeded (from the seed script), so the app is functional right away
- No accounts, transactions, or budgets exist yet — the admin sets those up as needed

**Commit:** `feat(ui): add first-run setup page`

---

## 3. Settings Page — Tab Navigation

Add a tab switcher to the top of the Settings page.

### Tabs
- **Settings** — the default tab. Contains: Bank Sync, Accounts, Categories, and (admin only) Users & Permissions
- **Preferences** — personal profile management. Available to all users.

### Tab Implementation
- Use the pill-toggle style (same as Import page CSV/Bank Sync tabs, same as the design system guide toggle group)
- Default to "Settings" tab
- Tab state can be in URL query param: `/settings?tab=preferences` so direct links work
- Both tabs visible to all users

**Commit:** `feat(ui): add Settings/Preferences tab navigation`

---

## 4. Preferences Tab

### Available to ALL users (admin and member)

**Profile Section:**
- Display Name: editable text input
- Username: read-only (disabled input with `var(--bg-input)` background, muted text)
- Save button for profile changes → calls PUT /api/auth/me (or a new endpoint) to update display name
- Success toast: "Profile updated"

**Password Section:**
- Three fields: Current Password, New Password, Confirm New Password
- All in a row (3-column grid on desktop)
- "Change Password" button
- Calls PUT /api/auth/change-password
- Validates: current password required, new password min 8 chars, confirm must match
- Success toast: "Password changed"
- Inline error if current password is wrong

**Role Display:**
- Shows current role as a badge: Admin (green) or Member (blue)
- Members see: "Permissions managed by admin" in muted text
- Admins see no additional text (they have full access)

**Commit:** `feat(ui): add Preferences tab with profile and password management`

---

## 5. Users & Permissions Section (Admin Only)

### Location
On the Settings tab, below the Categories card. Only visible when `isAdmin()` returns true. Completely hidden for member users (not disabled — hidden).

### Design (match the mockup)

**Section Title:** "Users & Permissions" with subtitle "Manage household members and their access levels."

**User Cards:**
Each user displayed as a card within the section:

- **Avatar circle:** First letter of display name, colored using owner badge colors (first user gets owner-1 colors, second gets owner-2, etc.)
- **Name and username:** Bold display name, muted username below
- **Role badge:** "Admin" (green) or "Member" (blue)
- **Edit button** (pencil icon) — on member cards only
- **Admin cards:** Show italic muted text "Admins have all permissions. Cannot be restricted." No permission toggles.

**Member Permission Toggles:**
Displayed in a 3-column grid within the member's card:

Column 1 — **Transactions:**
- Create (toggle)
- Edit (toggle)
- Delete (toggle)
- Bulk Edit (toggle)

Column 2 — **Settings:**
- Manage Accounts (toggle)
- Manage Categories (toggle)
- Manage Connections (toggle)

Column 3 — **Finance:**
- Edit Budgets (toggle)
- Update Balances (toggle)
- Manage Assets (toggle)
- CSV Import (toggle)
- Bank Sync Import (toggle)

**Toggle Behavior:**
- Each toggle calls PUT /api/users/:id/permissions immediately on change (no save button needed)
- Show a brief loading state on the toggle while saving
- Toast on error: "Failed to update permission"
- Group headers are section labels (TRANSACTIONS, SETTINGS, FINANCE) in uppercase muted text

### Add User

"+ Add User" button at the bottom of the section.

Opens a modal:
- Title: "Add User"
- Fields:
  - Display Name (required)
  - Username (required, lowercase alphanumeric hint)
  - Password (required, min 8 chars)
  - Confirm Password (required, must match)
  - Role: toggle or dropdown — "Admin" or "Member" (default: Member)
- "Create User" button (primary)
- On success: toast "User created", new user card appears in the list
- On error: inline notification in modal

### Edit User (pencil icon on member cards)

Opens a modal:
- Title: "Edit User"
- Fields:
  - Display Name (editable)
  - Role: toggle between Admin and Member
    - Changing to Admin: show warning "This will grant full access to all features. Permissions cannot be restricted for admin users."
    - Changing from Admin: show warning "This will restrict the user to member permissions."
  - Active: toggle (with warning when deactivating: "This user will not be able to log in.")
- "Reset Password" section: single password field + confirm, optional (only filled if resetting)
- "Save Changes" button
- Delete/Deactivate button: ConfirmDeleteButton pattern with text "Deactivate" instead of "Delete"

### Safeguards (frontend enforcement, backend already protects these)
- Cannot change the last admin's role to member — show disabled toggle with tooltip "Cannot remove the last admin"
- Cannot deactivate yourself — hide the deactivate toggle on your own card
- Cannot deactivate the last admin

**Commit:** `feat(ui): add Users & Permissions management section for admins`

---

## 6. Permission-Aware Components

Throughout the app, UI elements need to respect the current user's permissions. Update every page.

### Helper Pattern

Create a reusable wrapper component:

```tsx
// components/PermissionGate.tsx
interface PermissionGateProps {
  permission: string;
  children: React.ReactNode;
  fallback?: "hidden" | "disabled";  // default: "hidden"
}
```

- `fallback="hidden"`: renders nothing if permission denied (use for destructive actions)
- `fallback="disabled"`: renders children with `opacity: 0.4`, `pointer-events: none`, and optionally a tooltip "You don't have permission" (use for creative/edit actions)

Usage:
```tsx
<PermissionGate permission="transactions.delete" fallback="hidden">
  <ConfirmDeleteButton onConfirm={handleDelete} />
</PermissionGate>

<PermissionGate permission="accounts.create" fallback="disabled">
  <button onClick={handleAdd}>+ Add Account</button>
</PermissionGate>
```

### Apply Across All Pages

#### Transactions Page
- "Add Transaction" button → `transactions.create` (disabled if denied)
- Edit icon / row click → `transactions.edit` (disabled)
- Delete button in edit modal → `transactions.delete` (hidden)
- "Bulk Edit" button → `transactions.bulk_edit` (hidden)

#### Settings Page (Settings tab)
- Bank Sync: "+ Add Connection", edit, delete buttons → `simplefin.manage` (add/edit: disabled, delete: hidden)
- Account linking changes → `simplefin.manage` (disabled)
- Accounts: "+ Add Account" → `accounts.create` (disabled)
- Account edit icon → `accounts.edit` (disabled)
- Account delete → `accounts.delete` (hidden)
- Categories: "+ Add Category" → `categories.create` (disabled)
- Category edit → `categories.edit` (disabled)
- Category delete → `categories.delete` (hidden)
- Users & Permissions section → `isAdmin()` check (hidden entirely for non-admins)

#### Budget Page
- Inline budget editing → `budgets.edit` (disabled — cells show values but aren't editable)

#### Net Worth Page
- "Update Balances" button → `balances.update` (disabled)
- "+ Add" asset → `assets.create` (disabled)
- Asset edit icon → `assets.edit` (disabled)
- Asset delete → `assets.delete` (hidden)

#### Import Page
- CSV Import tab → `import.csv` (if denied: show message "You don't have permission to import via CSV. Contact your administrator.")
- Bank Sync tab → `import.bank_sync` (same pattern)

#### Dashboard Page
- "+ Transaction" shortcut button → `transactions.create` (disabled)
- Everything else is read-only, no permission gates needed

#### Reports Page
- All read-only, no permission gates needed

**Commit:** `feat(ui): add PermissionGate component and apply across all pages`

---

## 7. Sidebar — Role Indicator

At the bottom of the sidebar where the username is displayed, add a subtle role badge:

- Admin: show username with a small "Admin" badge (green, same as the Connected badge style)
- Member: show username with a small "Member" badge (blue)
- This helps the user always know what role they're operating under

**Commit:** `feat(ui): show role badge in sidebar`

---

## 8. Handle 403 Errors Gracefully

When the backend returns a 403 for a permission error, the frontend should handle it gracefully:

- The API client (in lib/api.ts) should catch 403 responses
- Show an error toast: "Permission denied: {message from server}"
- Do NOT redirect to login (403 is not an auth failure, it's a permission failure)
- The toast should include the specific message from the server (e.g., "You don't have permission to delete transactions")

This is a safety net — in most cases the PermissionGate component prevents the user from even attempting restricted actions, but if they somehow reach a 403 (e.g., permissions changed while they were on the page), the error is handled cleanly.

**Commit:** `fix(ui): handle 403 permission errors with toast notification`

---

## Learnings to Add

### Role-Based Permission System (YYYY-MM-DD)
**Context:** The app needed to differentiate between admin and regular users with granular access control
**Problem:** All authenticated users had equal access to every feature, including destructive actions and system configuration
**Resolution:** Two roles (admin, member) with 18 granular permissions stored per-member in a user_permissions table. Admins bypass all checks. Permission middleware on every mutating API route. Frontend uses PermissionGate component to hide/disable restricted features.
**Rule going forward:** Every new mutating API endpoint must include a requirePermission() or requireRole() middleware. Every new UI action must be wrapped in PermissionGate. Default permissions for new members should err on the side of restrictive — admins can always grant more.

### First-Run Setup Flow (YYYY-MM-DD)
**Context:** The app previously seeded hardcoded default users (Robert/Kathleen with "changeme" passwords)
**Problem:** Hardcoded users make the app personal to one household and create a security risk on fresh installs
**Resolution:** Removed default users from seed script. Added a first-run setup flow that prompts for admin account creation. The app detects fresh installs by checking for zero users in the database.
**Rule going forward:** Never seed user accounts. The seed script should only create schema and reference data (categories). User creation always goes through the setup flow or admin UI.

### UI Permission Patterns (YYYY-MM-DD)
**Context:** Deciding how to show restricted features to non-admin users
**Problem:** Need consistent UX — users shouldn't be confused about why things don't work
**Resolution:** Three patterns: destructive actions (delete, bulk delete) are hidden entirely. Creative/edit actions (add, edit) are shown but disabled with reduced opacity. Admin-only sections (Users & Permissions) are completely hidden. PermissionGate component enforces this consistently.
**Rule going forward:** Use PermissionGate for every permission-dependent UI element. Use fallback="hidden" for destructive actions, fallback="disabled" for creative/edit actions. Never show a feature that will just 403 when clicked without making it visually obvious that it's restricted.

**Commit:** `docs: add roles and permissions learnings`

---

## Final Verification

Complete end-to-end test:

### Fresh Install Flow
1. Delete the database file and run `npm run seed`
2. Open the app → Setup page appears (not login)
3. Create an admin account → redirected to Dashboard
4. Sidebar shows admin name with "Admin" badge
5. Settings → Users & Permissions visible, shows the admin user
6. Add a member user with default permissions
7. Log out → login as the member

### Member Experience
8. Settings tab: Bank Sync shows "View Only", Accounts/Categories show but add/edit disabled, delete buttons hidden, Users & Permissions completely hidden
9. Preferences tab: can change display name and password
10. Transactions: can add and edit, cannot delete, Bulk Edit hidden
11. Budget: can view but cannot edit budget values (if budgets.edit was toggled off — test both)
12. Net Worth: can view, Update Balances disabled, Add Asset disabled, delete hidden
13. Import: CSV tab works (import.csv enabled), Bank Sync tab works (import.bank_sync enabled)
14. Dashboard and Reports: fully visible, read-only actions work

### Admin Manages Permissions
15. Log back in as admin
16. Toggle on "Manage Categories" for the member
17. Log in as member → Settings → Categories now shows edit icons and "+ Add Category"
18. Toggle off "CSV Import" for the member
19. Log in as member → Import → CSV tab shows permission denied message

### Edge Cases
20. Admin cannot demote themselves to member (last admin protection)
21. Admin cannot deactivate themselves
22. Deactivated member cannot log in (shows "Account is disabled" error)
23. Member trying to access /api/users directly → 403
24. All above work in both light and dark mode
