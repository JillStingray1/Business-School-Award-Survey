import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  IpcResult,
  MasterDataUploadLog,
  MasterDataUploadPayload,
} from '../../shared/types';
import { formatError } from './ipcError';
import type { MasterDataUploadLogStore } from './masterDataUploadLogStore';
import {
  buildMasterDataUploadDraft,
  parseMasterDataWorkbook,
  type ParsedMasterDataWorkbook,
} from './masterDataUploadModel';

type MasterDataUploadLogService = Pick<MasterDataUploadLogStore, 'list' | 'append'>;

export function createMasterDataHandlers(
  client: SupabaseClient,
  uploadLogStore: MasterDataUploadLogService,
) {
  return {
    async list(): Promise<IpcResult<MasterDataUploadLog[]>> {
      try {
        return { success: true, data: await uploadLogStore.list() };
      } catch (err) {
        return { success: false, error: formatError(err) };
      }
    },

    async upload(
      _event: unknown,
      payload: MasterDataUploadPayload,
    ): Promise<IpcResult<MasterDataUploadLog>> {
      try {
        let parsed: ParsedMasterDataWorkbook;

        try {
          parsed = parseMasterDataWorkbook(payload.bytes, payload.fileName);
        } catch (err) {
          parsed = {
            attemptedCount: 0,
            rejectedCount: 0,
            records: [],
            errors: [{ sheet: 'Workbook', message: formatError(err) }],
          };
        }

        let successfulCount = 0;
        let uploadError: string | undefined;

        if (parsed.records.length > 0) {
          const { data, error } = await client
            .from('scholars')
            .insert(parsed.records)
            .select('id');

          if (error) {
            uploadError = formatError(error);
          } else {
            successfulCount = data?.length ?? parsed.records.length;
          }
        }

        const draft = buildMasterDataUploadDraft(
          payload.fileName,
          parsed,
          successfulCount,
          uploadError,
        );
        const log = await uploadLogStore.append(draft);
        return { success: true, data: log };
      } catch (err) {
        return { success: false, error: formatError(err) };
      }
    },
  };
}
