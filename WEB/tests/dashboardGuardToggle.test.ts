import * as assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const sidebarPath = fileURLToPath(
  new URL('../src/views/dashboard/monitor/components/Sidebar.vue', import.meta.url),
)
const helperPath = fileURLToPath(
  new URL('../src/views/dashboard/monitor/dashboardGuardTask.ts', import.meta.url),
)

const sidebar = readFileSync(sidebarPath, 'utf8')
const helper = existsSync(helperPath) ? readFileSync(helperPath, 'utf8') : ''

assert.match(
  sidebar,
  /data-testid="dashboard-guard-toggle"/,
  'The dashboard sidebar should expose a dedicated guard-recognition switch.',
)

assert.match(
  sidebar,
  /handleGuardSwitchChange/,
  'The dashboard guard switch should call task orchestration instead of only changing local UI state.',
)

assert.match(
  sidebar,
  /GUARD_SCOPE_STORAGE_KEY/,
  'The dashboard guard target should be persisted so returning to the page can restore the same device group.',
)

assert.match(
  sidebar,
  /withDirectoryTreeSelectable/,
  'Dashboard directory nodes should be selectable so a whole device group can become the guard scope.',
)

assert.match(
  sidebar,
  /createDashboardGuardScopeFromNode/,
  'The sidebar should derive the backend guard scope from the selected tree node.',
)

assert.match(
  helper,
  /DASHBOARD_GUARD_TASK_PREFIX = '\[Dashboard Guard\]'/,
  'Dashboard-created guard tasks should use a stable prefix so manual tasks are not stopped accidentally.',
)

assert.match(
  helper,
  /alert_event_enabled: true/,
  'Dashboard guard tasks must enable alert-event generation.',
)

assert.match(
  helper,
  /startAlgorithmTask/,
  'Enabling dashboard guard recognition should start the backend realtime task.',
)

assert.match(
  helper,
  /stopDashboardGuardTask/,
  'Disabling dashboard guard recognition should stop dashboard-owned tasks only.',
)

const guardModuleUrl = new URL('../src/views/dashboard/monitor/dashboardGuardTask.ts', import.meta.url)
let guardModule: any
try {
  guardModule = await import(guardModuleUrl.href)
} catch (error: any) {
  assert.fail(`Dashboard guard helper should be importable: ${error?.message || error}`)
}

const {
  buildDashboardGuardTaskPayload,
  buildDashboardGuardTaskName,
  createDashboardGuardScopeFromNode,
  getDashboardGuardStateForScope,
  startDashboardGuardTask,
  stopDashboardGuardTask,
} = guardModule

const scope = {
  key: 'dir_7',
  label: 'Group A',
  deviceIds: ['cam-1', 'cam-2'],
}

const templateTask = {
  id: 1,
  task_name: 'Existing realtime',
  task_type: 'realtime',
  model_ids: [11, 12],
  extract_interval: 25,
  tracking_enabled: true,
  alert_notification_enabled: true,
  alert_event_suppress_time: 9,
  alarm_suppress_time: 120,
  defense_mode: 'full',
  defense_schedule: 'schedule-json',
  schedule_policy: 'local',
}

const payload = buildDashboardGuardTaskPayload(scope, templateTask)
assert.equal(payload.task_name, buildDashboardGuardTaskName(scope))
assert.equal(payload.task_type, 'realtime')
assert.deepEqual(payload.device_ids, scope.deviceIds)
assert.deepEqual(payload.model_ids, [11, 12])
assert.equal(payload.alert_event_enabled, true)
assert.equal(payload.alert_notification_enabled, true)
assert.equal(payload.defense_mode, 'full')

{
  const calls: string[] = []
  let createdPayload: any
  const api = {
    listAlgorithmTasks: async () => ({ code: 0, data: [templateTask], total: 1 }),
    createAlgorithmTask: async (nextPayload: any) => {
      calls.push('create')
      createdPayload = nextPayload
      return { id: 42, ...nextPayload, is_enabled: false }
    },
    startAlgorithmTask: async (taskId: number) => {
      calls.push(`start:${taskId}`)
      return { id: taskId, is_enabled: true }
    },
    stopAlgorithmTask: async () => {
      throw new Error('stop should not run while starting')
    },
  }

  const result = await startDashboardGuardTask({ scope, api })
  assert.equal(result.taskId, 42)
  assert.deepEqual(calls, ['create', 'start:42'])
  assert.equal(createdPayload.alert_event_enabled, true)
}

