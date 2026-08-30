import test from 'node:test';
import assert from 'node:assert/strict';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createStudentResponseHandlers } from './studentResponseHandlers';

interface QueryResult {
  data: unknown;
  error: unknown;
}

const nominationRow = {
  id: 7,
  student_name: 'Thoms',
  student_id: '12345678',
  scholar_name: 'Jane Lee',
  unit_code: 'MGMT2002',
  unit_name: 'Marketing',
  teaching_period: 'Semester 2',
  role_of_unit: 'Tutor',
  statement_support: 'A clear supporting comment.',
  approval_status: 'Approved',
  created_at: '2026-04-30T04:15:47.000Z',
};

function createListClient(results: QueryResult[]): SupabaseClient {
  let resultIndex = 0;

  return {
    from(table: string) {
      assert.equal(table, 'nominations');
      return {
        select() {
          return {
            order() {
              return Promise.resolve(results[resultIndex++]);
            },
          };
        },
      };
    },
  } as unknown as SupabaseClient;
}

function createUpdateClient(
  result: QueryResult,
  onUpdate: (values: unknown, id: number) => void,
): SupabaseClient {
  return {
    from(table: string) {
      assert.equal(table, 'nominations');
      return {
        update(values: unknown) {
          return {
            eq(column: string, id: number) {
              assert.equal(column, 'id');
              onUpdate(values, id);
              return {
                select() {
                  return {
                    single() {
                      return Promise.resolve(result);
                    },
                  };
                },
              };
            },
          };
        },
      };
    },
  } as unknown as SupabaseClient;
}

test('lists and maps responses with their approval status', async () => {
  const handlers = createStudentResponseHandlers(createListClient([
    { data: [nominationRow], error: null },
  ]));

  const result = await handlers.list();

  assert.equal(result.success, true);
  assert.equal(result.data?.[0].approvalStatus, 'Approved');
  assert.equal(result.data?.[0].studentName, 'Thoms');
});

test('falls back to pending when the approval_status column is unavailable', async () => {
  const handlers = createStudentResponseHandlers(createListClient([
    { data: null, error: { code: 'PGRST204', message: 'approval_status was not found' } },
    { data: [{ ...nominationRow, approval_status: undefined }], error: null },
  ]));

  const result = await handlers.list();

  assert.equal(result.success, true);
  assert.equal(result.data?.[0].approvalStatus, 'Pending');
});

test('updates the selected response approval status', async () => {
  let updateValues: unknown;
  let updatedId = 0;
  const handlers = createStudentResponseHandlers(createUpdateClient(
    { data: { ...nominationRow, approval_status: 'Rejected' }, error: null },
    (values, id) => {
      updateValues = values;
      updatedId = id;
    },
  ));

  const result = await handlers.update(undefined, {
    id: 7,
    approvalStatus: 'Rejected',
  });

  assert.deepEqual(updateValues, { approval_status: 'Rejected' });
  assert.equal(updatedId, 7);
  assert.equal(result.success, true);
  assert.equal(result.data?.approvalStatus, 'Rejected');
});

test('rejects an invalid update before accessing the database', async () => {
  let accessedDatabase = false;
  const client = {
    from() {
      accessedDatabase = true;
      throw new Error('Database should not be accessed');
    },
  } as unknown as SupabaseClient;
  const handlers = createStudentResponseHandlers(client);

  const result = await handlers.update(undefined, {
    id: 0,
    approvalStatus: 'Approved',
  });

  assert.equal(accessedDatabase, false);
  assert.equal(result.success, false);
  assert.match(result.error ?? '', /valid nomination id/i);
});
