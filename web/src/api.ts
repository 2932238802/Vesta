import { adminApi } from './api/admin'
import { consultApi } from './api/consult'
import { publicApi } from './api/public'

export * from './api/request'
export * from './api/types'
export * from './api/public'

/** 兼容旧入口：所有页面继续 `import { api } from '@/api'`。 */
export const api = {
  ...adminApi,
  ...consultApi,
  ...publicApi
}
