import assert from 'node:assert/strict';
import test from 'node:test';
import {
  MasterDataUploadLogStore,
  type MasterDataUploadLogGateway,
  type MasterDataUploadLogInsertRow,
  type MasterDataUploadLogRow,
} from './masterDataUploadLogStore';
import type { MasterDataUploadError } from '../../shared/types';

class FakeUploadLogGateway implements MasterDataUploadLogGateway {
  insertedRow: MasterDataUploadLogInsertRow | null = null;

  constructor(
    private readonly rows: MasterDataUploadLogRow[] = [],
    private readonly insertedResult?: MasterDataUploadLogRow,
  ) {}

  async listRows(): Promise<MasterDataUploadLogRow[]> {
    return this.rows;
  }

  async insertRow(row: MasterDataUploadLogInsertRow): Promise<MasterDataUploadLogRow> {
    this.insertedRow = row;

    if (!this.insertedResult) {
      throw new Error('No inserted result configured.');
    }

    return this.insertedResult;
  }
}

const uploadError: MasterDataUploadError = {
  sheet: 'Casual Tutors',
  row: 4,
  message: 'Missing required field: Staff Number.',
};

const databaseRow: MasterDataUploadLogRow = {
  id: 'upload-1',
  file_name: 'tutors.xlsx',
  uploaded_at: '2026-08-26T01:00:00.000Z',
  attempted_count: 3,
  successful_count: 2,
  failed_count: 1,
  status: 'Partial',
  errors: [uploadError],
  uploaded_by: null,
};

test('maps Supabase rows to renderer upload-log objects', async () => {
  const store = new MasterDataUploadLogStore(new FakeUploadLogGateway([databaseRow]));

  assert.deepEqual(await store.list(), [
    {
      id: 'upload-1',
      fileName: 'tutors.xlsx',
      uploadedAt: '2026-08-26T01:00:00.000Z',
      attemptedCount: 3,
      successfulCount: 2,
      failedCount: 1,
      status: 'Partial',
      errors: [uploadError],
      uploadedBy: null,
    },
  ]);
});

test('inserts a snake-case database row and returns the created log', async () => {
  const gateway = new FakeUploadLogGateway([], databaseRow);
  const store = new MasterDataUploadLogStore(gateway);

  const created = await store.append({
    fileName: 'tutors.xlsx',
    attemptedCount: 3,
    successfulCount: 2,
    failedCount: 1,
    status: 'Partial',
    errors: [uploadError],
  });

  assert.deepEqual(gateway.insertedRow, {
    file_name: 'tutors.xlsx',
    attempted_count: 3,
    successful_count: 2,
    failed_count: 1,
    status: 'Partial',
    errors: [uploadError],
  });
  assert.equal(created.id, 'upload-1');
  assert.equal(created.uploadedAt, '2026-08-26T01:00:00.000Z');
});

test('ignores malformed JSON error entries returned by the database', async () => {
  const row: MasterDataUploadLogRow = {
    ...databaseRow,
    errors: [
      uploadError,
      { sheet: 'Casual Tutors' },
      'invalid',
    ],
  };
  const store = new MasterDataUploadLogStore(new FakeUploadLogGateway([row]));

  const [log] = await store.list();

  assert.deepEqual(log.errors, [uploadError]);
});
