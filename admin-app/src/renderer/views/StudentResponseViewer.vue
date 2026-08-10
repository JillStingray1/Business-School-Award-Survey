<template>
  <section class="student-response-viewer" aria-labelledby="page-title">
    <header class="viewer-header">
      <div>
        <n-h2 id="page-title" class="page-title">Student Response Viewer</n-h2>
        <n-text depth="3">Review submitted student nomination feedback from Supabase.</n-text>
      </div>

      <n-flex :gap="10" align="center" wrap>
        <n-tag round>{{ responses.length }} responses</n-tag>
        <n-tag round>{{ filteredResponses.length }} matched</n-tag>
        <n-tag round>{{ pagedResponses.length }} shown</n-tag>
        <n-button size="small" :loading="loading" @click="loadResponses">Refresh</n-button>
      </n-flex>
    </header>

    <div class="toolbar">
      <n-input
        v-model:value="lecturerFilter"
        clearable
        placeholder="Filter by lecturer name"
        class="lecturer-filter"
      />
      <n-select
        v-model:value="approvalFilter"
        :options="approvalFilterOptions"
        clearable
        placeholder="Filter by approval status"
        class="status-filter"
      />
      <n-select
        v-model:value="sortOrder"
        :options="sortOptions"
        class="sort-select"
      />
    </div>

    <n-alert v-if="error" type="error" closable class="error-alert" @close="error = ''">
      {{ error }}
    </n-alert>

    <n-spin :show="loading">
      <div class="response-window">
        <div class="pager-bar">
          <span>Page {{ currentPage }} of {{ totalPages }}</span>
          <n-pagination
            v-model:page="currentPage"
            v-model:page-size="pageSize"
            :item-count="filteredResponses.length"
            :page-sizes="pageSizeOptions"
            show-size-picker
            show-quick-jumper
            size="small"
          />
        </div>

        <div v-if="pagedResponses.length === 0" class="empty">
          No student responses found.
        </div>

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
                <n-button
                  size="tiny"
                  type="success"
                  ghost
                  :loading="updatingId === response.id"
                  @click="updateStatus(response.id, 'Approved')"
                >
                  Approve
                </n-button>
                <n-popconfirm @positive-click="updateStatus(response.id, 'Rejected')">
                  <template #trigger>
                    <n-button
                      size="tiny"
                      type="error"
                      ghost
                      :loading="updatingId === response.id"
                    >
                      Reject
                    </n-button>
                  </template>
                  Reject this response?
                </n-popconfirm>
              </n-flex>

              <n-popconfirm v-else @positive-click="undoDecision(response.id, response.approvalStatus)">
                <template #trigger>
                  <n-button size="tiny" ghost :loading="updatingId === response.id">
                    Undo decision
                  </n-button>
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
                :aria-expanded="visibleTeacherId === response.id"
                @mouseenter="visibleTeacherId = response.id"
                @mouseleave="visibleTeacherId = null"
                @focus="visibleTeacherId = response.id"
                @blur="visibleTeacherId = null"
              >
                <template #icon>
                  <n-icon><person-outline /></n-icon>
                </template>
              </n-button>
            </template>

            <div class="teacher-popover">
              <span class="eyebrow">Nominated teacher</span>
              <strong>{{ response.scholarName }}</strong>
              <span>Unit: {{ response.unitCode }} / {{ response.unitName || 'Not provided' }}</span>
              <span>Role: {{ response.roleOfUnit }}</span>
              <span>Teaching period: {{ response.teachingPeriod }}</span>
            </div>
          </n-popover>
        </article>
      </div>
    </n-spin>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import {
  NAlert,
  NButton,
  NFlex,
  NH2,
  NIcon,
  NInput,
  NPagination,
  NPopover,
  NPopconfirm,
  NSelect,
  NSpin,
  NTag,
  NText,
} from 'naive-ui';
import type { SelectOption } from 'naive-ui';
import { PersonOutline } from '@vicons/ionicons5';
import type { ApprovalStatus, StudentResponse } from '../../shared/types';
import {
  filterAndSortResponses,
  getApprovalPresentation,
  getUndoTarget,
} from './studentResponseViewerModel';
import type { ResponseSortOrder } from './studentResponseViewerModel';

const responses = ref<StudentResponse[]>([]);
const loading = ref(false);
const error = ref('');
const currentPage = ref(1);
const pageSize = ref(5);
const lecturerFilter = ref('');
const sortOrder = ref<ResponseSortOrder>('newest');
const approvalFilter = ref<ApprovalStatus | null>(null);
const updatingId = ref<number | null>(null);
const visibleTeacherId = ref<number | null>(null);

const pageSizeOptions = [5, 8, 10];

const sortOptions: SelectOption[] = [
  { label: 'Newest first', value: 'newest' },
  { label: 'Oldest first', value: 'oldest' },
  { label: 'Approval status', value: 'approval-status' },
];

const approvalFilterOptions: SelectOption[] = [
  { label: 'Pending', value: 'Pending' },
  { label: 'Approved', value: 'Approved' },
  { label: 'Rejected', value: 'Rejected' },
];

const filteredResponses = computed(() => filterAndSortResponses(
  responses.value,
  lecturerFilter.value,
  approvalFilter.value,
  sortOrder.value,
));

const totalPages = computed(() => Math.max(1, Math.ceil(filteredResponses.value.length / pageSize.value)));

const pagedResponses = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value;
  return filteredResponses.value.slice(start, start + pageSize.value);
});

