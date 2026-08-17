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
            :custom-request="uploadMasterData"
            :disabled="uploading"
            :show-file-list="false"
          >
            <n-upload-dragger>
              <n-icon size="36" style="margin-bottom: 8px;"><CloudUploadOutline /></n-icon>
              <n-text>{{ uploading ? 'Uploading tutor list...' : 'Click or drag the Tutor list here' }}</n-text>
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
    <n-h3 style="margin-bottom: 12px;">Upload History (This Device)</n-h3>
    <n-spin :show="historyLoading">
      <n-data-table
        :columns="historyColumns"
        :data="uploads"
        :pagination="{ pageSize: 8 }"
        :bordered="false"
        striped
        size="small"
      />
    </n-spin>

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
import { ref, computed, h, onMounted } from 'vue';
import {
  NH2, NH3, NCard, NGrid, NGi, NFlex, NInput, NIcon, NText, NP,
  NUpload, NUploadDragger, NDataTable, NTag, NAlert, NSpin,
  useMessage,
} from 'naive-ui';
import type { DataTableColumns, UploadCustomRequestOptions } from 'naive-ui';
import { CloudUploadOutline, SearchOutline } from '@vicons/ionicons5';
import { UNITS } from '../data/mockData';
import type { UnitRecord } from '../data/mockData';
import type { MasterDataUploadError, MasterDataUploadLog } from '../../shared/types';

const message = useMessage();
const uploads = ref<MasterDataUploadLog[]>([]);
const uploading = ref(false);
const historyLoading = ref(false);
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

function formatUploadError(error: MasterDataUploadError): string {
  const location = error.row ? `${error.sheet}, row ${error.row}` : error.sheet;
  return `${location}: ${error.message}`;
}

function setUploadResult(log: MasterDataUploadLog): void {
  const details = `${log.successfulCount} lecturer(s) uploaded; ${log.failedCount} failed.`;
  validationResult.value = {
    type: log.status === 'Success' ? 'success' : log.status === 'Partial' ? 'warning' : 'error',
    title: log.status === 'Success'
      ? 'Upload completed'
      : log.status === 'Partial'
        ? 'Upload partially completed'
        : 'Upload failed',
    message: details,
    errors: log.errors.map(formatUploadError),
  };
}

async function uploadMasterData(options: UploadCustomRequestOptions): Promise<void> {
  const file = options.file.file;

  if (!file || uploading.value) {
    options.onError();
    return;
  }

  uploading.value = true;
  validationResult.value = null;

  try {
    const result = await window.electronAPI.uploadMasterData({
      fileName: file.name,
      bytes: await file.arrayBuffer(),
    });

    if (!result.success || !result.data) {
      throw new Error(result.error || 'The upload did not return a result.');
    }

    uploads.value = [
      result.data,
      ...uploads.value.filter(upload => upload.id !== result.data?.id),
    ];
    setUploadResult(result.data);

    if (result.data.status === 'Failed') {
      options.onError();
    } else {
      options.onFinish();
    }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    validationResult.value = {
      type: 'error',
      title: 'Upload failed',
      message: 'The upload could not be completed or recorded.',
      errors: [errorMessage],
    };
    message.error(errorMessage);
    options.onError();
  } finally {
    uploading.value = false;
  }
}

async function loadUploadHistory(): Promise<void> {
  historyLoading.value = true;

  try {
    const result = await window.electronAPI.listMasterDataUploads();
    if (!result.success) {
      throw new Error(result.error || 'Upload history could not be loaded.');
    }
    uploads.value = result.data ?? [];
  } catch (err) {
    message.error(err instanceof Error ? err.message : String(err));
  } finally {
    historyLoading.value = false;
  }
}

function formatUploadedAt(value: string): string {
  return new Date(value).toLocaleString('en-AU');
}

function statusTagType(status: string): 'success' | 'warning' | 'error' {
  switch (status) {
    case 'Success': return 'success';
    case 'Partial': return 'warning';
    default:        return 'error';
  }
}

const historyColumns: DataTableColumns<MasterDataUploadLog> = [
  {
    type: 'expand',
    width: 42,
    disabled: row => row.errors.length === 0,
    renderExpand: row => h(
      'ul',
      { class: 'upload-errors' },
      row.errors.map(error => h('li', { key: formatUploadError(error) }, formatUploadError(error))),
    ),
  },
  { title: 'File Name', key: 'fileName', minWidth: 190, ellipsis: { tooltip: true } },
  {
    title: 'Uploaded At',
    key: 'uploadedAt',
    width: 190,
    render: row => formatUploadedAt(row.uploadedAt),
  },
  { title: 'Attempted', key: 'attemptedCount', width: 95 },
  { title: 'Uploaded', key: 'successfulCount', width: 95 },
  { title: 'Failed', key: 'failedCount', width: 80 },
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

onMounted(loadUploadHistory);

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
.upload-errors { margin: 4px 0; padding-left: 22px; }
.upload-errors li + li { margin-top: 4px; }
</style>
