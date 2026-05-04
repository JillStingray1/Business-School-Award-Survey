<template>
  <div class="nominations-view">
    <n-flex justify="space-between" align="center" style="margin-bottom: 20px;">
      <n-h2 style="margin: 0;">Nominations</n-h2>
      <n-flex :gap="8">
        <n-tag type="warning">{{ pendingCount }} Pending</n-tag>
        <n-tag type="success">{{ approvedCount }} Approved</n-tag>
        <n-tag type="error">{{ rejectedCount }} Rejected</n-tag>
      </n-flex>
    </n-flex>

    <!-- Filters -->
    <n-card style="margin-bottom: 16px;">
      <n-flex :gap="12" align="center" wrap>
        <n-input
          v-model:value="search"
          placeholder="Search by nominee, nominator or unit..."
          clearable
          style="width: 280px;"
        >
          <template #prefix><n-icon><SearchOutline /></n-icon></template>
        </n-input>
        <n-select
          v-model:value="filterStatus"
          :options="statusOptions"
          placeholder="Filter by status"
          clearable
          style="width: 180px;"
        />
        <n-select
          v-model:value="filterUnit"
          :options="unitOptions"
          placeholder="Filter by unit"
          clearable
          style="width: 220px;"
        />
        <n-button ghost @click="clearFilters">Clear</n-button>
      </n-flex>
    </n-card>

    <!-- Table -->
    <n-data-table
      :columns="columns"
      :data="filteredNominations"
      :pagination="pagination"
      :bordered="false"
      striped
      size="small"
    />

    <!-- Edit modal -->
    <n-modal v-model:show="showEditModal" preset="card" :title="`Edit Nomination ${editTarget?.id}`" style="width: 520px;">
      <n-form v-if="editTarget" label-placement="left" :label-width="130">
        <n-form-item label="Nominee">
          <n-input :value="editTarget.nomineeName" disabled />
        </n-form-item>
        <n-form-item label="Unit">
          <n-input :value="`${editTarget.unitCode} — ${editTarget.unitTitle}`" disabled />
        </n-form-item>
        <n-form-item label="Status">
          <n-select v-model:value="editTarget.status" :options="statusOptions" />
        </n-form-item>
        <n-form-item label="Reason">
          <n-input v-model:value="editTarget.reason" type="textarea" :rows="3" />
        </n-form-item>
      </n-form>
      <template #footer>
        <n-flex justify="end" :gap="8">
          <n-button @click="showEditModal = false">Cancel</n-button>
          <n-button type="primary" @click="saveEdit">Save Changes</n-button>
        </n-flex>
      </template>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, h } from 'vue';
import {
  NH2, NCard, NFlex, NInput, NSelect, NButton, NIcon,
  NDataTable, NTag, NModal, NForm, NFormItem,
  useMessage, useDialog,
} from 'naive-ui';
import type { DataTableColumns, SelectOption, PaginationProps } from 'naive-ui';
import { SearchOutline } from '@vicons/ionicons5';
import { NOMINATIONS } from '../data/mockData';
import type { Nomination, NominationStatus } from '../data/mockData';

const message = useMessage();
const dialog  = useDialog();

// ── Data ─────────────────────────────────────────────────────────────────
const nominations = ref<Nomination[]>(NOMINATIONS.map(n => ({ ...n })));

// ── Filters ───────────────────────────────────────────────────────────────
const search       = ref('');
const filterStatus = ref<string | null>(null);
const filterUnit   = ref<string | null>(null);

const statusOptions: SelectOption[] = [
  { label: 'Pending',   value: 'Pending'   },
  { label: 'Approved',  value: 'Approved'  },
  { label: 'Rejected',  value: 'Rejected'  },
  { label: 'Withdrawn', value: 'Withdrawn' },
];

const unitOptions = computed<SelectOption[]>(() =>
  [...new Set(nominations.value.map(n => n.unitCode))].sort().map(code => ({
    label: code,
    value: code,
  })),
);

const filteredNominations = computed(() =>
  nominations.value.filter(n => {
    const q = search.value.toLowerCase();
    const matchSearch = !q
      || n.nomineeName.toLowerCase().includes(q)
      || n.nominatorName.toLowerCase().includes(q)
      || n.unitCode.toLowerCase().includes(q)
      || n.unitTitle.toLowerCase().includes(q);
    const matchStatus = !filterStatus.value || n.status === filterStatus.value;
    const matchUnit   = !filterUnit.value   || n.unitCode === filterUnit.value;
    return matchSearch && matchStatus && matchUnit;
  }),
);

