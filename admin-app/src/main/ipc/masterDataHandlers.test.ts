import assert from 'node:assert/strict';
import test from 'node:test';
import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  MasterDataUploadDraft,
  MasterDataUploadLog,
  ScholarData,
} from '../../shared/types';
import { createMasterDataHandlers } from './masterDataHandlers';

const uploadedAt = '2026-09-20T08:00:00.000Z';

function csvBytes(csv: string): ArrayBuffer {
  return new TextEncoder().encode(csv).buffer as ArrayBuffer;
}

function toLog(draft: MasterDataUploadDraft): MasterDataUploadLog {
  return {
    ...draft,
    id: 'upload-1',
    uploadedAt,
    uploadedBy: null,
  };
}

function createInsertClient(
  result: { data: unknown; error: unknown },
  onInsert: (records: ScholarData[]) => void = () => undefined,
): SupabaseClient {
  return {
    from(table: string) {
      assert.equal(table, 'scholars');
      return {
        insert(records: ScholarData[]) {
          onInsert(records);
          return {
            select(columns: string) {
              assert.equal(columns, 'id');
              return Promise.resolve(result);
            },
          };
        },
      };
    },
  } as unknown as SupabaseClient;
}

test('lists upload history through the master data handler', async () => {
  const expected = toLog({
    fileName: 'tutors.csv',
    attemptedCount: 1,
    successfulCount: 1,
    failedCount: 0,
    status: 'Success',
    errors: [],
  });
  const handlers = createMasterDataHandlers(
    createInsertClient({ data: [], error: null }),
    {
      list: async () => [expected],
      append: async draft => toLog(draft),
    },
  );

  const result = await handlers.list();

  assert.deepEqual(result, { success: true, data: [expected] });
});

test('uploads parsed records and stores the upload result', async () => {
  let insertedRecords: ScholarData[] = [];
  let appendedDraft: MasterDataUploadDraft | undefined;
  const handlers = createMasterDataHandlers(
    createInsertClient({ data: [{ id: 7 }], error: null }, records => {
      insertedRecords = records;
    }),
    {
      list: async () => [],
      append: async draft => {
        appendedDraft = draft;
        return toLog(draft);
      },
    },
  );

  const result = await handlers.upload(undefined, {
    fileName: 'tutors.csv',
    bytes: csvBytes([
      'Staff Number,Unit,Unit Name,Full Name',
      '00123456,CITS1001,Software Engineering,Jane Lee',
    ].join('\n')),
  });

  assert.deepEqual(insertedRecords, [{
    name: 'Jane Lee',
    unit: 'CITS1001',
    unit_name: 'Software Engineering',
    role_of_unit: 'Tutor',
    staff_id: '00123456',
  }]);
  assert.equal(appendedDraft?.status, 'Success');
  assert.equal(appendedDraft?.successfulCount, 1);
  assert.equal(result.success, true);
  assert.equal(result.data?.status, 'Success');
});

test('stores a failed upload when the database rejects the batch', async () => {
  let appendedDraft: MasterDataUploadDraft | undefined;
  const handlers = createMasterDataHandlers(
    createInsertClient({ data: null, error: { message: 'duplicate key' } }),
    {
      list: async () => [],
      append: async draft => {
        appendedDraft = draft;
        return toLog(draft);
      },
    },
  );

  const result = await handlers.upload(undefined, {
    fileName: 'tutors.csv',
    bytes: csvBytes([
      'Staff Number,Unit,Unit Name,Full Name',
      '00123456,CITS1001,Software Engineering,Jane Lee',
    ].join('\n')),
  });

  assert.equal(appendedDraft?.status, 'Failed');
  assert.equal(appendedDraft?.successfulCount, 0);
  assert.match(appendedDraft?.errors[0]?.message ?? '', /duplicate key/i);
  assert.equal(result.success, true);
  assert.equal(result.data?.status, 'Failed');
});
