import { get, post, put, del } from '@/api/http'
import { axiosPre } from '@/settings/httpSetting'

const BASE = `${axiosPre}/visualize/project`

export interface ProjectItem {
  id: number
  projectName: string
  state: number
  indexImage?: string
  remarks?: string
  content?: string
  createTime?: string
  updateTime?: string
}

export const fetchProjectPageApi = (params: {
  pageNo?: number
  pageSize?: number
  projectName?: string
  state?: number
}) => get(`${BASE}/page`, params)

export const fetchProjectApi = (id: string | number) => get(`${BASE}/get`, { id })

export const createProjectApi = (data: {
  projectName: string
  indexImage?: string
  remarks?: string
}) => post(`${BASE}/create`, data)

export const updateProjectApi = (data: {
  id: number
  projectName?: string
  indexImage?: string
  remarks?: string
}) => put(`${BASE}/update`, data)

export const saveProjectContentApi = (data: { id: number | string; content: string }) =>
  put(`${BASE}/save-content`, data)

export const publishProjectApi = (data: { id: number | string; state: number }) =>
  put(`${BASE}/publish`, data)

export const deleteProjectApi = (id: number | string) => del(`${BASE}/delete`, { id })
