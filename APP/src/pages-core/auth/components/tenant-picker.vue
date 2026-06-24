<template>
  <view v-if="tenantEnabled" class="input-item">
    <wd-icon name="home" size="20px" color="#266cfb" />
    <view class="ml-16rpx flex flex-1 items-center justify-between" @click="pickerVisible = true">
      <text class="text-28rpx text-[#333]">
        {{ displayTenantName }}
      </text>
    </view>
    <wd-picker
      v-model:visible="pickerVisible"
      :model-value="tenantId"
      :columns="tenantList"
      label-key="name"
      value-key="id"
      @confirm="handleTenantConfirm"
    />
  </view>
</template>

<script lang="ts" setup>
import type { TenantVO } from '@/api/login'
import { useToast } from '@wot-ui/ui/components/wd-toast'
import { computed, onMounted, ref } from 'vue'
import {
  getTenantByWebsite,
  getTenantSimpleList,
} from '@/api/login'
import { useUserStore } from '@/store/user'
import { getWotPickerDisplay } from '@/utils/wot'

const toast = useToast()
const userStore = useUserStore()

const tenantEnabled = computed(
  () => import.meta.env.VITE_APP_TENANT_ENABLE === 'true',
)
const tenantList = ref<TenantVO[]>([])
const pickerVisible = ref(false)

const defaultTenantId = Number(import.meta.env.VITE_APP_DEFAULT_LOGIN_TENANT_ID) || undefined

const tenantId = computed(
  () => userStore.tenantId || defaultTenantId || undefined,
)

const displayTenantName = computed(() =>
  getWotPickerDisplay(tenantList.value, tenantId.value, {
    valueKey: 'id',
    labelKey: 'name',
    placeholder: '请选择租户',
  }),
)

function getDefaultTenantFallback(): TenantVO[] {
  if (!defaultTenantId) {
    return []
  }
  return [{ id: defaultTenantId, name: '默认租户' }]
}

/** 登录页初始化默认租户，确保后续请求携带 tenant-id */
function ensureDefaultTenantSelected() {
  if (!tenantEnabled.value || userStore.tenantId) {
    return
  }
  if (defaultTenantId) {
    userStore.setTenantId(defaultTenantId)
  }
}

/** 获取租户列表，并根据域名/appId 自动选中租户 */
async function fetchTenantList() {
  if (!tenantEnabled.value) {
    return
  }

  ensureDefaultTenantSelected()

  try {
    const websiteTenantPromise = fetchTenantByWebsite()
    let list: TenantVO[] = []
    try {
      list = await getTenantSimpleList() || []
    }
    catch (error) {
      console.warn('获取租户列表失败，使用默认租户:', error)
      list = getDefaultTenantFallback()
    }
    tenantList.value = list

    let selectedTenantId: number | null = null
    const websiteTenant = await websiteTenantPromise
    if (websiteTenant?.id) {
      selectedTenantId = websiteTenant.id
    }
    if (!selectedTenantId && userStore.tenantId) {
      selectedTenantId = userStore.tenantId
    }
    if (!selectedTenantId && tenantList.value.length > 0) {
      selectedTenantId = tenantList.value[0].id
    }
    if (!selectedTenantId && defaultTenantId) {
      selectedTenantId = defaultTenantId
    }

    if (selectedTenantId && selectedTenantId !== userStore.tenantId) {
      userStore.setTenantId(selectedTenantId)
    }
  }
  catch (error) {
    console.error('获取租户列表失败:', error)
    tenantList.value = getDefaultTenantFallback()
    ensureDefaultTenantSelected()
  }
}

/** 根据域名或 appId 获取租户 */
async function fetchTenantByWebsite(): Promise<TenantVO | null> {
  try {
    let website: string | null = null

    // #ifdef H5
    if (window?.location?.hostname) {
      website = window.location.hostname
    }
    // #endif

    // #ifdef MP
    const appId = uni.getAccountInfoSync?.()?.miniProgram?.appId
    if (appId) {
      website = appId
    }
    // #endif

    if (website) {
      return await getTenantByWebsite(website)
    }
  }
  catch (error) {
    console.debug('根据域名获取租户失败:', error)
  }
  return null
}

function handleTenantConfirm({ value }: { value: Array<number | string> }) {
  const nextId = Number(value[0])
  if (nextId) {
    userStore.setTenantId(nextId)
  }
}

function validate(): boolean {
  if (!tenantEnabled.value) {
    return true
  }
  if (!tenantId.value) {
    toast.warning('请选择租户')
    return false
  }
  return true
}

onMounted(() => {
  fetchTenantList()
})

defineExpose({ validate })
</script>

<style lang="scss" scoped>
@import '../styles/auth.scss';
</style>
