<template>
  <div class="applications-view">
    <n-flex justify="space-between" align="center" style="margin-bottom: 20px;">
      <n-h2 style="margin: 0;">Applications</n-h2>
    </n-flex>

    <!-- Status summary -->
    <n-grid :cols="5" :x-gap="12" :y-gap="12" style="margin-bottom: 20px;" responsive="screen" :item-responsive="true">
      <n-gi v-for="item in statusSummary" :key="item.label" :span="1">
        <n-card size="small" class="status-card">
          <n-flex align="center" :gap="10">
            <n-tag :type="item.type" size="large" strong>{{ item.count }}</n-tag>
            <n-text depth="2">{{ item.label }}</n-text>
          </n-flex>
        </n-card>
      </n-gi>
    </n-grid>

    <!-- Filters -->
    <n-card style="margin-bottom: 16px;">
      <n-flex :gap="12" align="center" wrap>
        <n-input
          v-model:value="search"
          placeholder="Search by nominee or unit..."
          clearable
          style="width: 260px;"
        >
          <template #prefix><n-icon><SearchOutline /></n-icon></template>
        </n-input>
        <n-select
          v-model:value="filterStatus"
          :options="statusOptions"
          placeholder="Filter by status"
          clearable
          style="width: 200px;"
        />
        <n-button ghost @click="search = ''; filterStatus = null">Clear</n-button>
      </n-flex>
    </n-card>

    <!-- Table -->
    <n-data-table
      :columns="columns"
      :data="filteredApplications"
      :pagination="{ pageSize: 10, showSizePicker: true, pageSizes: [10, 20] }"
      :bordered="false"
      striped
      size="small"
    />

    <!-- Detail drawer -->
    <n-drawer v-model:show="showDrawer" :width="480" placement="right">
      <n-drawer-content :title="`Application ${selected?.id}`" closable>
        <template v-if="selected">
          <n-descriptions bordered :column="1" label-placement="left" size="small">
            <n-descriptions-item label="Nominee">{{ selected.nomineeName }}</n-descriptions-item>
            <n-descriptions-item label="Email">{{ selected.nomineeEmail }}</n-descriptions-item>
            <n-descriptions-item label="Unit">{{ selected.unitCode }} — {{ selected.unitTitle }}</n-descriptions-item>
            <n-descriptions-item label="Linked Nomination">{{ selected.nominationId }}</n-descriptions-item>
            <n-descriptions-item label="Invited At">{{ selected.invitedAt ?? '—' }}</n-descriptions-item>
            <n-descriptions-item label="Submitted At">{{ selected.submittedAt ?? 'Not yet submitted' }}</n-descriptions-item>
            <n-descriptions-item label="Status">
              <n-tag :type="tagType(selected.status)" size="small">{{ selected.status }}</n-tag>
            </n-descriptions-item>
          </n-descriptions>

          <n-divider />
          <n-h4>Documents</n-h4>
          <n-empty v-if="!selected.documents.length" description="No documents uploaded" size="small" />
          <n-list v-else bordered size="small">
            <n-list-item v-for="doc in selected.documents" :key="doc">
              <n-flex align="center" :gap="8">
                <span>📄</span>
                <n-text>{{ doc }}</n-text>
              </n-flex>
            </n-list-item>
          </n-list>

          <n-divider />
          <n-flex :gap="8" justify="end">
            <n-button
              v-if="selected.status === 'Submitted' || selected.status === 'Under Review'"
              type="success" ghost size="small"
              @click="setAppStatus(selected, 'Accepted')"
            >Accept</n-button>
            <n-button
              v-if="selected.status === 'Submitted' || selected.status === 'Under Review'"
              type="error" ghost size="small"
              @click="setAppStatus(selected, 'Declined')"
            >Decline</n-button>
          </n-flex>
        </template>
      </n-drawer-content>
    </n-drawer>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, h } from 'vue';
