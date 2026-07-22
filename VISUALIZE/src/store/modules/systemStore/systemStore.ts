import { defineStore } from 'pinia'
import { StorageEnum } from '@/enums/storageEnum'
import { getLocalStorage, setLocalStorage, clearLocalStorage } from '@/utils'

export interface TokenInfo {
  accessToken: string
  refreshToken?: string
  expiresTime?: string
  userId?: number
  username?: string
}

interface SystemStoreType {
  tokenInfo: TokenInfo | null
}

export const useSystemStore = defineStore({
  id: 'useSystemStore',
  state: (): SystemStoreType => ({
    tokenInfo: getLocalStorage(StorageEnum.GO_ACCESS_TOKEN_STORE) || null
  }),
  getters: {
    getAccessToken(): string {
      return this.tokenInfo?.accessToken || ''
    },
    isLogin(): boolean {
      return !!this.tokenInfo?.accessToken
    }
  },
  actions: {
    setTokenInfo(info: TokenInfo) {
      this.tokenInfo = info
      setLocalStorage(StorageEnum.GO_ACCESS_TOKEN_STORE, info)
    },
    clearToken() {
      this.tokenInfo = null
      clearLocalStorage(StorageEnum.GO_ACCESS_TOKEN_STORE)
      clearLocalStorage(StorageEnum.GO_LOGIN_INFO_STORE)
    }
  }
})
