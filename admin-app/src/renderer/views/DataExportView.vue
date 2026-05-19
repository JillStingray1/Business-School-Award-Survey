<template>
  <div class="export-view">
    <n-h2 style="margin-bottom: 20px;">Data Export</n-h2>

    <!-- Export options -->
    <n-card title="Export Configuration" style="margin-bottom: 24px;">
      <n-grid :cols="3" :x-gap="16" :y-gap="12">
        <n-gi>
          <n-form-item label="Dataset">
            <n-select v-model:value="selectedDataset" :options="datasetOptions" />
          </n-form-item>
        </n-gi>
        <n-gi>
          <n-form-item label="Status Filter">
            <n-select v-model:value="filterStatus" :options="currentStatusOptions" placeholder="All statuses" clearable />
          </n-form-item>
        </n-gi>
        <n-gi>
          <n-form-item label="Period">
            <n-select v-model:value="filterPeriod" :options="periodOptions" placeholder="All periods" clearable />
          </n-form-item>
        </n-gi>
      </n-grid>
      <n-flex :gap="8" style="margin-top: 4px;">
        <n-button type="primary" @click="exportCSV">
          <template #icon><n-icon><DownloadOutline /></n-icon></template>
          Export CSV
        </n-button>
        <n-button @click="exportJSON">
          <template #icon><n-icon><CodeOutline /></n-icon></template>
          Export JSON
        </n-button>
        <n-text depth="3" style="align-self: center; font-size: 13px;">
          {{ previewData.length }} record(s) will be exported
        </n-text>
      </n-flex>
    </n-card>

    <!-- Preview with pagination -->
    <n-card :title="`Preview — ${selectedDataset}`">
      <n-flex align="center" :gap="12" style="margin-bottom: 12px;">
        <n-input v-model:value="search" placeholder="Search in preview..." clearable style="width: 260px;">
          <template #prefix><n-icon><SearchOutline /></n-icon></template>
        </n-input>
        <n-text depth="3" style="font-size: 13px;">Showing {{ filteredPreview.length }} of {{ previewData.length }} records</n-text>
      </n-flex>

      <n-data-table
        :columns="currentColumns"
        :data="filteredPreview"
        :pagination="pagination"
        :bordered="false"
        striped
        size="small"
        :scroll-x="900"
      />
    </n-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, h } from 'vue';
import {
  NH2, NCard, NGrid, NGi, NFlex, NInput, NSelect, NButton, NIcon,
  NDataTable, NText, NTag, NFormItem, useMessage,
} from 'naive-ui';
import type { DataTableColumns, SelectOption, PaginationProps } from 'naive-ui';
import { DownloadOutline, CodeOutline, SearchOutline } from '@vicons/ionicons5';
import { NOMINATIONS, APPLICATIONS, UNITS, TUTORS, PERIODS } from '../data/mockData';
import type { Nomination, Application, UnitRecord, TutorRecord } from '../data/mockData';

const message = useMessage();

// ── Dataset selector ──────────────────────────────────────────────────────
type DatasetKey = 'Nominations' | 'Applications' | 'Unit Records' | 'Tutors';
const selectedDataset = ref<DatasetKey>('Nominations');
const filterStatus = ref<string | null>(null);
const filterPeriod = ref<string | null>(null);
const search = ref('');

const datasetOptions: SelectOption[] = [
  { label: 'Nominations',   value: 'Nominations' },
  { label: 'Applications',  value: 'Applications' },
  { label: 'Unit Records',  value: 'Unit Records' },
  { label: 'Tutors',        value: 'Tutors' },
];

const periodOptions: SelectOption[] = PERIODS.map(p => ({ label: p.name, value: p.id }));

const nominationStatusOptions: SelectOption[] = [
  { label: 'Pending',   value: 'Pending'   },
  { label: 'Approved',  value: 'Approved'  },
  { label: 'Rejected',  value: 'Rejected'  },
  { label: 'Withdrawn', value: 'Withdrawn' },
];
const applicationStatusOptions: SelectOption[] = [
  { label: 'Not Invited',  value: 'Not Invited' },
  { label: 'Invited',      value: 'Invited' },
  { label: 'Submitted',    value: 'Submitted' },
  { label: 'Under Review', value: 'Under Review' },
  { label: 'Accepted',     value: 'Accepted' },
  { label: 'Declined',     value: 'Declined' },
];

const currentStatusOptions = computed<SelectOption[]>(() => {
  switch (selectedDataset.value) {
    case 'Nominations':  return nominationStatusOptions;
    case 'Applications': return applicationStatusOptions;
    default: return [];
  }
});

watch(selectedDataset, () => { filterStatus.value = null; search.value = ''; });

// ── Data ──────────────────────────────────────────────────────────────────
const previewData = computed(() => {
  switch (selectedDataset.value) {
    case 'Nominations':
      return NOMINATIONS.filter(n =>
        (!filterStatus.value || n.status === filterStatus.value) &&
        (!filterPeriod.value || n.periodId === filterPeriod.value),
      );
    case 'Applications':
      return APPLICATIONS.filter(a =>
        (!filterStatus.value || a.status === filterStatus.value) &&
        (!filterPeriod.value || a.periodId === filterPeriod.value),
      );
    case 'Unit Records':
      return UNITS;
    case 'Tutors':
      return TUTORS;
    default:
      return [];
  }
});

const filteredPreview = computed(() => {
  const q = search.value.toLowerCase();
  if (!q) return previewData.value;
  return (previewData.value as unknown as Record<string, unknown>[]).filter(row =>
    Object.values(row).some(v => String(v).toLowerCase().includes(q)),
  );
});

