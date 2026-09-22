<template>
  <div class="notifications-view">
    <n-h2 style="margin-bottom: 20px;">Notifications</n-h2>

    <!-- Bulk send panel -->
    <n-card title="Send Notifications" style="margin-bottom: 24px;">
      <n-grid :cols="3" :x-gap="12">
        <n-gi>
          <n-card size="small" hoverable @click="triggerBulk('Application Invitation')">
            <n-flex vertical align="center" :gap="8" style="padding: 12px 0; cursor: pointer;">
              <span style="font-size: 28px;">📧</span>
              <n-text strong>Send Invitations</n-text>
              <n-text depth="3" style="font-size: 12px; text-align: center;">
                Invite all approved nominees to submit their application
              </n-text>
              <n-tag type="info">{{ uninvitedCount }} pending</n-tag>
            </n-flex>
          </n-card>
        </n-gi>
        <n-gi>
          <n-card size="small" hoverable @click="triggerBulk('Reminder')">
            <n-flex vertical align="center" :gap="8" style="padding: 12px 0; cursor: pointer;">
              <span style="font-size: 28px;">🔔</span>
              <n-text strong>Send Reminders</n-text>
              <n-text depth="3" style="font-size: 12px; text-align: center;">
                Remind invited nominees who haven't submitted yet
              </n-text>
              <n-tag type="warning">{{ awaitingCount }} awaiting</n-tag>
            </n-flex>
          </n-card>
        </n-gi>
        <n-gi>
          <n-card size="small" hoverable @click="retryFailed">
            <n-flex vertical align="center" :gap="8" style="padding: 12px 0; cursor: pointer;">
              <span style="font-size: 28px;">🔁</span>
              <n-text strong>Retry Failed</n-text>
              <n-text depth="3" style="font-size: 12px; text-align: center;">
                Retry all notifications that failed to deliver
              </n-text>
              <n-tag type="error">{{ failedCount }} failed</n-tag>
            </n-flex>
          </n-card>
        </n-gi>
      </n-grid>
    </n-card>

    <!-- History table -->
    <n-h3 style="margin-bottom: 12px;">Notification History</n-h3>
    <n-card>
      <n-flex :gap="12" align="center" style="margin-bottom: 12px;" wrap>
        <n-input v-model:value="search" placeholder="Search by recipient..." clearable style="width: 240px;">
          <template #prefix><n-icon><SearchOutline /></n-icon></template>
        </n-input>
        <n-select v-model:value="filterType" :options="typeOptions" placeholder="Filter by type" clearable style="width: 210px;" />
        <n-select v-model:value="filterStatus" :options="statusOptions" placeholder="Filter by status" clearable style="width: 160px;" />
        <n-button ghost @click="search=''; filterType=null; filterStatus=null">Clear</n-button>
      </n-flex>

      <n-data-table
        :columns="columns"
        :data="filteredNotifications"
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
  NH2, NH3, NCard, NGrid, NGi, NFlex, NInput, NSelect, NIcon,
  NButton, NText, NTag, NDataTable, useMessage, useDialog,
} from 'naive-ui';
import type { DataTableColumns, SelectOption } from 'naive-ui';
import { SearchOutline } from '@vicons/ionicons5';
import { NOTIFICATIONS, APPLICATIONS } from '../data/mockData';
import type { NotificationRecord, NotificationType } from '../data/mockData';

const message = useMessage();
const dialog  = useDialog();

const notifications = ref<NotificationRecord[]>(NOTIFICATIONS.map(n => ({ ...n })));
const search       = ref('');
const filterType   = ref<string | null>(null);
const filterStatus = ref<string | null>(null);

const typeOptions: SelectOption[] = [
  { label: 'Application Invitation', value: 'Application Invitation' },
  { label: 'Reminder',               value: 'Reminder' },
  { label: 'Nomination Confirmation', value: 'Nomination Confirmation' },
  { label: 'Result',                  value: 'Result' },
];
const statusOptions: SelectOption[] = [
  { label: 'Sent',    value: 'Sent' },
  { label: 'Failed',  value: 'Failed' },
  { label: 'Pending', value: 'Pending' },
];

