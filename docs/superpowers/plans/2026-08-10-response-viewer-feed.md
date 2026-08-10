# Student Response Viewer Feed Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Synchronize the confirmed approval-status documentation and turn the Student Response Viewer into a compact, accessible moderation feed that foregrounds students and comments.

**Architecture:** Keep database access in the existing Electron IPC boundary. Move filter, sort, colour-presentation, and undo-target rules into a small renderer model module so they can be tested without mounting Vue. Keep the Vue view responsible for rendering, popover visibility, pagination, and invoking the existing status-update transaction.

**Tech Stack:** Electron Forge, Vue 3, TypeScript, Naive UI, Supabase, Node test runner

---

### Task 1: Synchronize the confirmed database documentation

**Files:**
- Update from remote: `database.md`
- Preserve unchanged: `admin-app/src/main/ipc/handlers.ts`
- Preserve unchanged: `admin-app/src/main/preload.ts`
- Preserve unchanged: `admin-app/src/shared/types/index.ts`

- [ ] **Step 1: Confirm the local feature diff before merging**

Run:

```powershell
git status --short --branch
git diff --name-only
```

Expected: the branch is `codex/issue-8-approve-reject`; only the four existing approval-feature files are modified; the branch is one commit behind `origin/main`.

- [ ] **Step 2: Merge the remote documentation commit locally**

Run:

```powershell
git merge --no-edit origin/main
```

Expected: a clean local merge that updates `database.md`. No remote push occurs.

- [ ] **Step 3: Verify the database contract used by the app**

Run:

```powershell
rg -n "approval_status|Pending|Approved|Rejected" database.md admin-app/src/main/ipc/handlers.ts admin-app/src/shared/types/index.ts
```

Expected: documentation and code use `nominations.approval_status` and the same three title-case values.

### Task 2: Add testable response-viewer rules

**Files:**
- Create: `admin-app/src/renderer/views/studentResponseViewerModel.ts`
- Create: `admin-app/src/renderer/views/studentResponseViewerModel.test.ts`
- Create: `admin-app/tsconfig.viewer-tests.json`
- Modify: `admin-app/package.json`
- Modify: `admin-app/.gitignore`

- [ ] **Step 1: Write the failing model tests**

Create `studentResponseViewerModel.test.ts` with tests that assert lecturer/status filtering, approval-status ordering, visual presentation, and undo behaviour:

```ts
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
```

- [ ] **Step 2: Add the isolated test compiler configuration and script**

Create `tsconfig.viewer-tests.json`:

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "module": "commonjs",
    "moduleResolution": "node",
    "outDir": ".viewer-test-dist",
    "rootDir": "src",
    "sourceMap": false,
    "noEmit": false,
    "types": ["node"]
  },
  "include": [
    "src/shared/types/index.ts",
    "src/renderer/views/studentResponseViewerModel.ts",
    "src/renderer/views/studentResponseViewerModel.test.ts"
  ]
}
```

Add `.viewer-test-dist/` to `admin-app/.gitignore` and add this script to `package.json`:

```json
"test:viewer": "tsc -p tsconfig.viewer-tests.json && node --test .viewer-test-dist/renderer/views/studentResponseViewerModel.test.js"
```

- [ ] **Step 3: Run the tests and verify the missing model fails**

Run:

```powershell
npm run test:viewer
```

Expected: FAIL because `studentResponseViewerModel.ts` does not exist.

- [ ] **Step 4: Implement the minimal model**

Create `studentResponseViewerModel.ts`:

```ts
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
```

- [ ] **Step 5: Run the model tests and commit**

Run:

```powershell
npm run test:viewer
```

Expected: four passing tests.

Commit locally:

```powershell
git add admin-app/.gitignore admin-app/package.json admin-app/tsconfig.viewer-tests.json admin-app/src/renderer/views/studentResponseViewerModel.ts admin-app/src/renderer/views/studentResponseViewerModel.test.ts
git commit -m "test: cover response viewer moderation rules"
```

### Task 3: Replace the response cards with the compact moderation feed

**Files:**
- Modify: `admin-app/src/renderer/views/StudentResponseViewer.vue`

- [ ] **Step 1: Use the tested model from the Vue view**

Import the model, Naive UI popover/icon components, and the person icon:

```ts
import {
  NAlert, NButton, NFlex, NH2, NIcon, NInput, NPagination,
  NPopover, NPopconfirm, NSelect, NSpin, NTag, NText,
} from 'naive-ui';
import { PersonOutline } from '@vicons/ionicons5';
import {
  filterAndSortResponses,
  getApprovalPresentation,
  getUndoTarget,
} from './studentResponseViewerModel';
import type { ResponseSortOrder } from './studentResponseViewerModel';
```

Use `filterAndSortResponses` in the computed list and add one popover state:

```ts
const sortOrder = ref<ResponseSortOrder>('newest');
const visibleTeacherId = ref<number | null>(null);

const filteredResponses = computed(() => filterAndSortResponses(
  responses.value,
  lecturerFilter.value,
  approvalFilter.value,
  sortOrder.value,
));
```

- [ ] **Step 2: Replace each response article with the feed post**

Use this structure inside the existing `v-for`:

```vue
<article
  v-for="response in pagedResponses"
  :key="response.id"
  class="response-row"
  :class="getApprovalPresentation(response.approvalStatus).rowClass"
