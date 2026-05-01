import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { CsvRow } from '../../shared/types';

export const useUploadStore = defineStore('upload', () => {
  const rows = ref<CsvRow[]>([]);
  const fileName = ref<string | null>(null);

  function setData(name: string, data: CsvRow[]) {
    fileName.value = name;
    rows.value = data;
  }

  function clear() {
    fileName.value = null;
    rows.value = [];
  }

  return { rows, fileName, setData, clear };
});
