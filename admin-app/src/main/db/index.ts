import { createClient, SupabaseClient } from '@supabase/supabase-js';
import fs from 'node:fs';
import path from 'node:path';

function loadEnvFile(): void {
  const envPath = path.resolve(process.cwd(), '.env');

  if (!fs.existsSync(envPath)) {
    return;
  }

  const env = fs.readFileSync(envPath, 'utf8');

  for (const line of env.split(/\r?\n/)) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const separatorIndex = trimmed.indexOf('=');

    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const rawValue = trimmed.slice(separatorIndex + 1).trim();
    const value = rawValue.replace(/^['"]|['"]$/g, '');

    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

loadEnvFile();

function requireEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`[DB] Missing required environment variable: ${name}`);
  }

  return value;
}

export const SUPABASE_URL = requireEnv('SUPABASE_URL');
export const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || requireEnv('SUPABASE_KEY');

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
});

export function getSupabaseClient(): SupabaseClient {
  return supabase;
}

export interface Database {
  query<T = unknown>(sql: string, params?: unknown[]): T[];
  run(sql: string, params?: unknown[]): { changes: number; lastInsertRowid: number };
  close(): void;
}

class DatabaseManager {
  private readonly client: SupabaseClient = supabase;

  /**
   * Initialise the shared Supabase client.
   * Call once during app startup.
   */
  async connect(): Promise<void> {
    console.log(`[DB] Supabase client ready -> ${SUPABASE_URL}`);
  }

  getClient(): SupabaseClient {
    return this.client;
  }

  query<T = unknown>(sql: string, params: unknown[] = []): T[] {
    void sql;
    void params;
    throw new Error(
      '[DB] Raw SQL is not supported by the Supabase public client. Use db.getClient().from(...), db.getClient().rpc(...), or expose a dedicated IPC handler.',
    );
  }

  run(sql: string, params: unknown[] = []): { changes: number; lastInsertRowid: number } {
    void sql;
    void params;
    throw new Error(
      '[DB] Raw SQL writes are not supported by the Supabase public client. Use db.getClient().from(...), db.getClient().rpc(...), or expose a dedicated IPC handler.',
    );
  }

  disconnect(): void {
    void this.client.removeAllChannels();
    console.log('[DB] Supabase client disconnected');
  }
}

export const db = new DatabaseManager();
