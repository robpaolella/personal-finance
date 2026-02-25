import crypto from 'crypto';
import path from 'path';
import fs from 'fs';

let cachedSecret: string | null = null;

/**
 * Returns the JWT secret. Priority:
 * 1. JWT_SECRET environment variable (recommended for production)
 * 2. Auto-generated secret persisted to the data directory
 */
export function getJwtSecret(): string {
  if (cachedSecret) return cachedSecret;

  // 1. Check environment variable
  const envSecret = process.env.JWT_SECRET;
  if (envSecret) {
    cachedSecret = envSecret;
    return cachedSecret;
  }

  // 2. Auto-generate and persist
  const dataDir = process.env.DATABASE_PATH
    ? path.dirname(process.env.DATABASE_PATH)
    : path.join(process.cwd(), 'data');

  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const secretPath = path.join(dataDir, '.jwt-secret');

  if (fs.existsSync(secretPath)) {
    cachedSecret = fs.readFileSync(secretPath, 'utf-8').trim();
    return cachedSecret;
  }

  // Generate a new random secret
  cachedSecret = crypto.randomBytes(64).toString('hex');
  fs.writeFileSync(secretPath, cachedSecret, { mode: 0o600 });

  console.warn(
    'WARNING: No JWT_SECRET environment variable set. ' +
    'Auto-generated a secret and saved it to ' + secretPath + '. ' +
    'Set JWT_SECRET in your environment for production use.'
  );

  return cachedSecret;
}
