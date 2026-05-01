<template>
  <div class="file-uploader">
    <n-upload
      accept=".csv"
      :max="1"
      :show-file-list="true"
      @change="handleChange"
    >
      <n-upload-dragger>
        <div class="upload-icon">
          <n-icon size="48" :depth="3">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M19.35 10.04A7.49 7.49 0 0 0 12 4C9.11 4 6.6 5.64 5.35 8.04A5.994 5.994 0 0 0 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5c0-2.64-2.05-4.78-4.65-4.96M14 13v4h-4v-4H7l5-5l5 5z"
              />
            </svg>
          </n-icon>
        </div>
        <n-text style="font-size: 16px">Click or drag a CSV file here</n-text>
        <n-p depth="3" style="margin: 8px 0 0">
          Accepted format: <code>.csv</code> — tutor list or unit coordinator list
        </n-p>
      </n-upload-dragger>
    </n-upload>

    <template v-if="uploadStore.rows.length">
      <n-divider />
      <n-data-table
        :columns="columns"
        :data="uploadStore.rows"
        :pagination="{ pageSize: 15 }"
        :bordered="false"
        striped
        size="small"
      />
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import {
  NUpload,
  NUploadDragger,
  NIcon,
  NText,
  NP,
  NDivider,
  NDataTable,
  useMessage,
} from 'naive-ui';
import type { UploadFileInfo, DataTableColumns } from 'naive-ui';
import { useUploadStore } from '../stores/upload';
import type { CsvRow } from '../../shared/types';

const uploadStore = useUploadStore();
const message = useMessage();

const columns = computed<DataTableColumns<CsvRow>>(() => {
  if (!uploadStore.rows.length) return [];
  return Object.keys(uploadStore.rows[0]).map((key) => ({
    title: key,
    key,
    ellipsis: { tooltip: true },
  }));
});

async function handleChange(data: { file: UploadFileInfo }) {
  const file = data.file.file;
  if (!file) return;

  try {
    const text = await file.text();
    const rows = parseCsv(text);
    uploadStore.setData(file.name, rows);
    message.success(`Loaded ${rows.length} rows from "${file.name}"`);
  } catch (err) {
    message.error(`Failed to read file: ${String(err)}`);
  }
}

function parseCsv(raw: string): CsvRow[] {
  const lines = raw.trim().split(/\r?\n/);
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const values = line.split(',');
    return headers.reduce<CsvRow>((row, header, i) => {
      row[header] = (values[i] ?? '').trim();
      return row;
    }, {});
  });
}
</script>

<style scoped>
.file-uploader {
  width: 100%;
}

.upload-icon {
  margin-bottom: 12px;
}
</style>
