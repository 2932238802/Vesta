// 咨询树模板注册表。
//
// 每份成交稿对应一个模板；生成器按这里的顺序输出。
// 新增模板时：写一个新的 tree-definition-*.mjs（导出 meta 和 tree），再在这里登记。

import { meta as peakMeta, tree as peakTree } from './tree-definition.mjs'

export const templates = [
  {
    ...peakMeta,
    definition: peakTree
  }
]
