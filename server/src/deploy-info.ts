import fs from 'node:fs'
import path from 'node:path'
import { config } from './env'

export interface DeployInfo {
  commit: string
  productVersion: string
}

let cached: DeployInfo | null | undefined

/**
 * 部署元数据由 update.sh 在重启前写入 data/deploy-info.json（见第 9 篇文档）。
 * 文件不存在时返回 null，/api/health 的 commit / appVersion 留空，update.sh 的 L5 自动退回降级校验。
 */
export function readDeployInfo(): DeployInfo | null {
  if (cached !== undefined) return cached
  try {
    const raw = fs.readFileSync(path.join(config.dataDir, 'deploy-info.json'), 'utf8')
    const parsed = JSON.parse(raw) as Record<string, unknown>
    cached = {
      commit: typeof parsed.commit === 'string' ? parsed.commit : '',
      productVersion:
        typeof parsed.productVersion === 'string' ? parsed.productVersion : ''
    }
  } catch {
    cached = null
  }
  return cached
}
