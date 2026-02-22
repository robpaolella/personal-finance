import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { db, sqlite } from '../db/index.js';
import { users, userPermissions } from '../db/schema.js';
import { eq, and, sql } from 'drizzle-orm';
import { requireRole } from '../middleware/permissions.js';
import { invalidatePermissionCache, ALL_PERMISSIONS } from '../middleware/permissions.js';
import { DEFAULT_MEMBER_PERMISSIONS } from '../db/migrate-roles-permissions.js';
import { sanitize } from '../utils/sanitize.js';

const router = Router();

// GET /api/users — public for authenticated users (display names for dropdowns)
// When called by admin, returns full user list with permissions
router.get('/', (req: Request, res: Response): void => {
  if (req.user?.role === 'admin') {
    const allUsers = db.select().from(users).all();
    const result = allUsers.map(u => {
      let permissions: Record<string, boolean> | null = null;
      if (u.role === 'member') {
        permissions = {};
        for (const perm of ALL_PERMISSIONS) {
          permissions[perm] = false;
        }
        const rows = db.select({
          permission: userPermissions.permission,
          granted: userPermissions.granted,
        }).from(userPermissions).where(eq(userPermissions.user_id, u.id)).all();
        for (const row of rows) {
          permissions[row.permission] = row.granted === 1;
        }
      }
      return {
        id: u.id,
        username: u.username,
        displayName: u.display_name,
        role: u.role,
        isActive: u.is_active === 1,
        createdAt: u.created_at,
        permissions,
      };
    });
    res.json({ users: result });
    return;
  }

  // Non-admin: basic list for dropdowns
  const rows = db.select({
    id: users.id,
    username: users.username,
    display_name: users.display_name,
  }).from(users).where(eq(users.is_active, 1)).all();
  res.json({ data: rows });
});

// POST /api/users — create user (admin only)
router.post('/', requireRole('admin'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, password, displayName, role } = sanitize(req.body) as {
      username: string; password: string; displayName: string; role: string;
    };

    if (!username || !password || !displayName) {
      res.status(400).json({ error: 'Username, password, and display name are required' });
      return;
    }

    if (!/^[a-z0-9]{3,20}$/.test(username)) {
      res.status(400).json({ error: 'Username must be 3-20 lowercase alphanumeric characters' });
      return;
    }

    if (password.length < 8) {
      res.status(400).json({ error: 'Password must be at least 8 characters' });
      return;
    }

    const validRole = role === 'admin' ? 'admin' : 'member';

    // Check uniqueness
    const existing = db.select({ id: users.id }).from(users).where(eq(users.username, username)).get();
    if (existing) {
      res.status(400).json({ error: 'Username already exists' });
      return;
    }

    const hash = await bcrypt.hash(password, 10);
    const now = new Date().toISOString();
    const result = db.insert(users).values({
      username,
      password_hash: hash,
      display_name: displayName,
      role: validRole,
      is_active: 1,
      created_at: now,
    }).run();

    const userId = Number(result.lastInsertRowid);

    // Insert default permissions for members
    if (validRole === 'member') {
      const insertPerm = sqlite.prepare('INSERT OR IGNORE INTO user_permissions (user_id, permission, granted) VALUES (?, ?, ?)');
      const txn = sqlite.transaction(() => {
        for (const [perm, granted] of Object.entries(DEFAULT_MEMBER_PERMISSIONS)) {
          insertPerm.run(userId, perm, granted);
        }
      });
      txn();
    }

    res.status(201).json({
      data: {
        id: userId,
        username,
        displayName,
        role: validRole,
        isActive: true,
        createdAt: now,
      },
    });
  } catch (err) {
    console.error('POST /users error:', err);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// PUT /api/users/:id — update user (admin only)
router.put('/:id', requireRole('admin'), (req: Request, res: Response): void => {
  try {
    const id = parseInt(req.params.id as string, 10);
    const { displayName, role, isActive } = sanitize(req.body) as {
      displayName?: string; role?: string; isActive?: boolean;
    };

    const user = db.select().from(users).where(eq(users.id, id)).get();
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // Last-admin protection
    if (user.role === 'admin') {
      const adminCount = db.select({ cnt: sql<number>`COUNT(*)` })
        .from(users)
        .where(and(eq(users.role, 'admin'), eq(users.is_active, 1)))
        .get()!.cnt;

      if (adminCount <= 1) {
        if (role && role !== 'admin') {
          res.status(400).json({ error: 'Cannot remove the last admin account' });
          return;
        }
        if (isActive === false) {
          res.status(400).json({ error: 'Cannot deactivate the last admin account' });
          return;
        }
      }
    }

    // Cannot deactivate yourself
    if (isActive === false && id === req.user!.userId) {
      res.status(400).json({ error: 'Cannot deactivate your own account' });
      return;
    }

    const updates: Record<string, unknown> = {};
    if (displayName !== undefined) updates.display_name = displayName;
    if (isActive !== undefined) updates.is_active = isActive ? 1 : 0;

    if (role && (role === 'admin' || role === 'member')) {
      updates.role = role;

      // Role change: admin → member: insert default permissions
      if (user.role === 'admin' && role === 'member') {
        const insertPerm = sqlite.prepare('INSERT OR IGNORE INTO user_permissions (user_id, permission, granted) VALUES (?, ?, ?)');
        const txn = sqlite.transaction(() => {
          for (const [perm, granted] of Object.entries(DEFAULT_MEMBER_PERMISSIONS)) {
            insertPerm.run(id, perm, granted);
          }
        });
        txn();
      }

      // Role change: member → admin: delete permission rows
      if (user.role === 'member' && role === 'admin') {
        db.delete(userPermissions).where(eq(userPermissions.user_id, id)).run();
        invalidatePermissionCache(id);
      }
    }

    if (Object.keys(updates).length > 0) {
      const setClauses = Object.keys(updates).map(k => `${k} = ?`).join(', ');
      const values = Object.values(updates);
      sqlite.prepare(`UPDATE users SET ${setClauses} WHERE id = ?`).run(...values, id);
    }

    res.json({ data: { message: 'User updated' } });
  } catch (err) {
    console.error('PUT /users/:id error:', err);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// PUT /api/users/:id/password — admin password reset
router.put('/:id/password', requireRole('admin'), async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id as string, 10);
    const { password } = sanitize(req.body) as { password: string };

    if (!password || password.length < 8) {
      res.status(400).json({ error: 'Password must be at least 8 characters' });
      return;
    }

    const user = db.select({ id: users.id }).from(users).where(eq(users.id, id)).get();
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const hash = await bcrypt.hash(password, 10);
    sqlite.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, id);

    res.json({ data: { message: 'Password updated' } });
  } catch (err) {
    console.error('PUT /users/:id/password error:', err);
    res.status(500).json({ error: 'Failed to update password' });
  }
});

