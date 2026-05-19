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
        v-model:value="sortOrder"
        :options="sortOptions"
        class="sort-select"
      />
    </div>

    <n-alert v-if="error" type="error" closable style="margin-bottom: 16px;" @close="error = ''">
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

        <article v-for="response in pagedResponses" :key="response.id" class="response-row">
          <div class="response-top">
            <div class="student-block">
              <div class="student-avatar" aria-hidden="true">
                {{ getStudentInitial(response.studentName) }}
              </div>
              <div class="student-copy">
                <span class="eyebrow">Student</span>
                <strong class="student-name">{{ response.studentName }}</strong>
                <span class="student-number">Student ID: {{ response.studentId }}</span>
              </div>
            </div>

            <div class="nomination-card">
              <div class="nominee-summary">
                <span class="eyebrow">Nominates</span>
                <div class="lecturer-name">{{ response.scholarName }}</div>
                <div class="nominee-meta">
                  {{ response.roleOfUnit }} · {{ response.teachingPeriod }}
                </div>
              </div>

              <div class="unit-summary">
                <span class="meta-label">Unit</span>
                <span class="unit-code">{{ response.unitCode }}</span>
                <span class="unit-name">{{ response.unitName || 'Unit name not provided' }}</span>
              </div>

              <div class="submitted-at">
                <span class="meta-label">Submitted</span>
                {{ formatDate(response.createdAt) }}
              </div>
            </div>
          </div>

          <div class="comment-block">
            <span class="eyebrow">Comment</span>
            <p class="feedback">{{ response.statementSupport }}</p>
          </div>
        </article>
      </div>
    </n-spin>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import {
  NAlert, NButton, NFlex, NH2, NInput, NPagination, NSelect, NSpin, NTag, NText,
} from 'naive-ui';
import type { SelectOption } from 'naive-ui';
import type { StudentResponse } from '../../shared/types';

const responses = ref<StudentResponse[]>([]);
const loading = ref(false);
const error = ref('');
const currentPage = ref(1);
const pageSize = ref(5);
const lecturerFilter = ref('');
const sortOrder = ref<'newest' | 'oldest'>('newest');

const pageSizeOptions = [5, 8, 10];

const sortOptions: SelectOption[] = [
  { label: 'Newest first', value: 'newest' },
  { label: 'Oldest first', value: 'oldest' },
];

const filteredResponses = computed(() => {
  const query = lecturerFilter.value.trim().toLowerCase();

  return responses.value
    .filter(response => !query || response.scholarName.toLowerCase().includes(query))
    .slice()
    .sort((a, b) => {
      const aTime = getTimeValue(a.createdAt);
      const bTime = getTimeValue(b.createdAt);
      return sortOrder.value === 'newest' ? bTime - aTime : aTime - bTime;
    });
});

const totalPages = computed(() => Math.max(1, Math.ceil(filteredResponses.value.length / pageSize.value)));

const pagedResponses = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value;
  return filteredResponses.value.slice(start, start + pageSize.value);
});

function getTimeValue(value?: string): number {
  if (!value) return 0;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
}

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

watch([lecturerFilter, sortOrder, pageSize], () => {
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

.sort-select {
  width: 180px;
}

.response-window {
  min-height: 420px;
  overflow: hidden;
  border: 1px solid #d8dde6;
  border-radius: 8px;
  background: #ffffff;
  box-shadow: 0 16px 40px rgba(20, 33, 61, 0.08);
}

.response-row {
  padding: 14px 18px;
  border-bottom: 1px solid #d8dde6;
}

.response-top {
  display: grid;
  grid-template-columns: minmax(280px, 0.85fr) minmax(520px, 1.15fr);
  gap: 18px;
  align-items: start;
  margin-bottom: 10px;
}

.student-block {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  padding: 14px 0 0;
}

.student-avatar {
  width: 42px;
  height: 42px;
  display: grid;
  place-items: center;
  flex: 0 0 auto;
  border: 2px solid #18a058;
  border-radius: 50%;
  background: #eefaf3;
  color: #0b7a3a;
  font-size: 18px;
  font-weight: 800;
}

.student-copy {
  display: grid;
  gap: 1px;
  min-width: 0;
}

.eyebrow {
  color: #667085;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0;
  text-transform: uppercase;
}

.student-name {
  color: #17202a;
  font-size: 17px;
  font-weight: 700;
  line-height: 1.2;
}

.student-number {
  color: #667085;
  font-size: 13px;
}

.nomination-card {
  display: grid;
  grid-template-columns: minmax(180px, 1fr) minmax(180px, 1fr) minmax(160px, auto);
  gap: 14px;
  align-items: start;
  padding: 10px 14px;
  border: 1px solid #e4e7ec;
  border-radius: 8px;
  background: #f8fafc;
}

.nominee-summary {
  min-width: 0;
}

.lecturer-name {
  margin-top: 2px;
  color: #111827;
  font-size: 17px;
  font-weight: 800;
  line-height: 1.2;
}

.nominee-meta {
  margin-top: 2px;
  color: #475467;
  font-size: 13px;
}

.unit-summary {
  display: grid;
  gap: 2px;
  align-self: start;
  min-width: 0;
}

.unit-code {
  color: #17202a;
  font-size: 16px;
  font-weight: 700;
}

.unit-name {
  color: #475467;
  font-size: 13px;
}

.submitted-at {
  color: #17202a;
  font-size: 13px;
  text-align: right;
}

.submitted-at .meta-label {
  display: block;
  margin-bottom: 2px;
}

.meta-label {
  color: #667085;
  font-weight: 600;
}

.comment-block {
  border-left: 4px solid #18a058;
  border-radius: 6px;
  background: #fbfcfe;
  padding: 9px 12px;
}

.feedback {
  margin: 4px 0 0;
  color: #111827;
  font-size: 14px;
  line-height: 1.38;
}

.pager-bar {
  min-height: 52px;
  padding: 10px 18px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  color: #667085;
  background: #fbfcfe;
  border-bottom: 1px solid #d8dde6;
}

.empty {
  padding: 70px 28px;
  text-align: center;
  color: #667085;
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

  .response-row,
  .pager-bar {
    padding-left: 18px;
    padding-right: 18px;
  }

  .toolbar > * + * {
    margin-top: 10px;
  }

  .lecturer-filter,
  .sort-select {
    width: 100%;
  }

  .nomination-card {
    grid-template-columns: 1fr;
    align-items: start;
  }

  .response-top {
    grid-template-columns: 1fr;
    gap: 16px;
  }

  .student-block {
    padding-top: 0;
  }

  .submitted-at {
    text-align: left;
  }
}

@media (max-width: 640px) {
  .student-block {
    align-items: flex-start;
  }

  .student-avatar {
    width: 44px;
    height: 44px;
    font-size: 18px;
  }
}
</style>
