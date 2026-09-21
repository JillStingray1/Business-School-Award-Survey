import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  MasterDataUploadDraft,
  MasterDataUploadError,
  MasterDataUploadLog,
  MasterDataUploadStatus,
} from '../../shared/types';

const TABLE_NAME = 'master_data_upload_logs';
const SELECT_COLUMNS = [
  'id',
  'file_name',
  'uploaded_at',
  'attempted_count',
  'successful_count',
  'failed_count',
  'status',
  'errors',
  'uploaded_by',
].join(',');

export interface MasterDataUploadLogRow {
  id: string;
  file_name: string;
  uploaded_at: string;
  attempted_count: number;
  successful_count: number;
  failed_count: number;
  status: MasterDataUploadStatus;
  errors: unknown[];
  uploaded_by: string | null;
}

export interface MasterDataUploadLogInsertRow {
  file_name: string;
  attempted_count: number;
  successful_count: number;
  failed_count: number;
  status: MasterDataUploadStatus;
  errors: MasterDataUploadError[];
}

export interface MasterDataUploadLogGateway {
  listRows(): Promise<MasterDataUploadLogRow[]>;
  insertRow(row: MasterDataUploadLogInsertRow): Promise<MasterDataUploadLogRow>;
}

function isUploadError(value: unknown): value is MasterDataUploadError {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as Partial<MasterDataUploadError>;
  return typeof candidate.sheet === 'string'
    && typeof candidate.message === 'string'
    && (candidate.row === undefined || typeof candidate.row === 'number');
}

function toUploadLog(row: MasterDataUploadLogRow): MasterDataUploadLog {
  return {
    id: row.id,
    fileName: row.file_name,
    uploadedAt: row.uploaded_at,
    attemptedCount: row.attempted_count,
    successfulCount: row.successful_count,
    failedCount: row.failed_count,
    status: row.status,
    errors: row.errors.filter(isUploadError),
    uploadedBy: row.uploaded_by,
  };
}

export class MasterDataUploadLogStore {
  constructor(private readonly gateway: MasterDataUploadLogGateway) {}

  async list(): Promise<MasterDataUploadLog[]> {
    return (await this.gateway.listRows()).map(toUploadLog);
  }

  async append(draft: MasterDataUploadDraft): Promise<MasterDataUploadLog> {
    const row = await this.gateway.insertRow({
      file_name: draft.fileName,
      attempted_count: draft.attemptedCount,
      successful_count: draft.successfulCount,
      failed_count: draft.failedCount,
      status: draft.status,
      errors: draft.errors,
    });
    return toUploadLog(row);
  }
}

class SupabaseMasterDataUploadLogGateway implements MasterDataUploadLogGateway {
  constructor(private readonly client: SupabaseClient) {}

  async listRows(): Promise<MasterDataUploadLogRow[]> {
    const { data, error } = await this.client
      .from(TABLE_NAME)
      .select(SELECT_COLUMNS)
      .order('uploaded_at', { ascending: false });

    if (error) {
      throw error;
    }

    return (data ?? []) as unknown as MasterDataUploadLogRow[];
  }

  async insertRow(row: MasterDataUploadLogInsertRow): Promise<MasterDataUploadLogRow> {
    const { data, error } = await this.client
      .from(TABLE_NAME)
      .insert(row)
      .select(SELECT_COLUMNS)
      .single();

    if (error) {
      throw error;
    }

    return data as unknown as MasterDataUploadLogRow;
  }
}

export function createSupabaseMasterDataUploadLogStore(
  client: SupabaseClient,
): MasterDataUploadLogStore {
  return new MasterDataUploadLogStore(new SupabaseMasterDataUploadLogGateway(client));
}
