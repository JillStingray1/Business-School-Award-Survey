import test from 'node:test';
import assert from 'node:assert/strict';
import type { StudentResponse } from '../../shared/types';
import {
  filterAndSortResponses,
  getApprovalPresentation,
  getUndoTarget,
} from './studentResponseViewerModel';

const response = (overrides: Partial<StudentResponse>): StudentResponse => ({
  id: 1,
  studentName: 'Thoms',
  studentId: '12345678',
  scholarName: 'Jane Lee',
  unitCode: 'MGMT2002',
  unitName: 'Marketing',
  teachingPeriod: 'Semester 2',
  roleOfUnit: 'Tutor',
  statementSupport: 'A clear and useful supporting comment.',
  approvalStatus: 'Pending',
  createdAt: '2026-04-30T04:15:47.000Z',
  ...overrides,
});

test('filters by lecturer and approval status', () => {
  const rows = [
    response({ id: 1 }),
    response({ id: 2, scholarName: 'Daniel Kim', approvalStatus: 'Approved' }),
  ];

  assert.deepEqual(
    filterAndSortResponses(rows, 'jane', 'Pending', 'newest').map(row => row.id),
    [1],
  );
});

test('orders pending responses before reviewed responses', () => {
  const rows = [
    response({ id: 1, approvalStatus: 'Rejected' }),
    response({ id: 2, approvalStatus: 'Pending' }),
    response({ id: 3, approvalStatus: 'Approved' }),
  ];

  assert.deepEqual(
    filterAndSortResponses(rows, '', null, 'approval-status').map(row => row.id),
    [2, 3, 1],
  );
});

test('uses distinct presentation for every approval status', () => {
  assert.deepEqual(getApprovalPresentation('Pending'), {
    rowClass: 'status-pending', tagType: 'warning', needsAction: true,
  });
  assert.deepEqual(getApprovalPresentation('Approved'), {
    rowClass: 'status-approved', tagType: 'success', needsAction: false,
  });
  assert.deepEqual(getApprovalPresentation('Rejected'), {
    rowClass: 'status-rejected', tagType: 'error', needsAction: false,
  });
});

test('only reviewed decisions can be undone to pending', () => {
  assert.equal(getUndoTarget('Pending'), null);
  assert.equal(getUndoTarget('Approved'), 'Pending');
  assert.equal(getUndoTarget('Rejected'), 'Pending');
});
