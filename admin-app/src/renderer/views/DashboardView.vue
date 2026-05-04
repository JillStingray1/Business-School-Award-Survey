<template>
  <div class="dashboard">
    <n-h2 style="margin-bottom: 24px;">Dashboard</n-h2>

    <!-- ── Stat cards ── -->
    <n-grid :cols="4" :x-gap="16" :y-gap="16" responsive="screen" :item-responsive="true">
      <n-gi :span="1">
        <n-card class="stat-card">
          <n-statistic label="Total Nominations" :value="stats.totalNominations">
            <template #prefix><span style="font-size: 20px;">📊</span></template>
          </n-statistic>
          <n-text depth="3" style="font-size: 12px; margin-top: 8px; display: block;">
            {{ stats.currentPeriodNominations }} in current period
          </n-text>
        </n-card>
      </n-gi>

      <n-gi :span="1">
        <n-card class="stat-card">
          <n-statistic label="Nominated Teachers" :value="stats.nomineeCount">
            <template #prefix><span style="font-size: 20px;">👨‍🏫</span></template>
          </n-statistic>
          <n-text depth="3" style="font-size: 12px; margin-top: 8px; display: block;">
            Unique nominees this period
          </n-text>
        </n-card>
      </n-gi>

      <n-gi :span="1">
        <n-card class="stat-card">
          <n-statistic label="Applications Submitted" :value="stats.submittedApplications">
            <template #prefix><span style="font-size: 20px;">📋</span></template>
          </n-statistic>
          <n-text depth="3" style="font-size: 12px; margin-top: 8px; display: block;">
            {{ stats.pendingApplications }} awaiting response
          </n-text>
        </n-card>
      </n-gi>

      <n-gi :span="1">
        <n-card class="stat-card" :class="periodCardClass">
          <n-statistic label="Period Status">
            <template #prefix><span style="font-size: 20px;">⏰</span></template>
            <template #default>
              <n-tag :type="periodTagType" size="large" strong>
                {{ periodStatus }}
              </n-tag>
            </template>
          </n-statistic>
          <n-text depth="3" style="font-size: 12px; margin-top: 8px; display: block;">
            {{ activePeriod?.name || 'No active period' }}
          </n-text>
        </n-card>
      </n-gi>
    </n-grid>

    <!-- ── Alerts / Action items ── -->
    <n-h3 style="margin: 32px 0 12px;">⚠️ Pending Actions</n-h3>

    <n-space vertical :size="12">
      <n-alert
        v-if="stats.pendingNominationsToReview > 0"
        title="Nominations Awaiting Review"
        type="warning"
        :show-icon="true"
      >
        <n-flex justify="space-between" align="center">
          <span>{{ stats.pendingNominationsToReview }} nomination(s) are pending approval or rejection.</span>
          <n-button size="small" type="warning" ghost @click="router.push('/nominations')">
            Review Now →
          </n-button>
        </n-flex>
      </n-alert>

      <n-alert
        v-if="stats.failedNotifications > 0"
        title="Notification Delivery Failures"
        type="error"
        :show-icon="true"
      >
        <n-flex justify="space-between" align="center">
          <span>{{ stats.failedNotifications }} email(s) failed to send. Please retry.</span>
          <n-button size="small" type="error" ghost @click="router.push('/notifications')">
            View Failures →
          </n-button>
        </n-flex>
      </n-alert>

      <n-alert
        v-if="stats.pendingApplications > 0"
        title="Nominees Haven't Submitted Yet"
        type="info"
        :show-icon="true"
      >
        <n-flex justify="space-between" align="center">
          <span>{{ stats.pendingApplications }} invited nominee(s) have not yet submitted their application.</span>
          <n-button size="small" ghost @click="router.push('/notifications')">
            Send Reminder →
          </n-button>
        </n-flex>
      </n-alert>

      <n-alert
        v-if="stats.pendingNominationsToReview === 0 && stats.failedNotifications === 0 && stats.pendingApplications === 0"
        title="All caught up!"
        type="success"
        :show-icon="true"
      >
        No pending actions at this time.
      </n-alert>
    </n-space>

    <!-- ── Period timeline ── -->
    <n-h3 style="margin: 32px 0 12px;">📅 Current Period Timeline</n-h3>
    <n-card>
      <n-descriptions :column="2" bordered label-placement="left">
        <n-descriptions-item label="Period">{{ activePeriod?.name || 'No active period' }}</n-descriptions-item>
        <n-descriptions-item label="Status">
          <n-tag :type="periodTagType">{{ periodStatus }}</n-tag>
        </n-descriptions-item>
        <n-descriptions-item label="Nominations Open">{{ formatPeriodDate(activePeriod?.nominationOpenAt) }}</n-descriptions-item>
        <n-descriptions-item label="Nominations Close">{{ formatPeriodDate(activePeriod?.nominationCloseAt) }}</n-descriptions-item>
        <n-descriptions-item label="Applications Open">{{ formatPeriodDate(activePeriod?.applicationOpenAt) }}</n-descriptions-item>
        <n-descriptions-item label="Applications Close">{{ formatPeriodDate(activePeriod?.applicationCloseAt) }}</n-descriptions-item>
      </n-descriptions>
      <n-flex justify="end" style="margin-top: 12px;">
        <n-button size="small" @click="router.push('/period-control')">Manage Period →</n-button>
      </n-flex>
    </n-card>

    <!-- ── Recent nominations ── -->
    <n-h3 style="margin: 32px 0 12px;">📝 Recent Nominations</n-h3>
    <n-data-table
      :columns="nominationColumns"
      :data="recentNominations"
      :bordered="false"
      size="small"
      striped
    />
  </div>
