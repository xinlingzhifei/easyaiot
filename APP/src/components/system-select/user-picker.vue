<template>
  <view v-if="useDefaultSlot" @click="handleOpen">
    <slot />
  </view>
  <wd-form-item
    v-else-if="label || prop"
    :title="label"
    :title-width="labelWidth"
    :prop="prop || undefined"
    :is-link="!disabled"
    :value="selectedLabel"
    :placeholder="placeholder"
    @click="handleOpen"
  />
  <wd-cell
    v-else
    :is-link="!disabled"
    :value="selectedLabel"
    :placeholder="placeholder"
    @click="handleOpen"
  />

  <wd-select-picker
    v-model="selectedId"
    v-model:visible="visible"
    :title="label || placeholder"
    :columns="userList"
    value-key="id"
    label-key="nickname"
    :type="type"
    filterable
    @confirm="handleConfirm"
  />
</template>

<script lang="ts" setup>
import type { User } from '@/api/system/user'
import { computed, onMounted, ref, watch } from 'vue'
import { getSimpleUserList } from '@/api/system/user'

const props = withDefaults(defineProps<{
  labelWidth?: string
  modelValue?: number | number[]
  type?: 'radio' | 'checkbox'
  label?: string
  placeholder?: string
  prop?: string
  disabled?: boolean
  useDefaultSlot?: boolean
}>(), {
  labelWidth: '180rpx',
  type: 'checkbox',
  label: '',
  placeholder: '请选择',
  prop: '',
  disabled: false,
  useDefaultSlot: false,
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: number | number[] | undefined): void
  (e: 'confirm', users: User[]): void
}>()

const userList = ref<User[]>([])
const selectedId = ref<number | string | number[]>(props.type === 'radio' ? '' : [])
const visible = ref(false)

const selectedLabel = computed(() => {
  if (Array.isArray(selectedId.value)) {
    if (selectedId.value.length === 0) {
      return ''
    }
    return selectedId.value.map(id => getUserNickname(Number(id))).filter(Boolean).join('、')
  }
  return getUserNickname(Number(selectedId.value))
})

/** 打开选择弹窗 */
function handleOpen() {
  if (props.disabled) {
    return
  }
  visible.value = true
}

/** 根据用户 ID 获取昵称 */
function getUserNickname(userId: number | undefined): string {
  if (!userId) {
    return ''
  }
  const user = userList.value.find(u => u.id === userId)
  return user?.nickname || ''
}

defineExpose({
  getUserNickname,
})

watch(
  () => props.modelValue,
  (val) => {
    if (props.type === 'radio') {
      // 单选时，如果值为 undefined，使用空字符串避免警告
      selectedId.value = val !== undefined ? val : ''
    } else {
      // 多选时，确保是数组
      selectedId.value = Array.isArray(val) ? val : []
    }
  },
  { immediate: true },
)

/** 加载用户列表 */
async function loadUserList() {
  userList.value = await getSimpleUserList()
}

/** 选择确认 */
function handleConfirm({ value }: { value: any }) {
  emit('update:modelValue', value)

  // 发出包含完整用户对象的 confirm 事件
  if (Array.isArray(value)) {
    const selectedUsers = userList.value.filter(user => value.includes(user.id))
    emit('confirm', selectedUsers)
  } else if (value) {
    const selectedUser = userList.value.find(user => user.id === value)
    emit('confirm', selectedUser ? [selectedUser] : [])
  } else {
    emit('confirm', [])
  }
}

/** 初始化 */
onMounted(() => {
  loadUserList()
})
</script>
