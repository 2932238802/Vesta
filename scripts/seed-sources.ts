/**
 * 写入分数线抓取源种子：31 省考试院专升本 + 研招网国家线 / 复试线汇总。
 * 幂等，重复执行不会覆盖管理员改过的启用状态和上次运行时间。
 *
 * 用法：npx tsx scripts/seed-sources.ts
 */
import '../server/src/db'
import { seedScorelineSources, listSources } from '../server/src/score-lines/sources'

const count = seedScorelineSources()
const sources = listSources()
console.log(`已写入 / 更新 ${count} 个抓取源，当前共 ${sources.length} 个`)
for (const source of sources.slice(0, 5)) {
  console.log(`- ${source.tier} ${source.province} ${source.name} ${source.url}`)
}
if (sources.length > 5) console.log(`…其余 ${sources.length - 5} 个可在后台查看`)