>
  <div class="student-avatar" aria-hidden="true">
    {{ getStudentInitial(response.studentName) }}
  </div>

  <div class="post-main">
    <header class="post-header">
      <strong class="student-name">{{ response.studentName }}</strong>
      <span class="student-number">Student ID: {{ response.studentId }}</span>
      <span class="submitted-at">{{ formatDate(response.createdAt) }}</span>
    </header>

    <div class="comment-copy">
      <span class="eyebrow">Student comment</span>
      <p class="feedback">{{ response.statementSupport }}</p>
    </div>

    <footer class="post-footer">
      <n-tag
        :type="getApprovalPresentation(response.approvalStatus).tagType"
        size="small"
        round
      >
        {{ response.approvalStatus }}
      </n-tag>

      <n-flex v-if="response.approvalStatus === 'Pending'" :gap="8">
        <n-button size="tiny" type="success" ghost :loading="updatingId === response.id"
          @click="updateStatus(response.id, 'Approved')">Approve</n-button>
        <n-popconfirm @positive-click="updateStatus(response.id, 'Rejected')">
          <template #trigger>
            <n-button size="tiny" type="error" ghost :loading="updatingId === response.id">Reject</n-button>
          </template>
          Reject this response?
        </n-popconfirm>
      </n-flex>

      <n-popconfirm
        v-else
        @positive-click="updateStatus(response.id, getUndoTarget(response.approvalStatus) || 'Pending')"
      >
        <template #trigger>
          <n-button size="tiny" ghost :loading="updatingId === response.id">Undo decision</n-button>
        </template>
        Return this response to Pending?
      </n-popconfirm>
    </footer>
  </div>

  <n-popover
    trigger="manual"
    placement="left-start"
    :show="visibleTeacherId === response.id"
  >
    <template #trigger>
      <n-button
        class="teacher-button"
        circle
        quaternary
        size="small"
        aria-label="Show nominated teacher details"
        @mouseenter="visibleTeacherId = response.id"
        @mouseleave="visibleTeacherId = null"
        @focus="visibleTeacherId = response.id"
        @blur="visibleTeacherId = null"
      >
        <template #icon><n-icon><person-outline /></n-icon></template>
      </n-button>
    </template>
    <div class="teacher-popover">
      <span class="eyebrow">Nominated teacher</span>
      <strong>{{ response.scholarName }}</strong>
      <span>Unit: {{ response.unitCode }} · {{ response.unitName || 'Not provided' }}</span>
      <span>Role: {{ response.roleOfUnit }}</span>
      <span>Teaching period: {{ response.teachingPeriod }}</span>
    </div>
  </n-popover>
</article>
```

- [ ] **Step 3: Replace the large-card styling with dense feed styling**

Use a two-column post grid, a six-pixel separator, and status-specific accents:

```css
.response-window { overflow:hidden; border:1px solid #d8dde6; border-radius:8px; background:#edf0f4; }
.response-row { position:relative; display:grid; grid-template-columns:38px minmax(0,1fr); gap:10px; padding:10px 56px 10px 12px; border-left:4px solid transparent; background:#fff; }
.response-row + .response-row { border-top:6px solid #edf0f4; }
.status-pending { border-left-color:#f0a020; background:#fffdfa; }
.status-approved { border-left-color:#18a058; }
.status-rejected { border-left-color:#d03050; }
.student-avatar { width:34px; height:34px; display:grid; place-items:center; border:2px solid #18a058; border-radius:50%; background:#eefaf3; color:#08783a; font-size:13px; font-weight:800; }
.post-header { display:flex; align-items:baseline; gap:7px; min-width:0; }
.submitted-at { margin-left:auto; color:#7a8492; font-size:11px; }
.comment-copy { margin-top:4px; }
.feedback { margin:2px 0 8px; font-size:13px; line-height:1.42; color:#1f2937; }
.post-footer { display:flex; align-items:center; justify-content:space-between; gap:10px; }
.teacher-button { position:absolute; top:9px; right:12px; border:1px solid #cbd2dc; background:#fff; }
.teacher-popover { display:grid; gap:3px; min-width:210px; }
.teacher-popover strong { color:#111827; font-size:14px; }
.teacher-popover span:not(.eyebrow) { color:#475467; font-size:12px; }
```

At narrow widths, allow the header and footer to wrap while keeping the teacher button fixed at the upper-right.

- [ ] **Step 4: Run tests and build the renderer**

Run:

```powershell
npm run test:viewer
npx vite build --config vite.renderer.config.mts
```

Expected: four passing model tests and a successful Vite build.

- [ ] **Step 5: Commit the local feature implementation**

Run:

```powershell
git add admin-app/src/renderer/views/StudentResponseViewer.vue admin-app/src/main/ipc/handlers.ts admin-app/src/main/preload.ts admin-app/src/shared/types/index.ts
git commit -m "feat: add compact response moderation feed"
```

### Task 4: Verify the complete local application

**Files:**
- Verify only; no expected source changes

- [ ] **Step 1: Run repository checks**

Run:

```powershell
npm run test:viewer
npm run package
git diff --check
git status --short --branch
```

Expected: tests and Electron Forge packaging pass; no whitespace errors; the branch is only ahead of `origin/main` and nothing has been pushed.

- [ ] **Step 2: Launch the Electron app locally**

Run from `admin-app`:

```powershell
npm start
```

Expected: the Electron window opens and Student Responses shows the compact feed.

- [ ] **Step 3: Perform the visual and interaction checklist**

Verify locally without changing unrelated production records:

- Student name, labelled ID, submission time, and full comment dominate each post.
- Teacher details are hidden until hover or keyboard focus on the upper-right icon.
- Pending is visually stronger than Approved and Rejected.
- Status filter, lecturer filter, sorting, pagination, and refresh still work.
- Pending shows Approve and Reject.
- Approved and Rejected show Undo decision, which confirms before returning to Pending.
- Posts remain compact and clearly separated at desktop and narrow widths.
- No remote branch or pull request is created.
