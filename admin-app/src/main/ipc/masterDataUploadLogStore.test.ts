import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { JsonMasterDataUploadLogStore } from './masterDataUploadLogStore';

test('returns an empty history when no local log file exists', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'master-data-log-'));

  try {
    const store = new JsonMasterDataUploadLogStore(path.join(directory, 'uploads.json'));
    assert.deepEqual(await store.list(), []);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('persists upload results and lists the newest upload first', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'master-data-log-'));
  const filePath = path.join(directory, 'uploads.json');
  const dates = [
    new Date('2026-05-01T01:00:00.000Z'),
    new Date('2026-05-02T01:00:00.000Z'),
  ];
  const ids = ['upload-1', 'upload-2'];
  const store = new JsonMasterDataUploadLogStore(
    filePath,
    () => dates.shift() ?? new Date(0),
    () => ids.shift() ?? 'fallback-id',
  );

  try {
    await store.append({
      fileName: 'first.xlsx',
      attemptedCount: 2,
      successfulCount: 1,
      failedCount: 1,
      status: 'Partial',
      errors: [{ sheet: 'Casual Tutors', row: 3, message: 'Missing Staff Number.' }],
    });
    await store.append({
      fileName: 'second.xlsx',
      attemptedCount: 3,
      successfulCount: 3,
      failedCount: 0,
      status: 'Success',
      errors: [],
    });

    const reloaded = new JsonMasterDataUploadLogStore(filePath);
    const history = await reloaded.list();

    assert.equal(history.length, 2);
    assert.equal(history[0].id, 'upload-2');
    assert.equal(history[0].fileName, 'second.xlsx');
    assert.equal(history[1].errors[0].row, 3);
    assert.equal(history[1].errors[0].message, 'Missing Staff Number.');
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
