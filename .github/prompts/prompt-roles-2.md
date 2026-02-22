# Roles & Permissions — Prompt 2: Route Protection & User Management API

This prompt applies permission checks to every API route and adds user management endpoints. Before starting, re-read `.github/copilot-instructions.md` and verify that the middleware from prompt 1 is working.

---

## 1. Apply Permission Checks to All Existing Routes

Go through EVERY route file and add the appropriate `requirePermission()` or `requireRole()` middleware. The auth middleware (JWT validation) should already be applied globally — these are additional checks on top of authentication.

### routes/transactions.ts
- POST /api/transactions → `requirePermission('transactions.create')`
- PUT /api/transactions/:id → `requirePermission('transactions.edit')`
- DELETE /api/transactions/:id → `requirePermission('transactions.delete')`
- POST /api/transactions/bulk-update → `requirePermission('transactions.bulk_edit')`
- DELETE /api/transactions/bulk-delete → `requirePermission('transactions.bulk_edit')`
- GET routes (list, search, summary) → no permission check needed (all authenticated users can read)

### routes/categories.ts
- POST /api/categories → `requirePermission('categories.create')`
- PUT /api/categories/:id → `requirePermission('categories.edit')`
- DELETE /api/categories/:id → `requirePermission('categories.delete')`
- GET routes → no permission check

### routes/accounts.ts
- POST /api/accounts → `requirePermission('accounts.create')`
- PUT /api/accounts/:id → `requirePermission('accounts.edit')`
- DELETE /api/accounts/:id → `requirePermission('accounts.delete')`
- GET routes → no permission check

### routes/budgets.ts
- PUT /api/budgets (upsert) → `requirePermission('budgets.edit')`
- GET routes → no permission check

### routes/balances.ts
- POST /api/balances (create snapshot) → `requirePermission('balances.update')`
- GET routes → no permission check

### routes/assets.ts
- POST /api/assets → `requirePermission('assets.create')`
- PUT /api/assets/:id → `requirePermission('assets.edit')`
- DELETE /api/assets/:id → `requirePermission('assets.delete')`
- GET routes → no permission check

### routes/import.ts
- POST /api/import/parse → `requirePermission('import.csv')`
- POST /api/import/categorize → `requirePermission('import.csv')`
- POST /api/import/commit → `requirePermission('import.csv')`

### routes/simplefin.ts
- POST /api/simplefin/connections → `requirePermission('simplefin.manage')`
- PUT /api/simplefin/connections/:id → `requirePermission('simplefin.manage')`
- DELETE /api/simplefin/connections/:id → `requirePermission('simplefin.manage')`
- POST /api/simplefin/links → `requirePermission('simplefin.manage')`
- DELETE /api/simplefin/links/:id → `requirePermission('simplefin.manage')`
- POST /api/simplefin/sync → `requirePermission('import.bank_sync')`
- POST /api/simplefin/commit → `requirePermission('import.bank_sync')`
- GET /api/simplefin/connections → no permission check (need to see connections to use bank sync)
- GET /api/simplefin/connections/:id/accounts → no permission check
- GET /api/simplefin/balances → `requirePermission('balances.update')`

### routes/dashboard.ts, routes/reports.ts, routes/networth.ts
- All GET routes → no permission check (all authenticated users can view)

### routes/auth.ts
- POST /api/auth/login → no permission check (public)
- GET /api/auth/me → no permission check (authenticated only, already protected by auth middleware)
- POST /api/auth/logout → no permission check

**Commit:** `feat(api): apply permission checks to all API routes`

---

## 2. User Management API

### routes/users.ts

All user management routes require `requireRole('admin')`.

#### GET /api/users
- Returns all users (active and inactive):
```json
{
  "users": [
    {
      "id": 1,
      "username": "robert",
      "displayName": "Robert",
      "role": "admin",
      "isActive": true,
      "createdAt": "2025-01-15T...",
      "permissions": null
    },
    {
      "id": 2,
      "username": "kathleen",
      "displayName": "Kathleen",
      "role": "member",
      "isActive": true,
      "createdAt": "2025-01-15T...",
      "permissions": {
        "transactions.create": true,
        "transactions.edit": true,
        "transactions.delete": false,
        ...
      }
    }
  ]
}
```
- Admin users return `permissions: null` (they have all permissions implicitly)
- Member users return their full permission map

