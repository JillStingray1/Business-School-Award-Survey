import assert from 'node:assert/strict';
import test from 'node:test';
import * as XLSX from 'xlsx';
import {
  buildMasterDataUploadDraft,
  parseMasterDataWorkbook,
} from './masterDataUploadModel';

function workbookBytes(
  rows: Record<string, unknown>[],
  sheetName = 'Casual Tutors',
): ArrayBuffer {
  const workbook = XLSX.utils.book_new();
  const sheet = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(workbook, sheet, sheetName);
  return XLSX.write(workbook, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer;
}

function csvBytes(csv: string): ArrayBuffer {
  return new TextEncoder().encode(csv).buffer as ArrayBuffer;
}

test('parses valid Casual Tutors rows into scholar records', () => {
  const parsed = parseMasterDataWorkbook(workbookBytes([
    {
      'Staff Number': '00123456',
      Unit: 'MGMT2002',
      'Unit Name': 'Marketing',
      'Full Name': 'Jane Lee',
    },
    {
      'Staff Number': '00876543',
      Unit: 'CITS1001',
      'Unit Name': 'Software Engineering',
      'Full Name': 'Alex Smith',
    },
  ]));

  assert.equal(parsed.attemptedCount, 2);
  assert.equal(parsed.rejectedCount, 0);
  assert.deepEqual(parsed.errors, []);
  assert.deepEqual(parsed.records, [
    {
      name: 'Jane Lee',
      unit: 'MGMT2002',
      unit_name: 'Marketing',
      role_of_unit: 'Tutor',
      staff_id: '00123456',
    },
    {
      name: 'Alex Smith',
      unit: 'CITS1001',
      unit_name: 'Software Engineering',
      role_of_unit: 'Tutor',
      staff_id: '00876543',
    },
  ]);
});

test('rejects invalid rows and reports their Excel row number', () => {
  const parsed = parseMasterDataWorkbook(workbookBytes([
    {
      'Staff Number': '00123456',
      Unit: 'MGMT2002',
      'Unit Name': 'Marketing',
      'Full Name': 'Jane Lee',
    },
    {
      'Staff Number': '',
      Unit: 'CITS1001',
      'Unit Name': '',
      'Full Name': 'Alex Smith',
    },
  ], 'Casual Tutor'));

  assert.equal(parsed.attemptedCount, 2);
  assert.equal(parsed.records.length, 1);
  assert.equal(parsed.rejectedCount, 1);
  assert.deepEqual(parsed.errors, [
    {
      sheet: 'Casual Tutor',
      row: 3,
      message: 'Missing required fields: Staff Number, Unit Name.',
    },
  ]);
});

test('reports a workbook error when the tutor sheet is missing', () => {
  const parsed = parseMasterDataWorkbook(workbookBytes([], 'Unit Coordinators'));

  assert.equal(parsed.attemptedCount, 0);
  assert.equal(parsed.records.length, 0);
  assert.equal(parsed.rejectedCount, 0);
  assert.match(parsed.errors[0].message, /Casual Tutor/);
});

test('parses Casual Tutor CSV rows into tutor scholar records', () => {
  const parsed = parseMasterDataWorkbook(csvBytes([
    'Staff Number,Unit,Unit Name,Full Name',
    '00123456,CITS1001,Software Engineering,Jane Lee',
  ].join('\n')), 'tutors.csv');

  assert.equal(parsed.attemptedCount, 1);
  assert.equal(parsed.rejectedCount, 0);
  assert.deepEqual(parsed.errors, []);
  assert.deepEqual(parsed.records, [{
    name: 'Jane Lee',
    unit: 'CITS1001',
    unit_name: 'Software Engineering',
    role_of_unit: 'Tutor',
    staff_id: '00123456',
  }]);
});

test('parses Unit Coordinator CSV rows and preserves staff number text', () => {
  const parsed = parseMasterDataWorkbook(csvBytes([
    'CurriculumType,Code,Title,Status,Coordinator',
    'Unit,ACCT1101,Financial Accounting,Active,"Langa, Leo {00070409}"',
  ].join('\n')), 'unit-coordinators.csv');

  assert.equal(parsed.attemptedCount, 1);
  assert.equal(parsed.rejectedCount, 0);
  assert.deepEqual(parsed.errors, []);
  assert.deepEqual(parsed.records, [{
    name: 'Langa, Leo',
    unit: 'ACCT1101',
    unit_name: 'Financial Accounting',
    role_of_unit: 'Unit Coordinator',
    staff_id: '00070409',
  }]);
});

test('reports an actionable error for CSV files with unknown columns', () => {
  const parsed = parseMasterDataWorkbook(csvBytes([
    'Name,Course',
    'Jane Lee,CITS1001',
  ].join('\n')), 'unknown.csv');

  assert.equal(parsed.attemptedCount, 0);
  assert.equal(parsed.records.length, 0);
  assert.match(parsed.errors[0].message, /supported CSV columns/i);
});

test('builds success, partial, and failed upload summaries', () => {
  const valid = parseMasterDataWorkbook(workbookBytes([
    {
      'Staff Number': '00123456',
      Unit: 'MGMT2002',
      'Unit Name': 'Marketing',
      'Full Name': 'Jane Lee',
    },
  ]));
  const mixed = parseMasterDataWorkbook(workbookBytes([
    {
      'Staff Number': '00123456',
      Unit: 'MGMT2002',
      'Unit Name': 'Marketing',
      'Full Name': 'Jane Lee',
    },
    {
      'Staff Number': '',
      Unit: 'CITS1001',
      'Unit Name': 'Software Engineering',
      'Full Name': 'Alex Smith',
    },
  ]));

  assert.equal(buildMasterDataUploadDraft('valid.xlsx', valid, 1).status, 'Success');

  const partial = buildMasterDataUploadDraft('mixed.xlsx', mixed, 1);
  assert.equal(partial.status, 'Partial');
  assert.equal(partial.successfulCount, 1);
  assert.equal(partial.failedCount, 1);

  const failed = buildMasterDataUploadDraft(
    'valid.xlsx',
    valid,
    0,
    'Database write failed.',
  );
  assert.equal(failed.status, 'Failed');
  assert.equal(failed.failedCount, 1);
  assert.equal(failed.errors.at(-1)?.message, 'Database write failed.');
});
