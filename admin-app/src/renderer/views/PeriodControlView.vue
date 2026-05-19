<template>
  <div class="period-view">
    <n-flex justify="space-between" align="center" style="margin-bottom: 20px;">
      <n-h2 style="margin: 0;">Period Control</n-h2>
      <n-flex :gap="8">
        <n-button :loading="loading" ghost @click="loadPeriods">Refresh</n-button>
        <n-button type="primary" @click="openCreateModal">+ New Period</n-button>
      </n-flex>
    </n-flex>

    <n-alert v-if="errorMessage" type="error" closable style="margin-bottom: 16px;" @close="errorMessage = ''">
      {{ errorMessage }}
    </n-alert>

    <n-spin :show="loading">
      <n-empty v-if="!periods.length" description="No award periods found." />

      <n-grid v-else :cols="2" :x-gap="16" :y-gap="16" responsive="screen">
        <n-gi v-for="p in periods" :key="p.id">
          <n-card :title="p.name" hoverable>
            <template #header-extra>
              <n-flex :gap="6" align="center">
                <n-tag v-if="p.isActive" type="success" size="small" strong>Active</n-tag>
                <n-tag :type="statusType(getPeriodStatus(p))" size="small" strong>
                  {{ getPeriodStatus(p) }}
                </n-tag>
              </n-flex>
            </template>

            <n-descriptions :column="1" bordered label-placement="left" size="small">
              <n-descriptions-item label="Nominations Open">
                {{ formatDateTime(p.nominationOpenAt) }}
              </n-descriptions-item>
              <n-descriptions-item label="Nominations Close">
                {{ formatDateTime(p.nominationCloseAt) }}
              </n-descriptions-item>
              <n-descriptions-item label="Applications Open">
                {{ formatDateTime(p.applicationOpenAt) }}
              </n-descriptions-item>
              <n-descriptions-item label="Applications Close">
                {{ formatDateTime(p.applicationCloseAt) }}
              </n-descriptions-item>
            </n-descriptions>

            <template #footer>
              <n-flex justify="end" :gap="8">
                <n-button size="small" ghost @click="openEdit(p)">Edit Dates</n-button>
                <n-button
                  v-if="getPeriodStatus(p) !== 'Closed'"
                  size="small"
                  type="error"
                  ghost
                  @click="closePeriod(p)"
                >
                  Close Period
                </n-button>
                <n-button v-else size="small" ghost disabled>Archived</n-button>
              </n-flex>
            </template>
          </n-card>
        </n-gi>
      </n-grid>
    </n-spin>

    <n-modal
      v-model:show="showModal"
      preset="card"
      :mask="false"
      :title="isNew ? 'New Period' : `Edit - ${editing?.name}`"
      style="width: 640px;"
    >
      <n-form v-if="editing" label-placement="left" :label-width="190">
        <n-form-item label="Period Name" required>
          <n-input v-model:value="editing.name" placeholder="2026 Semester 1" />
        </n-form-item>
        <n-form-item label="Active Period">
          <n-switch v-model:value="editing.isActive" />
        </n-form-item>
        <n-form-item label="Nominations Open" required>
          <n-date-picker
            v-model:value="editing.nominationOpenAt"
            type="datetime"
            clearable
            style="width: 100%;"
          />
        </n-form-item>
        <n-form-item label="Nominations Close" required>
          <n-date-picker
            v-model:value="editing.nominationCloseAt"
            type="datetime"
            clearable
            style="width: 100%;"
          />
        </n-form-item>
        <n-form-item label="Applications Open" required>
          <n-date-picker
            v-model:value="editing.applicationOpenAt"
            type="datetime"
            clearable
            style="width: 100%;"
          />
        </n-form-item>
        <n-form-item label="Applications Close" required>
          <n-date-picker
            v-model:value="editing.applicationCloseAt"
            type="datetime"
            clearable
            style="width: 100%;"
          />
        </n-form-item>
      </n-form>
      <template #footer>
        <n-flex justify="end" :gap="8">
          <n-button @click="closeModal">Cancel</n-button>
          <n-button type="primary" :loading="saving" @click="savePeriod">
            {{ isNew ? 'Create' : 'Save Changes' }}
          </n-button>
        </n-flex>
      </template>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import {
  NH2, NCard, NGrid, NGi, NFlex, NButton, NTag,
  NDescriptions, NDescriptionsItem, NModal, NForm, NFormItem,
  NInput, NDatePicker, NSwitch, NAlert, NSpin, NEmpty, useMessage, useDialog,
} from 'naive-ui';
import type { AwardPeriod, PeriodStatus } from '../../shared/types';

type EditableAwardPeriod = {
  id?: string;
  name: string;
  nominationOpenAt: number | null;
  nominationCloseAt: number | null;
  applicationOpenAt: number | null;
  applicationCloseAt: number | null;
  isActive: boolean;
};

const message = useMessage();
const dialog = useDialog();
const route = useRoute();

const periods = ref<AwardPeriod[]>([]);
const loading = ref(false);
const saving = ref(false);
const errorMessage = ref('');
const showModal = ref(false);
const isNew = ref(false);
const editing = ref<EditableAwardPeriod | null>(null);

