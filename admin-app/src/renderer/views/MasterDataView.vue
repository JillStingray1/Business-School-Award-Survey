<template>
  <div class="master-data-view">
    <n-h2 style="margin-bottom: 20px;">Master Data</n-h2>

    <!-- Upload panel -->
    <n-grid :cols="1" :x-gap="16" :y-gap="16" style="margin-bottom: 24px;">
      <n-gi>
        <n-card title="Upload Tutor List">
          <n-upload
            accept=".xlsx"
            :max="1"
            @change="(d) => readFileUpload(d)"
          >
            <n-upload-dragger>
              <n-icon size="36" style="margin-bottom: 8px;"><CloudUploadOutline /></n-icon>
              <n-text>Click or drag the Tutor list here</n-text>
              <n-p depth="3" style="margin-top: 4px; font-size: 12px;">
                Format: 2 Sheets, one titled Unit Coordinators, other titled Casual Tutors
              </n-p>
              <n-p depth="3" style="margin-top: 4px; font-size: 12px;">Unit Coordinators have: | CurriculumType | Code | Title | Status | Coordinator | as titles</n-p>
              <n-p depth="3" style="margin-top: 4px; font-size: 12px;">Casual Tutors have: | Staff Number | Unit | Unit Name | First Name | Last Name | Full Name | Department | Email | as titles</n-p>
            </n-upload-dragger>
          </n-upload>
        </n-card>
      </n-gi>
    </n-grid>

    <!-- Validation result -->
    <n-alert
      v-if="validationResult"
      :type="validationResult.type"
      :title="validationResult.title"
      style="margin-bottom: 24px;"
      closable
      @close="validationResult = null"
    >
      <p>{{ validationResult.message }}</p>
      <ul v-if="validationResult.errors.length" style="margin-top: 8px; padding-left: 20px;">
        <li v-for="err in validationResult.errors" :key="err">{{ err }}</li>
      </ul>
    </n-alert>

    <!-- Upload history -->
    <n-h3 style="margin-bottom: 12px;">Upload History</n-h3>
    <n-data-table
      :columns="historyColumns"
      :data="uploads"
      :pagination="{ pageSize: 8 }"
      :bordered="false"
      striped
      size="small"
    />

    <!-- Current master data preview -->
    <n-h3 style="margin: 28px 0 12px;">Current Unit Records (Preview)</n-h3>
    <n-card>
      <n-flex align="center" :gap="12" style="margin-bottom: 12px;">
        <n-input v-model:value="unitSearch" placeholder="Search units..." clearable style="width: 260px;">
          <template #prefix><n-icon><SearchOutline /></n-icon></template>
        </n-input>
        <n-tag>{{ filteredUnits.length }} records</n-tag>
      </n-flex>
      <n-data-table
        :columns="unitColumns"
        :data="filteredUnits"
        :pagination="{ pageSize: 10 }"
        :bordered="false"
        striped
        size="small"
      />
    </n-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, h } from 'vue';
import {
  NH2, NH3, NCard, NGrid, NGi, NFlex, NInput, NIcon, NText, NP,
  NUpload, NUploadDragger, NDataTable, NTag, NAlert,
  useMessage,
} from 'naive-ui';
import type { DataTableColumns, UploadFileInfo } from 'naive-ui';
import { CloudUploadOutline, SearchOutline } from '@vicons/ionicons5';
import { MASTER_DATA_UPLOADS, UNITS } from '../data/mockData';
import type { MasterDataUpload, UnitRecord } from '../data/mockData';

const message = useMessage();
const uploads = ref<MasterDataUpload[]>(MASTER_DATA_UPLOADS.map(u => ({ ...u })));
const unitSearch = ref('');

interface ValidationResult {
  type: 'success' | 'warning' | 'error';
  title: string;
  message: string;
  errors: string[];
}
const validationResult = ref<ValidationResult | null>(null);

const filteredUnits = computed(() => {
  const q = unitSearch.value.toLowerCase();
  if (!q) return UNITS;
  return UNITS.filter(u =>
    u.code.toLowerCase().includes(q) ||
    u.title.toLowerCase().includes(q) ||
    u.coordinator.toLowerCase().includes(q),
  );
});

async function readFileUpload(data: { file: UploadFileInfo }) {
  console.log("got here")
  const file = data.file.file
    if (file) {
      try {
                window.electronAPI.sendFile(await file.arrayBuffer())
                console.log("got here 1")
      } catch (err) {
                console.error('Error reading file:', err);
    }
  }
}

function statusTagType(status: string): 'success' | 'warning' | 'error' {
  switch (status) {
    case 'Success': return 'success';
    case 'Partial': return 'warning';
    default:        return 'error';
  }
}

const historyColumns: DataTableColumns<MasterDataUpload> = [
  { title: 'ID',         key: 'id',          width: 90 },
  { title: 'File Name',  key: 'fileName',    minWidth: 180, ellipsis: { tooltip: true } },
  { title: 'Type',       key: 'type',        width: 120, render: r => h(NTag, { size: 'small' }, { default: () => r.type }) },
  { title: 'Uploaded At', key: 'uploadedAt', width: 150 },
  { title: 'Records',    key: 'recordCount', width: 90 },
  {
    title: 'Status', key: 'status', width: 110,
    render: r => h(NTag, { type: statusTagType(r.status), size: 'small' }, { default: () => r.status }),
  },
  {
    title: 'Errors', key: 'errors', width: 80,
    render: r => r.errors.length
      ? h(NTag, { type: 'error', size: 'small' }, { default: () => `${r.errors.length} error(s)` })
      : h(NTag, { type: 'success', size: 'small' }, { default: () => 'None' }),
  },
];

const unitColumns: DataTableColumns<UnitRecord> = [
  { title: 'Code',        key: 'code',        width: 110 },
  { title: 'Title',       key: 'title',       minWidth: 200, ellipsis: { tooltip: true } },
  { title: 'Coordinator', key: 'coordinator', minWidth: 160, ellipsis: { tooltip: true } },
  {
    title: 'Status', key: 'status', width: 90,
    render: r => h(NTag, { type: r.status === 'Active' ? 'success' : 'default', size: 'small' }, { default: () => r.status }),
  },
];
</script>

<style scoped>
.master-data-view { max-width: 1100px; }
</style>
