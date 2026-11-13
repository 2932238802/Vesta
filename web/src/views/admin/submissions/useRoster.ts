import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { currentCycleKey } from '@shared/cycle'
import { api, type AdminRosterRow, type AdminRosterWeek } from '@/api'
import { rosterEmptyText, rosterScoreLabel, TAB_KEYS } from './rosterMeta'

export function useRoster() {
  const route = useRoute()
  const router = useRouter()

  function categoryFromQuery(): string {
    const value = typeof route.query.category === 'string' ? route.query.category : ''
    return TAB_KEYS.has(value) ? value : ''
  }

  const roster = ref<AdminRosterRow[]>([])
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

  const allSelected = computed(
    () => roster.value.length > 0 && selected.value.size === roster.value.length
  )
  const someSelected = computed(
    () => selected.value.size > 0 && selected.value.size < roster.value.length
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

  function clearSelection() {
    selected.value = new Set()
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
  const scoreColumnLabel = computed(() => rosterScoreLabel(roster.value))
  const emptyText = computed(() =>
    rosterEmptyText({
      category: category.value,
      week: week.value,
      weekLabel: weekLabel.value,
      current: isCurrentWeek.value,
      searching: searching.value,
      allWeeksCount: allWeeksCount.value
    })
  )

  function countOf(key: string): number {
    return counts.value[key || 'all'] ?? 0
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
        week: week.value
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
      roster.value = result.roster
      counts.value = result.counts
      // 只保留还在列表里的勾选，避免切期次后选中计数残留。
      const visibleIds = new Set(result.roster.map((row) => row.id))
      selected.value = new Set([...selected.value].filter((id) => visibleIds.has(id)))
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
  watch([week, category], load)
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
    allSelected,
    someSelected,
    allWeeksCount,
    searching,
    weekLabel,
    isCurrentWeek,
    scoreColumnLabel,
    emptyText,
    countOf,
    load,
    toggleRow,
    toggleAll,
    clearSelection,
    showAllWeeks,
    flash
  }
}

export type RosterState = ReturnType<typeof useRoster>
