import { defineConfig } from 'drizzle-kit';

// Use environment variables for production (Turso/remote DB)
// Falls back to local SQLite for development
const url = process.env.DATABASE_URL || process.env.TURSO_DATABASE_URL || 'file:sqlite.db';
const authToken = process.env.DATABASE_AUTH_TOKEN || process.env.TURSO_AUTH_TOKEN;

export default defineConfig({
  schema: './lib/db/schema.ts',
  out: './drizzle',
  dialect: 'sqlite',
  dbCredentials: {
    url,
    ...(authToken && { authToken })
  },
});