// PUT /api/users/:id/permissions — update member permissions (admin only)
router.put('/:id/permissions', requireRole('admin'), (req: Request, res: Response): void => {
  try {
    const id = parseInt(req.params.id as string, 10);
    const { permissions } = req.body as { permissions: Record<string, boolean> };

    if (!permissions || typeof permissions !== 'object') {
      res.status(400).json({ error: 'Permissions object is required' });
      return;
    }

    const user = db.select({ id: users.id, role: users.role }).from(users).where(eq(users.id, id)).get();
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    if (user.role === 'admin') {
      res.status(400).json({ error: 'Admin users have all permissions' });
      return;
    }

    const upsert = sqlite.prepare(
      'INSERT INTO user_permissions (user_id, permission, granted) VALUES (?, ?, ?) ON CONFLICT(user_id, permission) DO UPDATE SET granted = excluded.granted'
    );

    const txn = sqlite.transaction(() => {
      for (const [perm, granted] of Object.entries(permissions)) {
        if (ALL_PERMISSIONS.includes(perm as any)) {
          upsert.run(id, perm, granted ? 1 : 0);
        }
      }
    });
    txn();

    invalidatePermissionCache(id);

    res.json({ data: { message: 'Permissions updated' } });
  } catch (err) {
    console.error('PUT /users/:id/permissions error:', err);
    res.status(500).json({ error: 'Failed to update permissions' });
  }
});

// DELETE /api/users/:id — soft delete (admin only)
router.delete('/:id', requireRole('admin'), (req: Request, res: Response): void => {
  try {
    const id = parseInt(req.params.id as string, 10);

    const user = db.select().from(users).where(eq(users.id, id)).get();
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // Cannot delete yourself
    if (id === req.user!.userId) {
      res.status(400).json({ error: 'Cannot delete your own account' });
      return;
    }

    // Last-admin protection
    if (user.role === 'admin') {
      const adminCount = db.select({ cnt: sql<number>`COUNT(*)` })
        .from(users)
        .where(and(eq(users.role, 'admin'), eq(users.is_active, 1)))
        .get()!.cnt;

      if (adminCount <= 1) {
        res.status(400).json({ error: 'Cannot delete the last admin account' });
        return;
      }
    }

    sqlite.prepare('UPDATE users SET is_active = 0 WHERE id = ?').run(id);
    invalidatePermissionCache(id);

    res.json({ data: { message: 'User deactivated' } });
  } catch (err) {
    console.error('DELETE /users/:id error:', err);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

export default router;
