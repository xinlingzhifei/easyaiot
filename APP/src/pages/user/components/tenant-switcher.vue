<template>
  <view v-if="tenantEnabled" class="tenant-switcher">
    <wd-cell title="当前租户" is-link @click="pickerVisible = true">
      <template #icon>
        <wd-icon name="home" size="20px" color="#1890ff" class="mr-16rpx" />
      </template>
      <view class="text-28rpx text-[#666]">
        {{ currentTenantName }}
      </view>
    </wd-cell>

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
import { useDialog } from '@wot-ui/ui/components/wd-dialog'
import { useToast } from '@wot-ui/ui/components/wd-toast'
import { computed, onMounted, ref } from 'vue'
import { getTenantSimpleList } from '@/api/login'
import { LOGIN_PAGE } from '@/router/config'
import { useUserStore } from '@/store'
import { useTokenStore } from '@/store/token'

const toast = useToast()
const dialog = useDialog()
const userStore = useUserStore()
const tokenStore = useTokenStore()

const tenantEnabled = computed(() => import.meta.env.VITE_APP_TENANT_ENABLE === 'true')
const tenantList = ref<TenantVO[]>([])
const pickerVisible = ref(false)

const tenantId = computed(() =>
  userStore.tenantId || Number(import.meta.env.VITE_APP_DEFAULT_LOGIN_TENANT_ID) || undefined,
)

const currentTenantName = computed(() => {
  const id = tenantId.value
  const found = tenantList.value.find(t => t.id === id)
  return found?.name || (id ? `租户 #${id}` : '未选择')
})

async function loadTenants() {
  if (!tenantEnabled.value)
    return
  try {
    tenantList.value = await getTenantSimpleList() || []
  }
  catch {
    const defaultId = Number(import.meta.env.VITE_APP_DEFAULT_LOGIN_TENANT_ID)
    if (defaultId)
      tenantList.value = [{ id: defaultId, name: '默认租户' }]
  }
}

async function handleTenantConfirm({ value }: { value: number[] }) {
  const newId = Number(value[0])
  if (!newId || newId === tenantId.value)
    return

  try {
    await dialog.confirm({
      title: '切换租户',
      msg: '切换租户后需重新登录以加载新租户数据，是否继续？',
    })
  }
  catch {
    return
  }

  userStore.setTenantId(newId)
  await tokenStore.logout()
  toast.success('租户已切换，请重新登录')
  setTimeout(() => {
    uni.reLaunch({ url: LOGIN_PAGE })
  }, 400)
}

onMounted(loadTenants)
</script>