</template>

<script setup lang="ts">
import { computed, h, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import {
  NH2, NH3, NGrid, NGi, NCard, NStatistic, NText, NTag, NAlert,
  NButton, NSpace, NFlex, NDescriptions, NDescriptionsItem,
  NDataTable, NBadge,
} from 'naive-ui';
import type { DataTableColumns } from 'naive-ui';
import { getDashboardStats, NOMINATIONS } from '../data/mockData';
import type { Nomination } from '../data/mockData';
import type { AwardPeriod } from '../../shared/types';

const router = useRouter();
const stats = getDashboardStats();
const activePeriod = ref<AwardPeriod | null>(null);

onMounted(() => {
  void loadActivePeriod();
});

async function loadActivePeriod() {
  const result = await window.electronAPI.listAwardPeriods();
  activePeriod.value = result.success && result.data
    ? result.data.find(period => period.isActive) ?? null
    : null;
}

const periodStatus = computed(() => {
  if (!activePeriod.value) return 'Closed';

  const now = Date.now();
  const nominationOpenAt = Date.parse(activePeriod.value.nominationOpenAt);
  const nominationCloseAt = Date.parse(activePeriod.value.nominationCloseAt);
  const applicationOpenAt = Date.parse(activePeriod.value.applicationOpenAt);
  const applicationCloseAt = Date.parse(activePeriod.value.applicationCloseAt);

  if (now >= nominationOpenAt && now < nominationCloseAt) return 'Open';
  if (now >= applicationOpenAt && now < applicationCloseAt) return 'Open';
  return 'Closed';
});

const periodTagType = computed((): 'success' | 'error' => {
  return periodStatus.value === 'Open' ? 'success' : 'error';
});

const periodCardClass = computed(() => ({
  'period-card-success': periodStatus.value === 'Open',
  'period-card-error': periodStatus.value === 'Closed',
}));

const recentNominations = NOMINATIONS.slice(0, 8);

function formatPeriodDate(value?: string): string {
  if (!value) return '-';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString('en-AU', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function statusType(status: string): 'success' | 'warning' | 'error' | 'default' {
  switch (status) {
    case 'Approved':  return 'success';
    case 'Pending':   return 'warning';
    case 'Rejected':  return 'error';
    default:          return 'default';
  }
}

const nominationColumns: DataTableColumns<Nomination> = [
  { title: 'ID',        key: 'id',           width: 80 },
  { title: 'Nominee',   key: 'nomineeName',  ellipsis: { tooltip: true } },
  { title: 'Unit',      key: 'unitCode',     width: 110 },
  { title: 'Nominator', key: 'nominatorName', ellipsis: { tooltip: true } },
  { title: 'Submitted', key: 'submittedAt',  width: 110 },
  {
    title: 'Status',
    key: 'status',
    width: 110,
    render: (row) => h(NTag, { type: statusType(row.status), size: 'small' }, { default: () => row.status }),
  },
];
</script>

<style scoped>
.dashboard {
  max-width: 1200px;
}
.stat-card {
  transition: box-shadow 0.2s;
}
.stat-card:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
}
</style>
