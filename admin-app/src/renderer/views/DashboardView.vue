<template>
  <div class="dashboard">
    <n-h2 style="margin-bottom: 24px;">Dashboard</n-h2>

    <transition name="pending-notice">
      <div
        v-if="showPendingNotice && pendingActionItems.length > 0"
        class="pending-notice"
        role="status"
      >
        <div class="pending-notice-header">
          <div>
            <div class="pending-notice-title">Pending Actions</div>
            <div class="pending-notice-count">{{ pendingActionItems.length }} item(s) need attention</div>
          </div>
          <n-button
            quaternary
            circle
            size="tiny"
            aria-label="Close pending actions notification"
            @click="showPendingNotice = false"
          >
            x
          </n-button>
        </div>

        <div class="pending-notice-list">
          <div
            v-for="item in pendingActionItems"
            :key="item.key"
            class="pending-notice-item"
            :class="`pending-notice-item-${item.type}`"
          >
            <div class="pending-notice-item-body">
              <div class="pending-notice-item-title">{{ item.title }}</div>
              <div class="pending-notice-item-message">{{ item.message }}</div>
            </div>
            <n-button
              size="tiny"
              :type="item.buttonType"
              ghost
              @click="router.push(item.route)"
            >
              {{ item.actionLabel }}
            </n-button>
          </div>
        </div>
      </div>
    </transition>

    <!-- ── Stat cards ── -->
    <n-grid :cols="4" :x-gap="16" :y-gap="16" responsive="screen" :item-responsive="true">
      <n-gi :span="1">
        <n-card class="stat-card">
          <n-statistic label="Total Nominations" :value="totalNominations">
            <template #prefix><span style="font-size: 20px;">📊</span></template>
          </n-statistic>
          <n-text depth="3" style="font-size: 12px; margin-top: 8px; display: block;">
            All records in nominations table
          </n-text>
        </n-card>
      </n-gi>

      <n-gi :span="1">
        <n-card class="stat-card">
          <n-statistic label="Nominated Teachers" :value="nominatedTeachers">
            <template #prefix><span style="font-size: 20px;">👨‍🏫</span></template>
          </n-statistic>
          <n-text depth="3" style="font-size: 12px; margin-top: 8px; display: block;">
            Unique nominees in nominations table
          </n-text>
        </n-card>
      </n-gi>

      <n-gi :span="1">
        <n-card class="stat-card">
          <n-statistic label="Applications Submitted" :value="applicationsSubmittedValue">
            <template #prefix><span style="font-size: 20px;">📋</span></template>
          </n-statistic>
          <n-text depth="3" style="font-size: 12px; margin-top: 8px; display: block;">
            {{ applicationsSubmittedHelp }}
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
    <n-alert
      v-if="dashboardError"
      :title="dashboardError"
      type="error"
      :show-icon="true"
      style="margin-bottom: 12px;"
    />
    <n-data-table
      :columns="nominationColumns"
      :data="recentNominations"
      :loading="dashboardLoading"
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
  NButton, NFlex, NDescriptions, NDescriptionsItem,
  NDataTable,
} from 'naive-ui';
import type { DataTableColumns } from 'naive-ui';
import { getDashboardStats } from '../data/mockData';
import type { AwardPeriod, DashboardNomination } from '../../shared/types';

const router = useRouter();
const stats = getDashboardStats();
const activePeriod = ref<AwardPeriod | null>(null);
const totalNominations = ref(0);
const nominatedTeachers = ref(0);
const submittedApplications = ref<number | null>(null);
const pendingNominationsToReview = ref(0);
const recentNominations = ref<DashboardNomination[]>([]);
const dashboardLoading = ref(false);
const dashboardError = ref('');
const showPendingNotice = ref(true);

onMounted(() => {
  void loadActivePeriod();
  void loadDashboardNominations();
});

async function loadActivePeriod() {
  const result = await window.electronAPI.listAwardPeriods();
  activePeriod.value = result.success && result.data
    ? result.data.find(period => period.isActive) ?? null
    : null;
}

async function loadDashboardNominations() {
  dashboardLoading.value = true;
  dashboardError.value = '';

  try {
    const result = await window.electronAPI.getDashboardNominations();

    if (result.success && result.data) {
      const { data } = result;

      totalNominations.value = data.totalNominations;
      recentNominations.value = data.recentNominations;
      nominatedTeachers.value = typeof data.nominatedTeachers === 'number'
        ? data.nominatedTeachers
        : countUniqueNominatedTeachers(data.recentNominations);
      submittedApplications.value = typeof data.submittedApplications === 'number'
        ? data.submittedApplications
        : null;
      pendingNominationsToReview.value = typeof data.pendingNominationsToReview === 'number'
        ? data.pendingNominationsToReview
        : data.recentNominations.filter(nomination => nomination.approvalStatus === 'Pending').length;
    } else {
      dashboardError.value = result.error ?? 'Failed to load dashboard nominations.';
    }
  } catch (err) {
    dashboardError.value = err instanceof Error
      ? err.message
      : 'Failed to load dashboard nominations.';
  } finally {
    dashboardLoading.value = false;
  }
}

