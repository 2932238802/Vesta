import type { ConsultContext, ConsultNode, ConsultRun } from './consult'

export interface ConsultPathFeature {
  tag: string
  count: number
  studentRuns: number
  share: number
}

export interface ConsultStudentFeature {
  tag: string
  runs: number
  share: number
}

export interface ConsultPathIndex {
  id: string
  leafId: string
  nodeIds: string[]
  pathText: string[]
  nodeCount: number
  features: ConsultPathFeature[]
  studentFeatures: ConsultStudentFeature[]
  runCount: number
  won: number
  lost: number
  abandoned: number
  liked: number
  decidedCount: number
  conversionRate: number | null
  conversionLowerBound: number | null
  lastUsedAt: string | null
}

export interface ConsultPathRank extends ConsultPathIndex {
  matchedTags: string[]
  matchCoverage: number
  pathCoverage: number
}

function cleanTag(tag: string): string {
  return tag.trim().toLocaleLowerCase()
}

function uniqueTags(tags: string[]): string[] {
  return [...new Set(tags.map(cleanTag).filter(Boolean))]
}

function stableHash(value: string): string {
  let hash = 0x811c9dc5
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 0x01000193)
  }
  return (hash >>> 0).toString(16).padStart(8, '0')
}

export function consultPathId(nodeIds: string[]): string {
  return `pth_${stableHash(nodeIds.join('>'))}`
}

export function collectConsultLeafPaths(root: ConsultNode): ConsultNode[][] {
  const paths: ConsultNode[][] = []
  const stack: { node: ConsultNode; path: ConsultNode[] }[] = [{ node: root, path: [] }]
  while (stack.length) {
    const current = stack.pop()!
    const next = [...current.path, current.node]
    if (!current.node.children.length) {
      paths.push(next)
      continue
    }
    for (let index = current.node.children.length - 1; index >= 0; index -= 1) {
      stack.push({ node: current.node.children[index], path: next })
    }
  }
  return paths
}

function pathFeatureTags(path: ConsultNode[]): Map<string, number> {
  const counts = new Map<string, number>()
  for (const node of path) {
    for (const tag of uniqueTags(node.metadata?.tags ?? [])) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1)
    }
  }
  return counts
}

export function extractConsultStudentTags(
  context: ConsultContext,
  vocabulary: string[]
): string[] {
  const tags = new Set(uniqueTags(context.tags ?? []))
  const haystack = [context.mentions, context.profile, context.conversation]
    .filter((value): value is string => typeof value === 'string' && Boolean(value.trim()))
    .join(' ')
    .toLocaleLowerCase()
  for (const tag of vocabulary) {
    if (haystack.includes(tag)) tags.add(tag)
  }
  return [...tags]
}

export function wilsonLowerBound(successes: number, total: number): number | null {
  if (total <= 0) return null
  const z = 1.96
  const p = Math.min(1, Math.max(0, successes / total))
  const denominator = 1 + (z * z) / total
  const centre = p + (z * z) / (2 * total)
  const margin = z * Math.sqrt((p * (1 - p) + (z * z) / (4 * total)) / total)
  return Math.max(0, (centre - margin) / denominator)
}

function runPathKey(run: ConsultRun): string {
  return run.path.map((item) => item.id).join('>')
}

