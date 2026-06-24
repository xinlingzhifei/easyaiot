<template>
  <!-- 搜索框入口 -->
  <view @click="visible = true">
    <wd-search :placeholder="placeholder" hide-cancel disabled />
  </view>

  <!-- 搜索弹窗 -->
  <wd-popup
    v-model="visible"
    position="top"
    :custom-style="getTopPopupStyle()"
    :modal-style="getTopPopupModalStyle()"
    @close="visible = false"
  >
    <view class="yd-search-form-container">
      <view class="yd-search-form-item">
        <view class="yd-search-form-label">
          流程名称
        </view>
        <wd-input
          v-model="formData.name"
          placeholder="请输入流程名称"
          clearable
        />
      </view>
      <yd-search-picker
        v-if="processDefinitionList.length > 0"
        v-model="formData.processDefinitionId"
        label="所属流程"
        :columns="processDefinitionList"
        value-key="id"
        label-key="name"
      />
      <yd-search-date-range v-model="formData.createTime" label="发起时间" />
      <view class="yd-search-form-item">
        <view class="yd-search-form-label">
          流程状态
        </view>
        <wd-radio-group v-model="formData.status" type="button">
          <wd-radio :value="-1">
            全部
          </wd-radio>
          <wd-radio v-for="dict in getIntDictOptions(DICT_TYPE.BPM_PROCESS_INSTANCE_STATUS)" :key="dict.value" :value="dict.value">
            {{ dict.label }}
          </wd-radio>
        </wd-radio-group>
      </view>
      <yd-search-picker
        v-if="categoryList.length > 0"
        v-model="formData.categoryId"
        label="流程分类"
        :columns="categoryList"
        value-key="code"
        label-key="name"
      />
      <view class="yd-search-form-actions">
        <wd-button class="flex-1" variant="plain" @click="handleReset">
          重置
        </wd-button>
        <wd-button class="flex-1" type="primary" @click="handleSearch">
          搜索
        </wd-button>
      </view>
    </view>
  </wd-popup>
</template>

<script lang="ts" setup>
import type { Category } from '@/api/bpm/category'
import type { ProcessDefinition } from '@/api/bpm/definition'
import { computed, onMounted, reactive, ref } from 'vue'
import { getCategorySimpleList } from '@/api/bpm/category'
import { getProcessDefinitionList } from '@/api/bpm/definition'
import { getDictLabel, getIntDictOptions } from '@/hooks/useDict'
import { getTopPopupModalStyle, getTopPopupStyle } from '@/utils'
import { DICT_TYPE } from '@/utils/constants'
import { formatDate, formatDateRange } from '@/utils/date'

const emit = defineEmits<{
  search: [data: Record<string, any>]
  reset: []
}>()

const formData = reactive({
  name: undefined as string | undefined,
  processDefinitionId: undefined as string | undefined,
  createTime: [undefined, undefined] as [number | undefined, number | undefined],
  status: -1, // -1 表示全部
  categoryId: undefined as string | undefined,
}) // 搜索表单数据
const visible = ref(false) // 搜索弹窗显示状态

/** 搜索条件 placeholder 拼接 */
const placeholder = computed(() => {
  const conditions: string[] = []
  if (formData.name) {
    conditions.push(`名称:${formData.name}`)
  }
  if (formData.status !== -1) {
    conditions.push(`状态:${getDictLabel(DICT_TYPE.BPM_PROCESS_INSTANCE_STATUS, formData.status)}`)
  }
  if (formData.createTime?.[0] && formData.createTime?.[1]) {
    conditions.push(`时间:${formatDate(formData.createTime[0])}~${formatDate(formData.createTime[1])}`)
  }
  return conditions.length > 0 ? conditions.join(' | ') : '搜索我的流程'
})

const categoryList = ref<Category[]>([]) // 流程分类选项
const processDefinitionList = ref<ProcessDefinition[]>([]) // 流程定义选项

/** 获取流程分类列表 */
async function getCategoryList() {
  try {
    categoryList.value = await getCategorySimpleList()
  } catch (error) {
    console.error('获取流程分类失败:', error)
  }
}

/** 获取流程定义列表 */
async function getProcessDefinitions() {
  try {
    processDefinitionList.value = await getProcessDefinitionList({ suspensionState: 1 })
  } catch (error) {
    console.error('获取流程定义失败:', error)
  }
}

/** 搜索按钮操作 */
function handleSearch() {
  visible.value = false
  emit('search', {
    ...formData,
    status: formData.status === -1 ? undefined : formData.status,
    createTime: formatDateRange(formData.createTime),
  })
}

/** 重置按钮操作 */
function handleReset() {
  formData.name = undefined
  formData.processDefinitionId = undefined
  formData.createTime = [undefined, undefined]
  formData.status = -1
  formData.categoryId = undefined
  visible.value = false
  emit('reset')
}

/** 初始化 */
onMounted(() => {
  getCategoryList()
  getProcessDefinitions()
})
</script>