const filteredNotifications = computed(() =>
  notifications.value.filter(n => {
    const q = search.value.toLowerCase();
    const matchSearch = !q || n.recipientName.toLowerCase().includes(q) || n.recipientEmail.toLowerCase().includes(q);
    const matchType   = !filterType.value   || n.type === filterType.value;
    const matchStatus = !filterStatus.value || n.status === filterStatus.value;
    return matchSearch && matchType && matchStatus;
  }),
);

const uninvitedCount = computed(() => APPLICATIONS.filter(a => a.status === 'Not Invited').length);
const awaitingCount  = computed(() => APPLICATIONS.filter(a => a.status === 'Invited').length);
const failedCount    = computed(() => notifications.value.filter(n => n.status === 'Failed').length);

function makeNotification(type: NotificationType, name: string, email: string): NotificationRecord {
  return {
    id: `NTF${String(notifications.value.length + 1).padStart(3, '0')}`,
    type,
    recipientName: name,
    recipientEmail: email,
    sentAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
    status: Math.random() > 0.1 ? 'Sent' : 'Failed',
    periodId: 'P2026S1',
  };
}

function triggerBulk(type: NotificationType) {
  dialog.info({
    title: `Send ${type}`,
    content: type === 'Application Invitation'
      ? 'Send invitation emails to all approved nominees who have not yet been invited?'
      : 'Send reminder emails to all invited nominees who have not submitted their application?',
    positiveText: 'Send',
    negativeText: 'Cancel',
    onPositiveClick: () => {
      const targets = APPLICATIONS.filter(a => type === 'Application Invitation' ? a.status === 'Not Invited' : a.status === 'Invited');
      const newNotifs = targets.map(a => makeNotification(type, a.nomineeName, a.nomineeEmail));
      notifications.value.unshift(...newNotifs);
      const sent = newNotifs.filter(n => n.status === 'Sent').length;
      const failed = newNotifs.filter(n => n.status === 'Failed').length;
      message.success(`${sent} notification(s) sent${failed ? `, ${failed} failed` : ''}.`);
    },
  });
}

function retryFailed() {
  const failed = notifications.value.filter(n => n.status === 'Failed');
  if (!failed.length) { message.info('No failed notifications to retry.'); return; }
  dialog.warning({
    title: 'Retry Failed Notifications',
    content: `Retry ${failed.length} failed notification(s)?`,
    positiveText: 'Retry',
    negativeText: 'Cancel',
    onPositiveClick: () => {
      failed.forEach(n => {
        const idx = notifications.value.findIndex(x => x.id === n.id);
        if (idx !== -1) notifications.value[idx].status = 'Sent';
      });
      message.success(`${failed.length} notification(s) retried.`);
    },
  });
}

function statusTagType(status: string): 'success' | 'error' | 'warning' {
  switch (status) {
    case 'Sent':    return 'success';
    case 'Failed':  return 'error';
    default:        return 'warning';
  }
}

const columns: DataTableColumns<NotificationRecord> = [
  { title: 'ID',        key: 'id',             width: 100 },
  { title: 'Type',      key: 'type',           minWidth: 180, ellipsis: { tooltip: true },
    render: r => h(NTag, { size: 'small' }, { default: () => r.type }) },
  { title: 'Recipient', key: 'recipientName',  minWidth: 140, ellipsis: { tooltip: true } },
  { title: 'Email',     key: 'recipientEmail', minWidth: 200, ellipsis: { tooltip: true } },
  { title: 'Sent At',   key: 'sentAt',         width: 150 },
  {
    title: 'Status', key: 'status', width: 100,
    render: r => h(NTag, { type: statusTagType(r.status), size: 'small' }, { default: () => r.status }),
  },
  {
    title: 'Actions', key: 'actions', width: 90,
    render: r => r.status === 'Failed'
      ? h(NButton, {
          size: 'tiny', type: 'warning', ghost: true,
          onClick: () => { const idx = notifications.value.findIndex(x => x.id === r.id); if (idx !== -1) { notifications.value[idx].status = 'Sent'; message.success('Retried.'); } },
        }, { default: () => 'Retry' })
      : null,
  },
];
</script>

<style scoped>
.notifications-view { max-width: 1100px; }
</style>
