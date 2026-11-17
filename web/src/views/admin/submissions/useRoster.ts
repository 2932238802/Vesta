import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { currentCycleKey } from '@shared/cycle'
import { api, type AdminRosterGroup, type AdminRosterRow, type AdminRosterWeek } from '@/api'
import { rosterEmptyText, TAB_KEYS } from './rosterMeta'

export function useRoster() {
  const route = useRoute()
  const router = useRouter()

  function categoryFromQuery(): string {
    const value = typeof route.query.category === 'string' ? route.query.category : ''
    return TAB_KEYS.has(value) ? value : ''
  }

  function groupFromQuery(): string {
    return typeof route.query.groupId === 'string' ? route.query.groupId : ''
  }

  const roster = ref<AdminRosterRow[]>([])
  const archive = ref<AdminRosterRow[]>([])
  const groups = ref<AdminRosterGroup[]>([])
  const archiveCount = ref(0)
  const groupId = ref(groupFromQuery())
  const counts = ref<Record<string, number>>({ all: 0 })
  const weeks = ref<AdminRosterWeek[]>([])
  const currentWeek = ref(currentCycleKey())
  // 旧链接带着 group/dates 时不再按那两个参数筛选，直接回到「全部期次」。
  const hasLegacyFilter = Boolean(route.query.group || route.query.dates)
  const week = ref(hasLegacyFilter ? 'all' : currentWeek.value)
  if (hasLegacyFilter) {
    const query = { ...route.query }
    delete query.group
    delete query.dates
    void router.replace({ query })
  }
  const loading = ref(true)
  const error = ref('')
  const q = ref('')
  const category = ref(categoryFromQuery())
  const toast = ref('')
  const selected = ref<Set<string>>(new Set())
  const archiveSelected = ref<Set<string>>(new Set())

  const allSelected = computed(
    () => roster.value.length > 0 && selected.value.size === roster.value.length
  )
  const someSelected = computed(
    () => selected.value.size > 0 && selected.value.size < roster.value.length
  )
  const archiveAllSelected = computed(
    () => archive.value.length > 0 && archiveSelected.value.size === archive.value.length
  )
  const archiveSomeSelected = computed(
    () => archiveSelected.value.size > 0 && archiveSelected.value.size < archive.value.length
  )

  function toggleRow(id: string, event: Event) {
    const next = new Set(selected.value)
    if ((event.target as HTMLInputElement).checked) next.add(id)
    else next.delete(id)
    selected.value = next
  }

  function toggleAll(event: Event) {
    const checked = (event.target as HTMLInputElement).checked
    selected.value = checked ? new Set(roster.value.map((row) => row.id)) : new Set()
  }

  function toggleArchiveRow(id: string, event: Event) {
    const next = new Set(archiveSelected.value)
    if ((event.target as HTMLInputElement).checked) next.add(id)
    else next.delete(id)
    archiveSelected.value = next
  }

  function toggleArchiveAll(event: Event) {
    const checked = (event.target as HTMLInputElement).checked
    archiveSelected.value = checked ? new Set(archive.value.map((row) => row.id)) : new Set()
  }

  function clearSelection() {
    selected.value = new Set()
  }

  function clearArchiveSelection() {
    archiveSelected.value = new Set()
  }

  /** 移出分组 / 删除后从两个选择集合里去掉已不可见的行。 */
  function removeFromSelections(ids: Iterable<string>) {
    const drop = new Set(ids)
    selected.value = new Set([...selected.value].filter((id) => !drop.has(id)))
    archiveSelected.value = new Set([...archiveSelected.value].filter((id) => !drop.has(id)))
  }

  let searchTimer: ReturnType<typeof setTimeout> | undefined
  const allWeeksCount = computed(() => weeks.value.reduce((sum, item) => sum + item.count, 0))
  const searching = computed(() => q.value.trim().length > 0)
  const weekLabel = computed(
    () => weeks.value.find((item) => item.key === week.value)?.label ?? ''
  )
  const isCurrentWeek = computed(
    () => week.value !== 'all' && week.value === currentWeek.value
  )
  const groupName = computed(
    () => groups.value.find((group) => group.id === groupId.value)?.name ?? ''
  )
  const emptyText = computed(() =>
    rosterEmptyText({
      category: category.value,
      week: week.value,
      weekLabel: weekLabel.value,
      current: isCurrentWeek.value,
      searching: searching.value,
      allWeeksCount: allWeeksCount.value,
      groupId: groupId.value,
      groupName: groupName.value,
      archiveCount: archiveCount.value
    })
  )

  function countOf(key: string): number {
    return counts.value[key || 'all'] ?? 0
  }

  function syncGroupQuery(value: string) {
    const current = groupFromQuery()
    if (current === value && !route.query.group && !route.query.dates) return
    const query = { ...route.query }
    if (value) query.groupId = value
    else delete query.groupId
    delete query.group
    delete query.dates
    void router.replace({ query })
  }

  function selectGroup(value: string) {
    if (value === groupId.value) return
    groupId.value = value
    syncGroupQuery(value)
    clearSelection()
    clearArchiveSelection()
    void load()
  }

  let loadRequest = 0

  async function load() {
    const requestId = ++loadRequest
    loading.value = true
    error.value = ''
    try {
      const result = await api.roster({
        q: q.value.trim(),
        category: category.value,
        week: week.value,
        groupId: groupId.value
      })
      if (requestId !== loadRequest) return
      weeks.value = result.weeks
      currentWeek.value = result.currentWeek
      // 老链接或手改的 week 不在列表里：回到本期，再取一次。
      if (week.value !== 'all' && !result.weeks.some((item) => item.key === week.value)) {
        week.value = result.currentWeek
        void load()
        return
      }
      // 组被删或参数非法：接口回空串，前端回「全部」并清掉地址栏参数。
      if (result.groupId !== groupId.value) {
        groupId.value = result.groupId
        syncGroupQuery(result.groupId)
      }
      groups.value = result.groups
      archive.value = result.archive
      archiveCount.value = result.archiveCount
      roster.value = result.roster
      counts.value = result.counts
      // 只保留还在列表里的勾选，避免切期次 / 分组后选中计数残留。
      const visibleIds = new Set(result.roster.map((row) => row.id))
      selected.value = new Set([...selected.value].filter((id) => visibleIds.has(id)))
      const visibleArchiveIds = new Set(result.archive.map((row) => row.id))
      archiveSelected.value = new Set(
        [...archiveSelected.value].filter((id) => visibleArchiveIds.has(id))
      )
    } catch (err) {
      if (requestId !== loadRequest) return
      error.value = err instanceof Error ? err.message : '读取失败'
    } finally {
      if (requestId === loadRequest) loading.value = false
    }
  }

  watch(q, () => {
    if (searchTimer) clearTimeout(searchTimer)
    searchTimer = setTimeout(load, 280)
  })
  watch([week, category], () => {
    clearSelection()
    clearArchiveSelection()
    void load()
  })
  watch(category, (value) => {
    const query = { ...route.query }
    if (value) query.category = value
    else delete query.category
    // 旧链接里的 group / dates 一律忽略并清掉，不再参与筛选。
    delete query.group
    delete query.dates
    void router.replace({ query })
  })
  watch(
    () => route.query.category,
    () => {
      const next = categoryFromQuery()
      if (next !== category.value) category.value = next
    }
  )
  watch(
    () => route.query.groupId,
    () => {
      const next = groupFromQuery()
      if (next !== groupId.value) {
        groupId.value = next
        clearSelection()
        clearArchiveSelection()
        void load()
      }
    }
  )

  function showAllWeeks() {
    week.value = 'all'
  }

  function flash(message: string) {
    toast.value = message
    setTimeout(() => {
      toast.value = ''
    }, 2200)
  }

  return {
    roster,
    archive,
    groups,
    archiveCount,
    groupId,
    counts,
    weeks,
    currentWeek,
    week,
    loading,
    error,
    q,
    category,
    toast,
    selected,
    archiveSelected,
    allSelected,
    someSelected,
    archiveAllSelected,
    archiveSomeSelected,
    allWeeksCount,
    searching,
    weekLabel,
    isCurrentWeek,
    groupName,
    emptyText,
    countOf,
    load,
    toggleRow,
    toggleAll,
    toggleArchiveRow,
    toggleArchiveAll,
    clearSelection,
    clearArchiveSelection,
    removeFromSelections,
    showAllWeeks,
    selectGroup,
    flash
  }
}

export type RosterState = ReturnType<typeof useRoster>