import {
  NH2, NH4, NCard, NFlex, NGrid, NGi, NInput, NSelect, NButton, NIcon,
  NDataTable, NTag, NText, NDrawer, NDrawerContent,
  NDescriptions, NDescriptionsItem, NDivider, NList, NListItem, NEmpty,
  useMessage,
} from 'naive-ui';
import type { DataTableColumns, SelectOption } from 'naive-ui';
import { SearchOutline } from '@vicons/ionicons5';
import { APPLICATIONS } from '../data/mockData';
import type { Application, ApplicationStatus } from '../data/mockData';

const message = useMessage();
const apps = ref<Application[]>(APPLICATIONS.map(a => ({ ...a })));
const search = ref('');
const filterStatus = ref<string | null>(null);
const showDrawer = ref(false);
const selected = ref<Application | null>(null);

const statusOptions: SelectOption[] = [
  { label: 'Not Invited',  value: 'Not Invited' },
  { label: 'Invited',      value: 'Invited' },
  { label: 'Submitted',    value: 'Submitted' },
  { label: 'Under Review', value: 'Under Review' },
  { label: 'Accepted',     value: 'Accepted' },
  { label: 'Declined',     value: 'Declined' },
];

const statusSummary = computed(() => [
  { label: 'Invited',      count: apps.value.filter(a => a.status === 'Invited').length,      type: 'info' as const },
  { label: 'Submitted',    count: apps.value.filter(a => a.status === 'Submitted').length,    type: 'warning' as const },
  { label: 'Under Review', count: apps.value.filter(a => a.status === 'Under Review').length, type: 'default' as const },
  { label: 'Accepted',     count: apps.value.filter(a => a.status === 'Accepted').length,     type: 'success' as const },
  { label: 'Declined',     count: apps.value.filter(a => a.status === 'Declined').length,     type: 'error' as const },
]);

const filteredApplications = computed(() =>
  apps.value.filter(a => {
    const q = search.value.toLowerCase();
    const matchSearch = !q || a.nomineeName.toLowerCase().includes(q) || a.unitCode.toLowerCase().includes(q);
    const matchStatus = !filterStatus.value || a.status === filterStatus.value;
    return matchSearch && matchStatus;
  }),
);

function tagType(status: string): 'success' | 'warning' | 'error' | 'default' | 'info' {
  switch (status) {
    case 'Accepted':     return 'success';
    case 'Submitted':    return 'warning';
    case 'Under Review': return 'default';
    case 'Invited':      return 'info';
    case 'Declined':     return 'error';
    default:             return 'default';
  }
}

function openDrawer(row: Application) {
  selected.value = row;
  showDrawer.value = true;
}

function setAppStatus(app: Application, status: ApplicationStatus) {
  const idx = apps.value.findIndex(a => a.id === app.id);
  if (idx !== -1) apps.value[idx].status = status;
  selected.value = apps.value[idx];
  message.success(`Application ${app.id} marked as ${status}.`);
}

const columns: DataTableColumns<Application> = [
  { title: 'ID',         key: 'id',           width: 90, fixed: 'left' },
  { title: 'Nominee',    key: 'nomineeName',  minWidth: 140, ellipsis: { tooltip: true } },
  { title: 'Unit',       key: 'unitCode',     width: 110 },
  { title: 'Invited',    key: 'invitedAt',    width: 110, render: r => r.invitedAt ?? '—' },
  { title: 'Submitted',  key: 'submittedAt',  width: 110, render: r => r.submittedAt ?? '—' },
  {
    title: 'Documents', key: 'documents', width: 100,
    render: r => h(NTag, { size: 'small', type: r.documents.length ? 'success' : 'default' },
      { default: () => `${r.documents.length} file(s)` }),
  },
  {
    title: 'Status', key: 'status', width: 130,
    render: r => h(NTag, { type: tagType(r.status) as 'success', size: 'small' }, { default: () => r.status }),
  },
  {
    title: 'Actions', key: 'actions', width: 90, fixed: 'right',
    render: r => h(NButton, { size: 'tiny', ghost: true, onClick: () => openDrawer(r) }, { default: () => 'View' }),
  },
];
</script>

<style scoped>
.applications-view { max-width: 1200px; }
.status-card { border-radius: 8px; }
</style>