const applicationsSubmittedValue = computed(() => submittedApplications.value ?? '-');

const applicationsSubmittedHelp = computed(() =>
  submittedApplications.value === null
    ? 'Application data not configured'
    : 'Submitted application records',
);

const pendingActionItems = computed(() => {
  const items: Array<{
    key: string;
    title: string;
    message: string;
    actionLabel: string;
    route: string;
    type: 'warning' | 'error' | 'info';
    buttonType: 'warning' | 'error' | 'info';
  }> = [];

  if (pendingNominationsToReview.value > 0) {
    items.push({
      key: 'nominations-awaiting-review',
      title: 'Nominations Awaiting Review',
      message: `${pendingNominationsToReview.value} nomination(s) are pending approval or rejection.`,
      actionLabel: 'Review',
      route: '/nominations',
      type: 'warning',
      buttonType: 'warning',
    });
  }

  if (stats.failedNotifications > 0) {
    items.push({
      key: 'notification-failures',
      title: 'Notification Delivery Failures',
      message: `${stats.failedNotifications} email(s) failed to send.`,
      actionLabel: 'Open',
      route: '/notifications',
      type: 'error',
      buttonType: 'error',
    });
  }

  if (stats.pendingApplications > 0) {
    items.push({
      key: 'pending-applications',
      title: "Nominees Haven't Submitted Yet",
      message: `${stats.pendingApplications} invited nominee(s) have not submitted their application.`,
      actionLabel: 'Remind',
      route: '/notifications',
      type: 'info',
      buttonType: 'info',
    });
  }

  return items;
});

function countUniqueNominatedTeachers(nominations: DashboardNomination[]): number {
  return new Set(nominations.map(nomination => nomination.scholarName.trim().toLowerCase())).size;
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

const nominationColumns: DataTableColumns<DashboardNomination> = [
  { title: 'ID',        key: 'id',           width: 80 },
  { title: 'Nominee',   key: 'scholarName',  ellipsis: { tooltip: true } },
  { title: 'Unit',      key: 'unitCode',     width: 110 },
  { title: 'Nominator', key: 'studentName', ellipsis: { tooltip: true } },
  {
    title: 'Submitted',
    key: 'createdAt',
    width: 150,
    render: (row) => formatPeriodDate(row.createdAt),
  },
  {
    title: 'Status',
    key: 'approvalStatus',
    width: 110,
    render: (row) => h(NTag, { type: statusType(row.approvalStatus), size: 'small' }, { default: () => row.approvalStatus }),
  },
];
</script>

<style scoped>
.dashboard {
  max-width: 1200px;
}
.pending-notice {
  position: fixed;
  top: 72px;
  right: 24px;
  z-index: 20;
  width: min(380px, calc(100vw - 48px));
  border: 1px solid #efeff5;
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.14);
  overflow: hidden;
}
.pending-notice-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 14px 10px;
  border-bottom: 1px solid #f0f0f0;
}
.pending-notice-title {
  font-size: 14px;
  font-weight: 700;
  line-height: 20px;
}
.pending-notice-count {
  margin-top: 2px;
  font-size: 12px;
  line-height: 18px;
  color: #6b7280;
}
.pending-notice-list {
  display: grid;
  gap: 0;
}
.pending-notice-item {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border-left: 4px solid transparent;
  border-bottom: 1px solid #f5f5f5;
}
.pending-notice-item:last-child {
  border-bottom: 0;
}
.pending-notice-item-warning {
  border-left-color: #f0a020;
}
.pending-notice-item-error {
  border-left-color: #d03050;
}
.pending-notice-item-info {
  border-left-color: #2080f0;
}
.pending-notice-item-body {
  min-width: 0;
}
.pending-notice-item-title {
  font-size: 13px;
  font-weight: 600;
  line-height: 18px;
}
.pending-notice-item-message {
  margin-top: 2px;
  font-size: 12px;
  line-height: 17px;
  color: #6b7280;
}
.pending-notice-enter-active,
.pending-notice-leave-active {
  transition: opacity 0.16s ease, transform 0.16s ease;
}
.pending-notice-enter-from,
.pending-notice-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
.stat-card {
  transition: box-shadow 0.2s;
}
.stat-card:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
}
</style>