const dateTimeFormatter = new Intl.DateTimeFormat('en-AU', {
  year: 'numeric',
  month: 'short',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  timeZoneName: 'short',
});

onMounted(() => {
  void loadPeriods();
});

watch(
  () => route.path,
  () => {
    showModal.value = false;
    editing.value = null;
  },
);

async function loadPeriods() {
  loading.value = true;
  errorMessage.value = '';

  try {
    const result = await window.electronAPI.listAwardPeriods();

    if (!result.success || !result.data) {
      throw new Error(result.error || 'Failed to load award periods.');
    }

    periods.value = result.data;
  } catch (err) {
    errorMessage.value = String(err);
  } finally {
    loading.value = false;
  }
}

function getPeriodStatus(period: AwardPeriod): PeriodStatus {
  const now = Date.now();
  const nominationOpenAt = Date.parse(period.nominationOpenAt);
  const nominationCloseAt = Date.parse(period.nominationCloseAt);
  const applicationOpenAt = Date.parse(period.applicationOpenAt);
  const applicationCloseAt = Date.parse(period.applicationCloseAt);

  if (now < nominationOpenAt) return 'Upcoming';
  if (now >= nominationOpenAt && now < nominationCloseAt) return 'Nominations Open';
  if (now >= applicationOpenAt && now < applicationCloseAt) return 'Applications Open';
  return 'Closed';
}

function statusType(status: PeriodStatus): 'success' | 'warning' | 'default' | 'info' {
  switch (status) {
    case 'Nominations Open': return 'success';
    case 'Applications Open': return 'warning';
    case 'Upcoming': return 'info';
    default: return 'default';
  }
}

function formatDateTime(value: string): string {
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? value : dateTimeFormatter.format(new Date(timestamp));
}

function toEditablePeriod(period: AwardPeriod): EditableAwardPeriod {
  return {
    id: period.id,
    name: period.name,
    nominationOpenAt: Date.parse(period.nominationOpenAt),
    nominationCloseAt: Date.parse(period.nominationCloseAt),
    applicationOpenAt: Date.parse(period.applicationOpenAt),
    applicationCloseAt: Date.parse(period.applicationCloseAt),
    isActive: period.isActive,
  };
}

function openEdit(period: AwardPeriod) {
  editing.value = toEditablePeriod(period);
  isNew.value = false;
  showModal.value = true;
}

function openCreateModal() {
  const now = new Date();
  now.setSeconds(0, 0);
  const nominationOpenAt = now.getTime();
  const nominationCloseAt = nominationOpenAt + 30 * 24 * 60 * 60 * 1000;
  const applicationOpenAt = nominationCloseAt;
  const applicationCloseAt = applicationOpenAt + 30 * 24 * 60 * 60 * 1000;

  editing.value = {
    name: '',
    nominationOpenAt,
    nominationCloseAt,
    applicationOpenAt,
    applicationCloseAt,
    isActive: periods.value.length === 0,
  };
  isNew.value = true;
  showModal.value = true;
}

function closeModal() {
  showModal.value = false;
  editing.value = null;
}

function requireTimestamp(value: number | null, label: string): number {
  if (!value) {
    throw new Error(`${label} is required.`);
  }

  return value;
}

async function savePeriod() {
  if (!editing.value) return;

  saving.value = true;

  try {
    const nominationOpenAt = requireTimestamp(editing.value.nominationOpenAt, 'Nominations Open');
    const nominationCloseAt = requireTimestamp(editing.value.nominationCloseAt, 'Nominations Close');
    const applicationOpenAt = requireTimestamp(editing.value.applicationOpenAt, 'Applications Open');
    const applicationCloseAt = requireTimestamp(editing.value.applicationCloseAt, 'Applications Close');

    const result = await window.electronAPI.saveAwardPeriod({
      id: editing.value.id,
      name: editing.value.name,
      nominationOpenAt: new Date(nominationOpenAt).toISOString(),
      nominationCloseAt: new Date(nominationCloseAt).toISOString(),
      applicationOpenAt: new Date(applicationOpenAt).toISOString(),
      applicationCloseAt: new Date(applicationCloseAt).toISOString(),
      isActive: editing.value.isActive,
    });

    if (!result.success || !result.data) {
      throw new Error(result.error || 'Failed to save award period.');
    }

    await loadPeriods();
    message.success(isNew.value ? 'Period created.' : 'Period updated.');
    closeModal();
  } catch (err) {
    message.error(String(err));
  } finally {
    saving.value = false;
  }
}

function closePeriod(period: AwardPeriod) {
  dialog.warning({
    title: 'Close Period',
    content: `Close "${period.name}"? Nominations and applications will no longer accept new entries.`,
    positiveText: 'Close',
    negativeText: 'Cancel',
    onPositiveClick: async () => {
      const result = await window.electronAPI.closeAwardPeriod(period.id);

      if (!result.success) {
        message.error(result.error || 'Failed to close period.');
        return;
      }

      await loadPeriods();
      message.success(`Period "${period.name}" closed.`);
    },
  });
}
</script>

<style scoped>
.period-view {
  max-width: 1100px;
}
</style>