{
  const api = {
    listAlgorithmTasks: async () => ({ code: 0, data: [{ ...templateTask, model_ids: [] }], total: 1 }),
    createAlgorithmTask: async () => {
      throw new Error('create should not run without a model template')
    },
    startAlgorithmTask: async () => {
      throw new Error('start should not run without a model template')
    },
    stopAlgorithmTask: async () => null,
  }

  await assert.rejects(
    startDashboardGuardTask({ scope, api }),
    /realtime algorithm task with models/i,
    'The dashboard guard switch should refuse to run without an existing model configuration.',
  )
}

{
  const calls: string[] = []
  const dashboardTask = {
    id: 70,
    task_name: buildDashboardGuardTaskName(scope),
    task_type: 'realtime',
    is_enabled: false,
    device_ids: scope.deviceIds,
    model_ids: [11],
  }
  const api = {
    listAlgorithmTasks: async () => ({ code: 0, data: [dashboardTask], total: 1 }),
    createAlgorithmTask: async () => {
      throw new Error('create should not run when a reusable dashboard task already exists')
    },
    startAlgorithmTask: async (taskId: number) => {
      calls.push(`start:${taskId}`)
      return { id: taskId, is_enabled: true }
    },
    stopAlgorithmTask: async () => null,
  }

  const result = await startDashboardGuardTask({ scope, api })
  assert.equal(result.taskId, 70)
  assert.deepEqual(calls, ['start:70'])
}

{
  const api = {
    listAlgorithmTasks: async () => ({
      code: 0,
      data: [
        templateTask,
        {
          id: 9,
          task_name: 'Manual running task',
          task_type: 'realtime',
          is_enabled: true,
          device_ids: ['cam-2'],
          model_ids: [11],
        },
      ],
      total: 2,
    }),
    createAlgorithmTask: async () => {
      throw new Error('create should not run when a manual task conflicts')
    },
    startAlgorithmTask: async () => {
      throw new Error('start should not run when a manual task conflicts')
    },
    stopAlgorithmTask: async () => null,
  }

  await assert.rejects(
    startDashboardGuardTask({ scope, api }),
    /already used/i,
    'The dashboard guard switch should not silently reuse devices already occupied by manual tasks.',
  )
}

{
  const stopped: number[] = []
  const dashboardTask = {
    id: 50,
    task_name: buildDashboardGuardTaskName(scope),
    task_type: 'realtime',
    is_enabled: true,
    device_ids: scope.deviceIds,
    model_ids: [11],
  }
  const manualTask = {
    id: 51,
    task_name: 'Manual running task',
    task_type: 'realtime',
    is_enabled: true,
    device_ids: scope.deviceIds,
    model_ids: [11],
  }
  const api = {
    listAlgorithmTasks: async () => ({ code: 0, data: [dashboardTask, manualTask], total: 2 }),
    createAlgorithmTask: async () => {
      throw new Error('create should not run while stopping')
    },
    startAlgorithmTask: async () => {
      throw new Error('start should not run while stopping')
    },
    stopAlgorithmTask: async (taskId: number) => {
      stopped.push(taskId)
      return { id: taskId, is_enabled: false }
    },
  }

  await stopDashboardGuardTask({ scope, api })
  assert.deepEqual(stopped, [50])
}

{
  const api = {
    listAlgorithmTasks: async () => ({
      code: 0,
      data: [
        {
          id: 60,
          task_name: buildDashboardGuardTaskName(scope),
          task_type: 'realtime',
          is_enabled: true,
          device_ids: scope.deviceIds,
          model_ids: [11],
        },
      ],
      total: 1,
    }),
    createAlgorithmTask: async () => null,
    startAlgorithmTask: async () => null,
    stopAlgorithmTask: async () => null,
  }

  const state = await getDashboardGuardStateForScope({ scope, api })
  assert.equal(state.enabled, true)
  assert.equal(state.taskId, 60)
}

{
  const groupScope = createDashboardGuardScopeFromNode({
    key: 'dir_9',
    title: 'Warehouse',
    children: [
      {
        key: 'device_cam-1',
        title: 'Camera 1',
        device: { id: 'cam-1', name: 'Camera 1' },
      },
      {
        key: 'gb_ch_sip-1,ch-2',
        title: 'GB channel',
        device: { id: 'gb-2', name: 'GB channel' },
      },
      {
        key: 'gb_ch_sip-1,ch-3',
        title: 'Unsynced GB channel',
      },
    ],
  })

  assert.equal(groupScope.key, 'dir_9')
  assert.equal(groupScope.label, 'Warehouse')
  assert.deepEqual(groupScope.deviceIds, ['cam-1', 'gb-2'])
}
