<template>
  <div class="export-view">
    <n-h2 style="margin-bottom: 20px;">Data Export</n-h2>

    <!-- Export options -->
    <n-card title="Export All Responses" style="margin-bottom: 24px;">
        <n-button type="primary" @click="exportCSV">
          <template #icon><n-icon><DownloadOutline /></n-icon></template>
          Export CSV
        </n-button>
    </n-card>
  </div>
</template>

<script setup lang="ts">
import { useMessage } from 'naive-ui';
import { NCard, NButton, NIcon, NH2 } from 'naive-ui';
import { DownloadOutline } from '@vicons/ionicons5';

const message = useMessage();

async function exportCSV(): Promise<void> {
  try {
    const result = await window.electronAPI.exportStudentResponses();

    if (result.success) {
      message.success(`Exported to ${result.data}`);
    } else {
      message.error(result.error ?? 'Failed to export CSV.');
    }
  } catch (err) {
    message.error(err instanceof Error ? err.message : 'Unexpected error exporting CSV.');
  }
}
</script>