export function buildConsultPathIndexes(
  root: ConsultNode | ConsultNode[],
  runs: ConsultRun[]
): { paths: ConsultPathIndex[]; vocabulary: string[] } {
  const roots = Array.isArray(root) ? root : [root]
  const leafPaths = roots.flatMap((item) => collectConsultLeafPaths(item))
  const featureTagsByPath = new Map(
    leafPaths.map((path) => [path.map((node) => node.id).join('>'), pathFeatureTags(path)])
  )
  const vocabulary = uniqueTags(
    leafPaths.flatMap((path) => [...(featureTagsByPath.get(path.map((node) => node.id).join('>'))?.keys() ?? [])])
  )
  const runsByPath = new Map<string, ConsultRun[]>()
  for (const run of runs) {
    if (!run.path.length) continue
    const key = runPathKey(run)
    if (!featureTagsByPath.has(key)) continue
    const list = runsByPath.get(key) ?? []
    list.push(run)
    runsByPath.set(key, list)
  }

  const paths = leafPaths.map((path) => {
    const leaf = path.at(-1)!
    const nodeIds = path.map((node) => node.id)
    const key = nodeIds.join('>')
    const matchedRuns = runsByPath.get(key) ?? []
    const featureTags = featureTagsByPath.get(key) ?? new Map<string, number>()
    const tagRuns = new Map<string, number>()
    for (const run of matchedRuns) {
      for (const tag of extractConsultStudentTags(run.context, vocabulary)) {
        tagRuns.set(tag, (tagRuns.get(tag) ?? 0) + 1)
      }
    }
    const won = matchedRuns.filter((run) => run.outcome === 'won').length
    const lost = matchedRuns.filter((run) => run.outcome === 'lost').length
    const abandoned = matchedRuns.filter((run) => run.outcome === 'abandoned').length
    const liked = matchedRuns.filter((run) => run.outcome === 'liked').length
    const decidedCount = won + lost + abandoned
    const conversionRate = decidedCount ? won / decidedCount : null
    const lastUsedAt = matchedRuns.reduce<string | null>((latest, run) => {
      if (!latest || run.createdAt > latest) return run.createdAt
      return latest
    }, null)

    return {
      id: consultPathId(nodeIds),
      leafId: leaf.id,
      nodeIds,
      pathText: path.map((node) => node.text),
      nodeCount: path.length,
      features: [...featureTags.entries()]
        .map(([tag, count]) => ({
          tag,
          count,
          studentRuns: tagRuns.get(tag) ?? 0,
          share: matchedRuns.length ? Math.round(((tagRuns.get(tag) ?? 0) / matchedRuns.length) * 1000) / 1000 : 0
        }))
        .sort((a, b) => b.studentRuns - a.studentRuns || b.count - a.count || a.tag.localeCompare(b.tag)),
      studentFeatures: [...tagRuns.entries()]
        .map(([tag, count]) => ({
          tag,
          runs: count,
          share: matchedRuns.length ? Math.round((count / matchedRuns.length) * 1000) / 1000 : 0
        }))
        .sort((a, b) => b.runs - a.runs || a.tag.localeCompare(b.tag)),
      runCount: matchedRuns.length,
      won,
      lost,
      abandoned,
      liked,
      decidedCount,
      conversionRate,
      conversionLowerBound: wilsonLowerBound(won, decidedCount),
      lastUsedAt
    }
  })

  return { paths, vocabulary }
}

export function rankConsultPathIndexes(
  indexes: ConsultPathIndex[],
  context: ConsultContext,
  limit = 20
): ConsultPathRank[] {
  const vocabulary = uniqueTags(indexes.flatMap((index) => index.features.map((item) => item.tag)))
  const studentTags = extractConsultStudentTags(context, vocabulary)
  const studentSet = new Set(studentTags)
  const ranks = indexes.map((index) => {
    const featureTags = uniqueTags(index.features.map((item) => item.tag))
    const matchedTags = featureTags.filter((tag) => studentSet.has(tag))
    return {
      ...index,
      matchedTags,
      matchCoverage: studentTags.length ? matchedTags.length / studentTags.length : 0,
      pathCoverage: featureTags.length ? matchedTags.length / featureTags.length : 0
    }
  })
  ranks.sort((a, b) => {
    if (b.matchCoverage !== a.matchCoverage) return b.matchCoverage - a.matchCoverage
    if (b.pathCoverage !== a.pathCoverage) return b.pathCoverage - a.pathCoverage
    const aConversion = a.conversionLowerBound ?? -1
    const bConversion = b.conversionLowerBound ?? -1
    if (bConversion !== aConversion) return bConversion - aConversion
    if (b.decidedCount !== a.decidedCount) return b.decidedCount - a.decidedCount
    return a.id.localeCompare(b.id)
  })
  return ranks.slice(0, limit)
}
