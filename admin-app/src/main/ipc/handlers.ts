/**
 * IPC handler registrations.
 *
 * All ipcMain.handle() calls live here so the main process entry file stays
 * clean. Each handler maps an IPC channel (defined in shared/types) to a
 * main-process operation.
 */

import { ipcMain } from 'electron';
import {
  IPC_CHANNELS,
  IpcResult,
  DbQueryPayload,
  ApiRequestPayload,
  AwardPeriod,
  AwardPeriodSavePayload,
} from '../../shared/types';
import { db, getSupabaseClient } from '../db';
import { apiClient } from '../api';

interface AwardPeriodRow {
  id: string;
  name: string;
  nomination_open_at: string;
  nomination_close_at: string;
  application_open_at: string;
  application_close_at: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

interface SupabaseLikeError {
  message?: string;
  details?: string;
  hint?: string;
  code?: string;
}

function formatError(err: unknown): string {
  if (err instanceof Error) {
    return err.message;
  }

  if (typeof err === 'object' && err !== null) {
    const supabaseError = err as SupabaseLikeError;
    const parts = [
      supabaseError.message,
      supabaseError.details,
      supabaseError.hint,
      supabaseError.code ? `Code: ${supabaseError.code}` : undefined,
    ].filter(Boolean);

    if (parts.length > 0) {
      if (supabaseError.code === '42501') {
        parts.push(
          'The current Supabase key does not have permission for this table. Add SUPABASE_SERVICE_ROLE_KEY to the local .env for the admin app, or create an explicit Supabase RLS policy for admin writes.',
        );
      }

      return parts.join(' ');
    }
  }

  return String(err);
}

function toAwardPeriod(row: AwardPeriodRow): AwardPeriod {
  return {
    id: row.id,
    name: row.name,
    nominationOpenAt: row.nomination_open_at,
    nominationCloseAt: row.nomination_close_at,
    applicationOpenAt: row.application_open_at,
    applicationCloseAt: row.application_close_at,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function validatePeriodPayload(payload: AwardPeriodSavePayload): void {
  if (!payload.name.trim()) {
    throw new Error('Period name is required.');
  }

  const nominationOpenAt = Date.parse(payload.nominationOpenAt);
  const nominationCloseAt = Date.parse(payload.nominationCloseAt);
  const applicationOpenAt = Date.parse(payload.applicationOpenAt);
  const applicationCloseAt = Date.parse(payload.applicationCloseAt);

  if (
    Number.isNaN(nominationOpenAt) ||
    Number.isNaN(nominationCloseAt) ||
    Number.isNaN(applicationOpenAt) ||
    Number.isNaN(applicationCloseAt)
  ) {
    throw new Error('All period date-times must be valid.');
  }

  if (nominationOpenAt >= nominationCloseAt) {
    throw new Error('Nomination opening time must be before nomination closing time.');
  }

  if (applicationOpenAt >= applicationCloseAt) {
    throw new Error('Application opening time must be before application closing time.');
  }

  if (nominationCloseAt > applicationOpenAt) {
    throw new Error('Application opening time cannot be before nomination closing time.');
  }
}

export function registerIpcHandlers(): void {
  // -------------------------------------------------------------------------
  // Database handlers
  // -------------------------------------------------------------------------
  ipcMain.handle(
    IPC_CHANNELS.DB_QUERY,
    async (_event, payload: DbQueryPayload): Promise<IpcResult> => {
      try {
        const data = db.query(payload.sql, payload.params);
        return { success: true, data };
      } catch (err) {
        return { success: false, error: formatError(err) };
      }
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.DB_RUN,
    async (_event, payload: DbQueryPayload): Promise<IpcResult> => {
      try {
        const data = db.run(payload.sql, payload.params);
        return { success: true, data };
      } catch (err) {
        return { success: false, error: formatError(err) };
      }
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.PERIOD_LIST,
    async (): Promise<IpcResult<AwardPeriod[]>> => {
      try {
        const { data, error } = await getSupabaseClient()
          .from('award_periods')
          .select(
            'id,name,nomination_open_at,nomination_close_at,application_open_at,application_close_at,is_active,created_at,updated_at',
          )
          .order('nomination_open_at', { ascending: false });

        if (error) {
          throw error;
        }

        return { success: true, data: (data ?? []).map(row => toAwardPeriod(row as AwardPeriodRow)) };
      } catch (err) {
        return { success: false, error: formatError(err) };
      }
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.PERIOD_SAVE,
    async (_event, payload: AwardPeriodSavePayload): Promise<IpcResult<AwardPeriod>> => {
      try {
        validatePeriodPayload(payload);

        const row = {
          ...(payload.id ? { id: payload.id } : {}),
          name: payload.name.trim(),
          nomination_open_at: payload.nominationOpenAt,
          nomination_close_at: payload.nominationCloseAt,
          application_open_at: payload.applicationOpenAt,
          application_close_at: payload.applicationCloseAt,
          is_active: payload.isActive,
          updated_at: new Date().toISOString(),
        };

        const selectColumns =
          'id,name,nomination_open_at,nomination_close_at,application_open_at,application_close_at,is_active,created_at,updated_at';

        const { data, error } = payload.id
          ? await getSupabaseClient()
            .from('award_periods')
            .update(row)
            .eq('id', payload.id)
            .select(selectColumns)
            .single()
          : await getSupabaseClient()
            .from('award_periods')
            .insert(row)
            .select(selectColumns)
            .single();

        if (error) {
          throw error;
        }

        return { success: true, data: toAwardPeriod(data as AwardPeriodRow) };
      } catch (err) {
        return { success: false, error: formatError(err) };
      }
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.PERIOD_CLOSE,
    async (_event, payload: { id: string }): Promise<IpcResult<AwardPeriod>> => {
      try {
        const now = Date.now();
        const nominationOpenAt = new Date(now - 4_000).toISOString();
        const nominationCloseAt = new Date(now - 3_000).toISOString();
        const applicationOpenAt = new Date(now - 2_000).toISOString();
        const applicationCloseAt = new Date(now - 1_000).toISOString();
        const updatedAt = new Date(now).toISOString();

        const { data, error } = await getSupabaseClient()
          .from('award_periods')
          .update({
            nomination_open_at: nominationOpenAt,
            nomination_close_at: nominationCloseAt,
            application_open_at: applicationOpenAt,
            application_close_at: applicationCloseAt,
            is_active: false,
            updated_at: updatedAt,
          })
          .eq('id', payload.id)
          .select(
            'id,name,nomination_open_at,nomination_close_at,application_open_at,application_close_at,is_active,created_at,updated_at',
          )
          .single();

        if (error) {
          throw error;
        }

        return { success: true, data: toAwardPeriod(data as AwardPeriodRow) };
      } catch (err) {
        return { success: false, error: formatError(err) };
      }
    },
  );

  // -------------------------------------------------------------------------
  // API proxy handler — keeps API keys out of the renderer
  // -------------------------------------------------------------------------
  ipcMain.handle(
    IPC_CHANNELS.API_REQUEST,
    async (_event, payload: ApiRequestPayload): Promise<IpcResult> => {
      try {
        const data = await apiClient.request(payload.url, {
          method: payload.method,
          headers: payload.headers,
          body: payload.data,
        });
        return { success: true, data };
      } catch (err) {
        return { success: false, error: formatError(err) };
      }
    },
  );

  console.log('[IPC] Handlers registered');
}
