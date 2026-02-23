import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { db, sqlite } from '../db/index.js';
import { users, userPermissions } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { requireRole } from '../middleware/permissions.js';
import { invalidatePermissionCache, ALL_PERMISSIONS } from '../middleware/permissions.js';
import { DEFAULT_MEMBER_PERMISSIONS } from '../db/migrate-roles-permissions.js';
import { sanitize } from '../utils/sanitize.js';

const router = Router();

// GET /api/users — public for authenticated users (display names for dropdowns)
// When called by admin/owner, returns full user list with permissions
router.get('/', (req: Request, res: Response): void => {
  if (req.user?.role === 'admin' || req.user?.role === 'owner') {
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
    const basicList = allUsers.filter(u => u.is_active === 1).map(u => ({
      id: u.id,
      username: u.username,
      display_name: u.display_name,
    }));
    res.json({ users: result, data: basicList });
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

    const callerRole = req.user!.role;

    // Owner can create admin or member; admin can only create member
    let validRole = 'member';
    if (role === 'admin' && callerRole === 'owner') {
      validRole = 'admin';
    } else if (role === 'admin' && callerRole !== 'owner') {
      res.status(403).json({ error: 'Only the owner can create admin accounts' });
      return;
    }

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

// PUT /api/users/:id — update user (admin+ only, with hierarchy checks)
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

    const callerRole = req.user!.role;
    const targetRole = user.role;

    // Owner cannot be modified (except display name by themselves)
    if (targetRole === 'owner') {
      if (id !== req.user!.userId) {
        res.status(400).json({ error: 'The owner account cannot be modified' });
        return;
      }
      // Owner editing self: can change display name only, not role
      if (role && role !== 'owner') {
        res.status(400).json({ error: 'The owner role cannot be changed' });
        return;
      }
      if (isActive === false) {
        res.status(400).json({ error: 'The owner account cannot be deactivated' });
        return;
      }
      const updates: Record<string, unknown> = {};
      if (displayName !== undefined) updates.display_name = displayName;
      if (Object.keys(updates).length > 0) {
        const setClauses = Object.keys(updates).map(k => `${k} = ?`).join(', ');
        const values = Object.values(updates);
        sqlite.prepare(`UPDATE users SET ${setClauses} WHERE id = ?`).run(...values, id);
      }
      res.json({ data: { message: 'User updated' } });
      return;
    }

    // Admin can only edit members, not other admins
    if (callerRole === 'admin' && targetRole === 'admin') {
      res.status(403).json({ error: 'Only the owner can manage admin accounts', message: 'Only the owner can manage admin accounts' });
      return;
    }

    // Admin cannot promote to admin
    if (callerRole === 'admin' && role === 'admin') {
      res.status(403).json({ error: 'Only the owner can promote users to admin', message: 'Only the owner can promote users to admin' });
      return;
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
      // Only owner can set role to admin
      if (role === 'admin' && callerRole !== 'owner') {
        res.status(403).json({ error: 'Only the owner can promote users to admin' });
        return;
      }
      updates.role = role;

      // Role change: admin → member: insert default permissions
      if (targetRole === 'admin' && role === 'member') {
        const insertPerm = sqlite.prepare('INSERT OR IGNORE INTO user_permissions (user_id, permission, granted) VALUES (?, ?, ?)');
        const txn = sqlite.transaction(() => {
          for (const [perm, granted] of Object.entries(DEFAULT_MEMBER_PERMISSIONS)) {
            insertPerm.run(id, perm, granted);
          }
        });
        txn();
      }

      // Role change: member → admin: delete permission rows
      if (targetRole === 'member' && role === 'admin') {
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

// PUT /api/users/:id/password — admin password reset (with hierarchy checks)
router.put('/:id/password', requireRole('admin'), async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id as string, 10);
    const { password } = sanitize(req.body) as { password: string };

    if (!password || password.length < 8) {
      res.status(400).json({ error: 'Password must be at least 8 characters' });
      return;
    }

    const user = db.select({ id: users.id, role: users.role }).from(users).where(eq(users.id, id)).get();
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const callerRole = req.user!.role;

    // Admin cannot reset another admin's or owner's password
    if (callerRole === 'admin' && (user.role === 'admin' || user.role === 'owner') && id !== req.user!.userId) {
      res.status(403).json({ error: 'Only the owner can manage admin accounts', message: 'Only the owner can manage admin accounts' });
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

    if (user.role === 'admin' || user.role === 'owner') {
      res.status(400).json({ error: 'Admin and owner users have all permissions' });
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

// DELETE /api/users/:id — soft delete (admin+ only, with hierarchy checks)
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

    // Owner cannot be deleted
    if (user.role === 'owner') {
      res.status(400).json({ error: 'The owner account cannot be deleted' });
      return;
    }

    // Admin can only delete members
    if (req.user!.role === 'admin' && user.role === 'admin') {
      res.status(403).json({ error: 'Only the owner can manage admin accounts', message: 'Only the owner can manage admin accounts' });
      return;
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
