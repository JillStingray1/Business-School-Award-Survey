import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useAppStore = defineStore('app', () => {
  const isLoading = ref(false);
  const errorMessage = ref<string | null>(null);

  function setLoading(value: boolean) {
    isLoading.value = value;
  }

  function setError(message: string | null) {
    errorMessage.value = message;
  }

  function clearError() {
    errorMessage.value = null;
  }

  return { isLoading, errorMessage, setLoading, setError, clearError };
});