function getStudentInitial(name: string): string {
  const trimmed = name.trim();
  return trimmed ? trimmed.charAt(0).toUpperCase() : '?';
}

function formatDate(value?: string): string {
  if (!value) return 'Not recorded';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

async function loadResponses(): Promise<void> {
  loading.value = true;
  error.value = '';

  try {
    const result = await window.electronAPI.listStudentResponses();

    if (!result.success) {
      throw new Error(result.error || 'Failed to load student responses.');
    }

    responses.value = result.data ?? [];
    currentPage.value = 1;
  } catch (err) {
    error.value = err instanceof Error ? err.message : String(err);
  } finally {
    loading.value = false;
  }
}

async function updateStatus(id: number, approvalStatus: ApprovalStatus): Promise<void> {
  updatingId.value = id;
  error.value = '';

  try {
    const result = await window.electronAPI.updateStudentResponseStatus({ id, approvalStatus });

    if (!result.success || !result.data) {
      throw new Error(result.error || 'Failed to update approval status.');
    }

    const index = responses.value.findIndex(response => response.id === id);
    if (index !== -1) {
      responses.value[index] = result.data;
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : String(err);
  } finally {
    updatingId.value = null;
  }
}

async function undoDecision(id: number, currentStatus: ApprovalStatus): Promise<void> {
  const target = getUndoTarget(currentStatus);
  if (target) {
    await updateStatus(id, target);
  }
}

watch([lecturerFilter, sortOrder, approvalFilter, pageSize], () => {
  currentPage.value = 1;
});

watch(totalPages, (pages) => {
  if (currentPage.value > pages) {
    currentPage.value = pages;
  }
});

onMounted(loadResponses);
</script>

<style scoped>
.student-response-viewer {
  max-width: 1200px;
}

.viewer-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 20px;
}

.page-title {
  margin: 0 0 4px;
}

.toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.lecturer-filter {
  width: min(360px, 100%);
}

.status-filter {
  width: 210px;
}

.sort-select {
  width: 180px;
}

.error-alert {
  margin-bottom: 16px;
}

.response-window {
  overflow: hidden;
  border: 1px solid #d8dde6;
  border-radius: 8px;
  background: #edf0f4;
  box-shadow: 0 12px 30px rgba(20, 33, 61, 0.07);
}

.pager-bar {
  min-height: 50px;
  padding: 9px 14px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  color: #667085;
  background: #fbfcfe;
  border-bottom: 1px solid #d8dde6;
}

.response-row {
  position: relative;
  display: grid;
  grid-template-columns: 38px minmax(0, 1fr);
  gap: 10px;
  padding: 10px 56px 10px 12px;
  border-left: 4px solid transparent;
  background: #ffffff;
}

.response-row + .response-row {
  border-top: 6px solid #edf0f4;
}

.status-pending {
  border-left-color: #f0a020;
  background: #fffdfa;
}

.status-approved {
  border-left-color: #18a058;
}

.status-rejected {
  border-left-color: #d03050;
}

.student-avatar {
  width: 34px;
  height: 34px;
  display: grid;
  place-items: center;
  border: 2px solid #18a058;
  border-radius: 50%;
  background: #eefaf3;
  color: #08783a;
  font-size: 13px;
  font-weight: 800;
}

.post-main {
  min-width: 0;
}

.post-header {
  display: flex;
  align-items: baseline;
  gap: 7px;
  min-width: 0;
}

.student-name {
  color: #111827;
  font-size: 14px;
  font-weight: 800;
}

.student-number,
.submitted-at {
  color: #7a8492;
  font-size: 11px;
}

.submitted-at {
  margin-left: auto;
  white-space: nowrap;
}

.comment-copy {
  margin-top: 4px;
}

.eyebrow {
  color: #667085;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0;
  text-transform: uppercase;
}

.feedback {
  margin: 2px 0 8px;
  color: #1f2937;
  font-size: 13px;
  line-height: 1.42;
}

.post-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.status-pending :deep(.n-tag) {
  color: #8a5400;
  background: #fff0c2;
  border-color: #f0c35d;
  font-weight: 700;
}

.teacher-button {
  position: absolute;
  top: 9px;
  right: 12px;
  border: 1px solid #cbd2dc;
  background: #ffffff;
}

.teacher-button:hover,
.teacher-button:focus-visible {
  color: #08783a;
  border-color: #18a058;
  background: #eefaf3;
}

.teacher-popover {
  display: grid;
  gap: 3px;
  min-width: 210px;
}

.teacher-popover strong {
  color: #111827;
  font-size: 14px;
}

.teacher-popover span:not(.eyebrow) {
  color: #475467;
  font-size: 12px;
}

.empty {
  padding: 48px 24px;
  text-align: center;
  color: #667085;
  background: #ffffff;
}

@media (max-width: 960px) {
  .viewer-header,
  .toolbar,
  .pager-bar {
    display: block;
  }

  .viewer-header :deep(.n-flex) {
    margin-top: 14px;
  }

  .toolbar > * + * {
    margin-top: 10px;
  }

  .lecturer-filter,
  .status-filter,
  .sort-select {
    width: 100%;
  }

  .pager-bar :deep(.n-pagination) {
    margin-top: 10px;
  }
}

@media (max-width: 640px) {
  .response-row {
    grid-template-columns: 34px minmax(0, 1fr);
    padding-right: 50px;
  }

  .post-header {
    align-items: flex-start;
    flex-wrap: wrap;
  }

  .submitted-at {
    width: 100%;
    margin-left: 0;
  }

  .post-footer {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
