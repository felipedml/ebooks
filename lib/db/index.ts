import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';

// Use environment variables for production (Turso/remote DB)
// Falls back to local SQLite for development
const url = process.env.DATABASE_URL || process.env.TURSO_DATABASE_URL || 'file:sqlite.db';
const authToken = process.env.DATABASE_AUTH_TOKEN || process.env.TURSO_AUTH_TOKEN;

const client = createClient({
  url,
  ...(authToken && { authToken })
});

export const db = drizzle(client);
