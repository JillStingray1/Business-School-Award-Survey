import type { ApprovalStatus, StudentResponse } from '../../shared/types';

export type ResponseSortOrder = 'newest' | 'oldest' | 'approval-status';
export type ApprovalTagType = 'warning' | 'success' | 'error';

export interface ApprovalPresentation {
  rowClass: string;
  tagType: ApprovalTagType;
  needsAction: boolean;
}

const approvalStatusRank: Record<ApprovalStatus, number> = {
  Pending: 0,
  Approved: 1,
  Rejected: 2,
};

function timeValue(value?: string): number {
  if (!value) return 0;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
}

export function filterAndSortResponses(
  responses: StudentResponse[],
  lecturerFilter: string,
  approvalFilter: ApprovalStatus | null,
  sortOrder: ResponseSortOrder,
): StudentResponse[] {
  const query = lecturerFilter.trim().toLowerCase();

  return responses
    .filter(response => {
      const lecturerMatches = !query || response.scholarName.toLowerCase().includes(query);
      const approvalMatches = !approvalFilter || response.approvalStatus === approvalFilter;
      return lecturerMatches && approvalMatches;
    })
    .slice()
    .sort((a, b) => {
      if (sortOrder === 'approval-status') {
        return approvalStatusRank[a.approvalStatus] - approvalStatusRank[b.approvalStatus];
      }

      return sortOrder === 'newest'
        ? timeValue(b.createdAt) - timeValue(a.createdAt)
        : timeValue(a.createdAt) - timeValue(b.createdAt);
    });
}

export function getApprovalPresentation(status: ApprovalStatus): ApprovalPresentation {
  if (status === 'Approved') {
    return { rowClass: 'status-approved', tagType: 'success', needsAction: false };
  }

  if (status === 'Rejected') {
    return { rowClass: 'status-rejected', tagType: 'error', needsAction: false };
  }

  return { rowClass: 'status-pending', tagType: 'warning', needsAction: true };
}

export function getUndoTarget(status: ApprovalStatus): ApprovalStatus | null {
  return status === 'Pending' ? null : 'Pending';
}
