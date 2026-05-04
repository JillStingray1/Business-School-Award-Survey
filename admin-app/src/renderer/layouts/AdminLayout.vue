<template>
  <n-layout has-sider style="height: 100vh;">
    <!-- ── Sidebar ── -->
    <n-layout-sider
      bordered
      collapse-mode="width"
      :collapsed-width="64"
      :width="220"
      :collapsed="collapsed"
      show-trigger
      @collapse="collapsed = true"
      @expand="collapsed = false"
    >
      <!-- Logo / Brand -->
      <div class="sidebar-brand" :class="{ collapsed }">
        <span class="brand-icon">🎓</span>
        <span v-if="!collapsed" class="brand-text">Award Survey</span>
      </div>

      <n-menu
        :collapsed="collapsed"
        :collapsed-width="64"
        :collapsed-icon-size="20"
        :options="menuOptions"
        :value="activeKey"
        @update:value="handleMenuSelect"
      />
    </n-layout-sider>

    <!-- ── Main content area ── -->
    <n-layout>
      <!-- Top bar -->
      <n-layout-header bordered class="top-bar">
        <n-breadcrumb>
          <n-breadcrumb-item>Admin</n-breadcrumb-item>
          <n-breadcrumb-item>{{ currentPageTitle }}</n-breadcrumb-item>
        </n-breadcrumb>

        <div class="top-bar-right">
          <n-badge :value="pendingCount" :max="99" type="warning">
            <n-button quaternary circle size="small" @click="router.push('/nominations')">
              <template #icon>
                <n-icon><AlertCircleOutline /></n-icon>
              </template>
            </n-button>
          </n-badge>
          <n-text depth="3" style="margin-left: 16px; font-size: 13px;">
            Period: <n-tag size="small" :type="periodTagType">{{ currentPeriodStatus }}</n-tag>
          </n-text>
        </div>
      </n-layout-header>

      <n-layout-content content-style="padding: 24px; overflow: auto; height: calc(100vh - 56px);">
        <router-view />
      </n-layout-content>
    </n-layout>
  </n-layout>
</template>

<script setup lang="ts">
import { ref, computed, h } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import {
  NLayout, NLayoutSider, NLayoutHeader, NLayoutContent,
  NMenu, NBreadcrumb, NBreadcrumbItem, NButton, NIcon,
  NBadge, NText, NTag,
} from 'naive-ui';
import type { MenuOption } from 'naive-ui';
import { AlertCircleOutline } from '@vicons/ionicons5';
import { NOMINATIONS, PERIODS } from '../data/mockData';

const router = useRouter();
const route = useRoute();
const collapsed = ref(false);

// ── Menu options ──────────────────────────────────────────────────────────
function renderIcon(emoji: string) {
  return () => h('span', { style: 'font-size: 18px; line-height: 1;' }, emoji);
}

const menuOptions: MenuOption[] = [
  { label: 'Dashboard',     key: '/dashboard',     icon: renderIcon('📊') },
  { label: 'Nominations',   key: '/nominations',   icon: renderIcon('📝') },
  { label: 'Applications',  key: '/applications',  icon: renderIcon('📋') },
  { label: 'Master Data',   key: '/master-data',   icon: renderIcon('🗂️') },
  { label: 'Period Control', key: '/period-control', icon: renderIcon('⏰') },
  { label: 'Notifications', key: '/notifications', icon: renderIcon('🔔') },
  { label: 'Data Export',   key: '/data-export',   icon: renderIcon('📤') },
];

const PAGE_TITLES: Record<string, string> = {
  '/dashboard':      'Dashboard',
  '/nominations':    'Nominations',
  '/applications':   'Applications',
  '/master-data':    'Master Data',
  '/period-control': 'Period Control',
  '/notifications':  'Notifications',
  '/data-export':    'Data Export',
};

const activeKey = computed(() => route.path);
const currentPageTitle = computed(() => PAGE_TITLES[route.path] ?? 'Dashboard');

function handleMenuSelect(key: string) {
  router.push(key);
}

// ── Top-bar derived values ────────────────────────────────────────────────
const pendingCount = computed(() =>
  NOMINATIONS.filter(n => n.status === 'Pending').length,
);

const currentPeriod = computed(() =>
  PERIODS.find(p => p.status !== 'Closed') ?? PERIODS[0],
);

const currentPeriodStatus = computed(() => currentPeriod.value.status);

const periodTagType = computed((): 'success' | 'warning' | 'default' => {
  switch (currentPeriod.value.status) {
    case 'Nominations Open':  return 'success';
    case 'Applications Open': return 'warning';
    default:                  return 'default';
  }
});
</script>

<style scoped>
.sidebar-brand {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 16px 20px;
  border-bottom: 1px solid var(--n-divider-color, #efeff5);
  transition: padding 0.2s;
  overflow: hidden;
  white-space: nowrap;
}
.sidebar-brand.collapsed {
  padding: 16px 0;
  justify-content: center;
}
.brand-icon {
  font-size: 22px;
  flex-shrink: 0;
}
.brand-text {
  font-weight: 600;
  font-size: 15px;
  color: #18a058;
}
.top-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  height: 56px;
}
.top-bar-right {
  display: flex;
  align-items: center;
  gap: 8px;
}
</style>
