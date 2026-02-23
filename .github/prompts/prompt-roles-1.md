# Roles & Permissions — Prompt 1: Database, Auth & Middleware

This prompt covers the database schema changes, authentication updates, permission middleware, and first-run setup API. No frontend work yet.

---

## 1. Database Changes

### Modify `users` table

Add these columns:

- `role`: text, not null, default "member" (values: "admin" or "member")
- `is_active`: integer, not null, default 1 (soft delete / disable accounts without losing data)

### New table: `user_permissions`

Stores granular permissions for each member user. Admins bypass this table entirely — they have all permissions implicitly.

- id: integer, primary key, autoincrement
- user_id: integer, not null, foreign key → users.id
- permission: text, not null (e.g., "transactions.create", "categories.edit")
- granted: integer, not null, default 0 (0 = denied, 1 = granted)
- UNIQUE constraint on (user_id, permission)

### New table: `app_config`

Stores app-level configuration, including whether first-run setup has been completed.

- id: integer, primary key, autoincrement
- key: text, not null, unique
- value: text, not null

### Remove hardcoded seed users

The seed script currently creates Robert and Kathleen with hardcoded passwords. Remove these entirely. Instead:
- The seed script should ONLY create the schema (tables) and seed the default categories
- No users are created at seed time
- The app detects a fresh install by checking if any users exist in the database (or checking app_config for a "setup_complete" key)

### Migration for existing installs

Write a migration that:
1. Adds `role` and `is_active` columns to the users table
2. Sets the FIRST user (lowest ID) to `role = "admin"` and all others to `role = "member"`
3. Creates the `user_permissions` table
4. For each existing member user, inserts the default permission set (see Permission Defaults below)
5. Creates the `app_config` table with `{ key: "setup_complete", value: "true" }` (since existing installs are already set up)

### Permission Defaults

When a new member user is created, insert these default permissions:

```
transactions.create = 1
transactions.edit = 1
transactions.delete = 0
transactions.bulk_edit = 0
import.csv = 1
import.bank_sync = 1
categories.create = 0
categories.edit = 0
categories.delete = 0
accounts.create = 0
accounts.edit = 0
accounts.delete = 0
budgets.edit = 1
balances.update = 1
assets.create = 0
assets.edit = 0
assets.delete = 0
simplefin.manage = 0
```

`users.manage` is not stored in this table — it's implicit to the admin role.

**Commit:** `feat(db): add roles, permissions, app_config tables and remove hardcoded seed users`

---

## 2. Auth Changes

### Update JWT payload

The JWT token currently contains the user ID. Update it to also include the user's role:

```typescript
{
  userId: number,
  role: "admin" | "member"
}
```

This allows the middleware to quickly check role without a DB query on every request. Permissions still require a DB lookup since they can be changed by admin at any time (and we don't want to require re-login for permission changes to take effect).

### Update login endpoint

- POST /api/auth/login: After validating credentials, check `is_active`. If the user is inactive, return 403 with message "Account is disabled. Contact an administrator."
- Include `role` in the JWT payload
- Return `role` in the login response body so the frontend can store it

### Update GET /api/auth/me

- Return `role` and `permissions` in the response:
```json
{
  "id": 1,
  "username": "robert",
  "displayName": "Robert",
  "role": "admin",
  "permissions": {
    "transactions.create": true,
    "transactions.edit": true,
    "transactions.delete": true,
    ...
  }
}
```
- For admin users, return ALL permissions as `true` (don't query the permissions table)
- For member users, query user_permissions and return the actual values

**Commit:** `feat(auth): include role in JWT and return permissions on login`

---

## 3. Permission Middleware

### Create middleware/permissions.ts

Two middleware functions:

#### `requireRole(role: string)`
- Checks `req.user.role` (from JWT) against the required role
- Returns 403 if the role doesn't match
- Usage: `router.delete('/users/:id', requireRole('admin'), handler)`

#### `requirePermission(permission: string)`
- If user is admin: passes through immediately (admins have all permissions)
- If user is member: queries `user_permissions` for the specific permission
- Returns 403 with message "You don't have permission to perform this action" if denied
- Usage: `router.post('/transactions', requirePermission('transactions.create'), handler)`

### Caching

To avoid hitting the DB on every request, implement a simple in-memory cache for permissions:
- Cache key: `user:{userId}:permissions`
- Cache duration: 60 seconds (short enough that admin changes take effect quickly)
- Invalidate the cache for a specific user when their permissions are updated via the admin API
- Use a simple Map object — no external cache needed for a two-user app

**Commit:** `feat(api): add role and permission middleware with caching`

---

## 4. First-Run Setup API

### GET /api/setup/status

- Publicly accessible (no auth required)
- Checks if any users exist in the database OR if app_config has `setup_complete = true`
- Returns: `{ setupRequired: boolean }`
- If `setupRequired` is true, the frontend should redirect to the setup page
- If false, normal login flow

### POST /api/setup/create-admin

- Publicly accessible (no auth required) BUT only works if setup is not yet complete
- If setup is already complete, returns 403 "Setup has already been completed"
- Accepts: `{ username: string, password: string, displayName: string }`
- Creates the first user with `role = "admin"`
- Sets app_config `setup_complete = true`
- Returns the created user (without password) and a JWT token so they're automatically logged in
- Validates: username required (alphanumeric, lowercase, 3-20 chars), password required (min 8 chars), displayName required

### Security considerations
- The POST endpoint must be idempotent-safe — if called twice somehow, the second call fails because setup is already complete
- Rate limit to 5 attempts per minute (prevent brute-force attempts on an unprotected endpoint)
- After setup is complete, both endpoints still work but return appropriate responses (status returns false, create-admin returns 403)

**Commit:** `feat(api): add first-run setup endpoints`

---

## 5. Update Seed Script

Update the seed script so it:
1. Creates all tables (schema)
2. Seeds the default category hierarchy (Income, Auto/Transportation, Daily Living, etc.)
3. Does NOT create any users
4. Does NOT set `setup_complete` in app_config
5. Logs a message: "Database seeded. Visit the app to create your admin account."

The seed script should be safe to run on an existing database — it should check if tables/data already exist before inserting (upsert categories, don't duplicate them).

**Commit:** `refactor(db): update seed script to not create default users`

---

## Verification

After all 5 commits:
- Run `npm run dev` — server starts without errors
- Database has new columns (role, is_active on users) and new tables (user_permissions, app_config)
- If existing users: first user is admin, others are members with default permissions
- GET /api/setup/status returns `{ setupRequired: true }` on a fresh database (no users)
- GET /api/setup/status returns `{ setupRequired: false }` on an existing database (has users)
- POST /api/setup/create-admin creates an admin user and returns a JWT on a fresh database
- POST /api/setup/create-admin returns 403 on a database that already has users
- GET /api/auth/me returns role and permissions
- Login with an admin user → JWT contains role "admin"
- Login with a member user → JWT contains role "member"

**Stop here and wait for confirmation before proceeding to prompt-roles-2.md.**