// ── Pagination ─────────────────────────────────────────────────────────────
const pagination = ref<PaginationProps>({
  pageSize: 15,
  showSizePicker: true,
  pageSizes: [10, 15, 25, 50],
  showQuickJumper: true,
});

// ── Columns per dataset ────────────────────────────────────────────────────
function tagType(status: string): 'success' | 'warning' | 'error' | 'default' {
  switch (status) {
    case 'Approved': case 'Accepted': case 'Active':  return 'success';
    case 'Pending':  case 'Submitted': case 'Invited': return 'warning';
    case 'Rejected': case 'Declined': case 'Failed':  return 'error';
    default: return 'default';
  }
}

const nominationCols: DataTableColumns<Nomination> = [
  { title: 'ID',         key: 'id',            width: 80 },
  { title: 'Nominee',    key: 'nomineeName',   minWidth: 140, ellipsis: { tooltip: true } },
  { title: 'Nominee Email', key: 'nomineeEmail', minWidth: 200, ellipsis: { tooltip: true } },
  { title: 'Unit',       key: 'unitCode',      width: 110 },
  { title: 'Nominator',  key: 'nominatorName', minWidth: 130, ellipsis: { tooltip: true } },
  { title: 'Submitted',  key: 'submittedAt',   width: 110 },
  { title: 'Period',     key: 'periodId',      width: 100 },
  { title: 'Status', key: 'status', width: 110, render: r => h(NTag, { type: tagType(r.status), size: 'small' }, { default: () => r.status }) },
];

const applicationCols: DataTableColumns<Application> = [
  { title: 'ID',          key: 'id',            width: 90 },
  { title: 'Nominee',     key: 'nomineeName',   minWidth: 140, ellipsis: { tooltip: true } },
  { title: 'Email',       key: 'nomineeEmail',  minWidth: 200, ellipsis: { tooltip: true } },
  { title: 'Unit',        key: 'unitCode',      width: 110 },
  { title: 'Invited At',  key: 'invitedAt',     width: 110, render: r => r.invitedAt ?? '—' },
  { title: 'Submitted',   key: 'submittedAt',   width: 110, render: r => r.submittedAt ?? '—' },
  { title: 'Docs',        key: 'documents',     width: 60, render: r => String(r.documents.length) },
  { title: 'Status', key: 'status', width: 130, render: r => h(NTag, { type: tagType(r.status) as 'success', size: 'small' }, { default: () => r.status }) },
];

const unitCols: DataTableColumns<UnitRecord> = [
  { title: 'Code',        key: 'code',        width: 110 },
  { title: 'Type',        key: 'curriculumType', width: 80 },
  { title: 'Title',       key: 'title',       minWidth: 240, ellipsis: { tooltip: true } },
  { title: 'Coordinator', key: 'coordinator', minWidth: 160, ellipsis: { tooltip: true } },
  { title: 'Status', key: 'status', width: 90, render: r => h(NTag, { type: tagType(r.status), size: 'small' }, { default: () => r.status }) },
];

const tutorCols: DataTableColumns<TutorRecord> = [
  { title: 'ID',    key: 'id',        width: 80 },
  { title: 'Name',  key: 'name',      minWidth: 140, ellipsis: { tooltip: true } },
  { title: 'Email', key: 'email',     minWidth: 200, ellipsis: { tooltip: true } },
  { title: 'Unit',  key: 'unitCode',  width: 110 },
  { title: 'Title', key: 'unitTitle', minWidth: 180, ellipsis: { tooltip: true } },
  { title: 'Role',  key: 'role',      width: 130, render: r => h(NTag, { size: 'small', type: r.role === 'Unit Coordinator' ? 'info' : 'default' }, { default: () => r.role }) },
];

const currentColumns = computed<DataTableColumns<Record<string, unknown>>>(() => {
  switch (selectedDataset.value) {
    case 'Nominations':  return nominationCols as DataTableColumns<Record<string, unknown>>;
    case 'Applications': return applicationCols as DataTableColumns<Record<string, unknown>>;
    case 'Unit Records': return unitCols as DataTableColumns<Record<string, unknown>>;
    case 'Tutors':       return tutorCols as DataTableColumns<Record<string, unknown>>;
    default: return [];
  }
});

// ── Export helpers ────────────────────────────────────────────────────────
function toCSV(data: Record<string, unknown>[]): string {
  if (!data.length) return '';
  const keys = Object.keys(data[0]).filter(k => !Array.isArray(data[0][k]));
  const header = keys.join(',');
  const rows = data.map(row =>
    keys.map(k => {
      const v = String(row[k] ?? '');
      return v.includes(',') ? `"${v}"` : v;
    }).join(','),
  );
  return [header, ...rows].join('\n');
}

function downloadFile(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function exportCSV() {
  const data = previewData.value as unknown as Record<string, unknown>[];
  if (!data.length) { message.warning('No data to export.'); return; }
  const csv = toCSV(data);
  downloadFile(csv, `${selectedDataset.value.replace(' ', '_').toLowerCase()}_export.csv`, 'text/csv');
  message.success(`Exported ${data.length} records as CSV.`);
}

function exportJSON() {
  const data = previewData.value;
  if (!data.length) { message.warning('No data to export.'); return; }
  downloadFile(JSON.stringify(data, null, 2), `${selectedDataset.value.replace(' ', '_').toLowerCase()}_export.json`, 'application/json');
  message.success(`Exported ${data.length} records as JSON.`);
}
</script>

<style scoped>
.export-view { max-width: 1200px; }
</style>