#### POST /api/users
- Creates a new user
- Accepts: `{ username: string, password: string, displayName: string, role: "admin" | "member" }`
- Validates: username unique, alphanumeric lowercase 3-20 chars, password min 8 chars, displayName required
- If role is "member", inserts the default permission set into user_permissions
- Returns the created user (without password hash)

#### PUT /api/users/:id
- Updates user profile
- Accepts: `{ displayName?: string, role?: string, isActive?: boolean }`
- Cannot change username (it's an identifier)
- If role is changed from member to admin: delete their permission rows (admins don't need them)
- If role is changed from admin to member: insert default permissions
- CANNOT demote the last admin: if this is the only admin user and the request tries to change role to member, return 400 "Cannot remove the last admin account"
- CANNOT deactivate the last admin: same protection
- CANNOT deactivate yourself: return 400 "Cannot deactivate your own account"

#### PUT /api/users/:id/password
- Resets a user's password (admin action, no current password required)
- Accepts: `{ password: string }`
- Validates: min 8 chars
- Hashes and stores the new password

#### PUT /api/users/:id/permissions
- Updates a member's permissions
- Accepts: `{ permissions: { [key: string]: boolean } }`
- Only works on member users (return 400 for admin users: "Admin users have all permissions")
- Upserts permission rows
- Invalidates the permission cache for this user

#### DELETE /api/users/:id
- Soft deletes a user (sets is_active = false)
- Does NOT actually delete the row (preserves transaction history)
- Cannot delete the last admin
- Cannot delete yourself
- Returns 200 with confirmation

### Password Change for Self (non-admin)

#### PUT /api/auth/change-password
- Available to any authenticated user (not just admins)
- Accepts: `{ currentPassword: string, newPassword: string }`
- Validates current password matches
- Validates new password min 8 chars
- Hashes and stores the new password
- Returns 200 success

**Commit:** `feat(api): add user management endpoints`

---

## 3. Update Existing User References

Some parts of the codebase may reference users by hardcoded names or IDs. Audit and fix:

- Owner filter on Budget page: should dynamically pull from the users table (this may already be done)
- Any place that hardcodes "Robert" or "Kathleen" — replace with dynamic user lookups
- Account owner assignment: should reference user IDs from the database, not hardcoded values

**Commit:** `refactor(api): remove any hardcoded user references`

---

## 4. Error Response Consistency

Ensure all 403 responses from the permission middleware follow a consistent format:

```json
{
  "error": "Forbidden",
  "message": "You don't have permission to perform this action",
  "requiredPermission": "transactions.delete"
}
```

The `requiredPermission` field helps the frontend show specific error messages if needed (e.g., "You need the 'Delete Transactions' permission. Contact your administrator.").

For role-based rejections:
```json
{
  "error": "Forbidden",
  "message": "This action requires administrator privileges"
}
```

**Commit:** `fix(api): standardize permission error responses`

---

## Verification

After all commits:
- Login as the admin user → GET /api/auth/me returns all permissions as true
- Login as a member user → GET /api/auth/me returns their specific permission map
- As member: attempt POST /api/transactions → succeeds (has transactions.create)
- As member: attempt DELETE /api/transactions/1 → returns 403 (no transactions.delete)
- As member: attempt POST /api/categories → returns 403 (no categories.create)
- As member: attempt POST /api/simplefin/connections → returns 403 (no simplefin.manage)
- As member: attempt GET /api/users → returns 403 (not admin)
- As admin: GET /api/users returns all users with permissions
- As admin: POST /api/users creates a new member with default permissions
- As admin: PUT /api/users/:id/permissions updates member permissions
- As admin: Cannot demote the last admin
- As admin: Cannot deactivate yourself
- PUT /api/auth/change-password works for any authenticated user

**Stop here and wait for confirmation before proceeding to prompt-roles-3.md.**
