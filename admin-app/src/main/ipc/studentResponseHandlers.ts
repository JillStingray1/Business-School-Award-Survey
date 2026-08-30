import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  ApprovalStatus,
  IpcResult,
  StudentResponse,
  StudentResponseStatusUpdatePayload,
} from '../../shared/types';
import { formatError } from './ipcError';

const RESPONSE_COLUMNS = [
  'id',
  'student_name',
  'student_id',
  'scholar_name',
  'unit_code',
  'unit_name',
  'teaching_period',
  'role_of_unit',
  'statement_support',
  'approval_status',
  'created_at',
].join(',');

const LEGACY_RESPONSE_COLUMNS = [
  'id',
  'student_name',
  'student_id',
  'scholar_name',
  'unit_code',
  'unit_name',
  'teaching_period',
  'role_of_unit',
  'statement_support',
  'created_at',
].join(',');

interface NominationRow {
  id: number;
  student_name: string;
  student_id: string;
  scholar_name: string;
  unit_code: string;
  unit_name: string | null;
  teaching_period: string;
  role_of_unit: string;
  statement_support: string;
  approval_status?: string | null;
  created_at?: string;
}

interface SupabaseLikeError {
  message?: string;
  details?: string;
  code?: string;
}

function normaliseApprovalStatus(value?: string | null): ApprovalStatus {
  if (value === 'Approved' || value === 'Rejected') {
    return value;
  }

  return 'Pending';
}

function toStudentResponse(row: NominationRow): StudentResponse {
  return {
    id: row.id,
    studentName: row.student_name,
    studentId: row.student_id,
    scholarName: row.scholar_name,
    unitCode: row.unit_code,
    unitName: row.unit_name,
    teachingPeriod: row.teaching_period,
    roleOfUnit: row.role_of_unit,
    statementSupport: row.statement_support,
    approvalStatus: normaliseApprovalStatus(row.approval_status),
    createdAt: row.created_at,
  };
}

function isApprovalStatusColumnMissing(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const supabaseError = error as SupabaseLikeError;
  const message = `${supabaseError.message ?? ''} ${supabaseError.details ?? ''}`.toLowerCase();
  return supabaseError.code === '42703'
    || supabaseError.code === 'PGRST204'
    || message.includes('approval_status');
}

function validateStatusUpdatePayload(payload: StudentResponseStatusUpdatePayload): void {
  if (!Number.isInteger(payload.id) || payload.id <= 0) {
    throw new Error('A valid nomination id is required.');
  }

  if (!['Pending', 'Approved', 'Rejected'].includes(payload.approvalStatus)) {
    throw new Error('A valid approval status is required.');
  }
}

export function createStudentResponseHandlers(client: SupabaseClient) {
  return {
    async list(): Promise<IpcResult<StudentResponse[]>> {
      try {
        const { data, error } = await client
          .from('nominations')
          .select(RESPONSE_COLUMNS)
          .order('created_at', { ascending: false });

        if (error) {
          if (isApprovalStatusColumnMissing(error)) {
            const fallback = await client
              .from('nominations')
              .select(LEGACY_RESPONSE_COLUMNS)
              .order('created_at', { ascending: false });

            if (fallback.error) {
              throw fallback.error;
            }

            return {
              success: true,
              data: (fallback.data ?? []).map(row => toStudentResponse(row as unknown as NominationRow)),
            };
          }

          throw error;
        }

        return {
          success: true,
          data: (data ?? []).map(row => toStudentResponse(row as unknown as NominationRow)),
        };
      } catch (err) {
        return { success: false, error: formatError(err) };
      }
    },

    async update(
      _event: unknown,
      payload: StudentResponseStatusUpdatePayload,
    ): Promise<IpcResult<StudentResponse>> {
      try {
        validateStatusUpdatePayload(payload);

        const { data, error } = await client
          .from('nominations')
          .update({ approval_status: payload.approvalStatus })
          .eq('id', payload.id)
          .select(RESPONSE_COLUMNS)
          .single();

        if (error) {
          if (isApprovalStatusColumnMissing(error)) {
            throw new Error(
              'Approval status is not available in the database yet. Ask the database owner to add the approval_status field before approving or rejecting responses.',
            );
          }

          throw error;
        }

        return { success: true, data: toStudentResponse(data as unknown as NominationRow) };
      } catch (err) {
        return { success: false, error: formatError(err) };
      }
    },
  };
}