const pendingCount  = computed(() => nominations.value.filter(n => n.status === 'Pending').length);
const approvedCount = computed(() => nominations.value.filter(n => n.status === 'Approved').length);
const rejectedCount = computed(() => nominations.value.filter(n => n.status === 'Rejected').length);

function clearFilters() {
  search.value = '';
  filterStatus.value = null;
  filterUnit.value = null;
}

// ── Pagination ────────────────────────────────────────────────────────────
const pagination = ref<PaginationProps>({ pageSize: 10, showSizePicker: true, pageSizes: [10, 20, 50] });

// ── Edit ──────────────────────────────────────────────────────────────────
const showEditModal = ref(false);
const editTarget    = ref<Nomination | null>(null);

function openEdit(row: Nomination) {
  editTarget.value = { ...row };
  showEditModal.value = true;
}

function saveEdit() {
  if (!editTarget.value) return;
  const idx = nominations.value.findIndex(n => n.id === editTarget.value!.id);
  if (idx !== -1) nominations.value[idx] = { ...editTarget.value };
  showEditModal.value = false;
  message.success('Nomination updated.');
}

// ── Delete ────────────────────────────────────────────────────────────────
function confirmDelete(row: Nomination) {
  dialog.warning({
    title: 'Delete Nomination',
    content: `Remove nomination ${row.id} by ${row.nominatorName}? This cannot be undone.`,
    positiveText: 'Delete',
    negativeText: 'Cancel',
    onPositiveClick: () => {
      nominations.value = nominations.value.filter(n => n.id !== row.id);
      message.success(`Nomination ${row.id} deleted.`);
    },
  });
}

// ── Quick status update ────────────────────────────────────────────────────
function setStatus(row: Nomination, status: NominationStatus) {
  const idx = nominations.value.findIndex(n => n.id === row.id);
  if (idx !== -1) nominations.value[idx].status = status;
  message.success(`Nomination ${row.id} marked as ${status}.`);
}

// ── Columns ───────────────────────────────────────────────────────────────
function tagType(status: string): 'success' | 'warning' | 'error' | 'default' {
  switch (status) {
    case 'Approved':  return 'success';
    case 'Pending':   return 'warning';
    case 'Rejected':  return 'error';
    default:          return 'default';
  }
}

const columns: DataTableColumns<Nomination> = [
  { title: 'ID',         key: 'id',            width: 80, fixed: 'left' },
  { title: 'Nominee',    key: 'nomineeName',   minWidth: 140, ellipsis: { tooltip: true } },
  { title: 'Unit',       key: 'unitCode',      width: 110 },
  { title: 'Nominator',  key: 'nominatorName', minWidth: 130, ellipsis: { tooltip: true } },
  { title: 'Submitted',  key: 'submittedAt',   width: 110 },
  {
    title: 'Status', key: 'status', width: 110,
    filterOptions: [
      { label: 'Pending',   value: 'Pending' },
      { label: 'Approved',  value: 'Approved' },
      { label: 'Rejected',  value: 'Rejected' },
      { label: 'Withdrawn', value: 'Withdrawn' },
    ],
    filter: (value, row) => row.status === value,
    render: (row) => h(NTag, { type: tagType(row.status), size: 'small' }, { default: () => row.status }),
  },
  {
    title: 'Actions', key: 'actions', width: 220, fixed: 'right',
    render: (row) => h(NFlex, { gap: 6 }, {
      default: () => [
        row.status === 'Pending' && h(NButton, {
          size: 'tiny', type: 'success', ghost: true,
          onClick: () => setStatus(row, 'Approved'),
        }, { default: () => 'Approve' }),
        row.status === 'Pending' && h(NButton, {
          size: 'tiny', type: 'error', ghost: true,
          onClick: () => setStatus(row, 'Rejected'),
        }, { default: () => 'Reject' }),
        h(NButton, {
          size: 'tiny', ghost: true,
          onClick: () => openEdit(row),
        }, { default: () => 'Edit' }),
        h(NButton, {
          size: 'tiny', type: 'error', ghost: true,
          onClick: () => confirmDelete(row),
        }, { default: () => 'Delete' }),
      ].filter(Boolean),
    }),
  },
];
</script>

<style scoped>
.nominations-view { max-width: 1200px; }
</style>
