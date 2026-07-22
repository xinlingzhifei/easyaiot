import { get, post, del } from '@/api/http'
import { axiosPre } from '@/settings/httpSetting'

const BASE = `${axiosPre}/visualize/asset`

export const fetchAssetPageApi = (params: {
  pageNo?: number
  pageSize?: number
  assetName?: string
  assetType?: string
}) => get(`${BASE}/page`, params)

export const createAssetApi = (data: {
  assetName: string
  assetType?: string
  fileUrl: string
  fileSize?: number
  remarks?: string
}) => post(`${BASE}/create`, data)

export const deleteAssetApi = (id: string | number) => del(`${BASE}/delete`, { id })
