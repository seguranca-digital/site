import { getCurrentScope, onScopeDispose, readonly, ref, toValue, type MaybeRefOrGetter } from 'vue'

export interface ScanGroup {
  id: string
  itemIds: string[]
}

export interface ScanStructure {
  groups: ScanGroup[]
}

export type ScanLevel = 'group' | 'item'

export const BACK_ITEM_ID = 'scan:voltar'

export interface ScanningOptions {
  structure: MaybeRefOrGetter<ScanStructure>
  intervalMs: MaybeRefOrGetter<number>
  loopsBeforePause: MaybeRefOrGetter<number>
  automatic: MaybeRefOrGetter<boolean>
  onSelect: (groupId: string, itemId: string) => void
}

export function useScanning(options: ScanningOptions) {
  const level = ref<ScanLevel>('group')
  const highlightedId = ref<string | null>(null)
  const highlightedGroupId = ref<string | null>(null)
  const isRunning = ref(false)
  const isPaused = ref(false)

  let groupIndex = 0
  let itemIndex = 0
  let openGroupId: string | null = null
  let loops = 0
  let timer: ReturnType<typeof setTimeout> | undefined

  function groups(): ScanGroup[] {
    return toValue(options.structure).groups.filter((group) => group.itemIds.length > 0)
  }

  function goToGroups(index: number) {
    level.value = 'group'
    groupIndex = index
    loops = 0
  }

  function updateHighlight() {
    const list = groups()
    if (level.value === 'item') {
      const openIndex = list.findIndex((group) => group.id === openGroupId)
      if (openIndex >= 0) groupIndex = openIndex
      else goToGroups(0)
    }
    if (groupIndex >= list.length) groupIndex = 0

    const group = list[groupIndex]
    if (!group) {
      highlightedId.value = null
      highlightedGroupId.value = null
      return
    }
    highlightedGroupId.value = group.id
    if (level.value === 'group') {
      highlightedId.value = group.id
      return
    }
    const items = [...group.itemIds, BACK_ITEM_ID]
    if (itemIndex >= items.length) itemIndex = 0
    highlightedId.value = items[itemIndex] ?? null
  }

  function schedule() {
    clearTimeout(timer)
    timer = undefined
    if (isRunning.value && !isPaused.value && toValue(options.automatic)) {
      timer = setTimeout(advance, toValue(options.intervalMs))
    }
  }

  function pause() {
    isPaused.value = true
    highlightedId.value = null
    highlightedGroupId.value = null
  }

  function start() {
    isRunning.value = true
    isPaused.value = false
    goToGroups(0)
    updateHighlight()
    schedule()
  }

  function stop() {
    isRunning.value = false
    isPaused.value = false
    clearTimeout(timer)
    timer = undefined
    highlightedId.value = null
    highlightedGroupId.value = null
  }

  function advance() {
    if (!isRunning.value || isPaused.value) return
    const count =
      level.value === 'group'
        ? groups().length
        : (groups().find((group) => group.id === openGroupId)?.itemIds.length ?? 0) + 1

    let next = (level.value === 'group' ? groupIndex : itemIndex) + 1
    if (next >= count) {
      next = 0
      loops++
      const limit = toValue(options.loopsBeforePause)
      if (toValue(options.automatic) && limit > 0 && loops >= limit) {
        pause()
        return
      }
    }
    if (level.value === 'group') groupIndex = next
    else itemIndex = next
    updateHighlight()
    schedule()
  }

  function press() {
    if (!isRunning.value) return
    if (isPaused.value) {
      isPaused.value = false
      goToGroups(0)
    } else if (level.value === 'group') {
      if (highlightedId.value === null) return
      level.value = 'item'
      openGroupId = highlightedId.value
      itemIndex = 0
      loops = 0
    } else if (highlightedId.value === BACK_ITEM_ID) {
      goToGroups(groupIndex)
    } else if (highlightedId.value !== null && highlightedGroupId.value !== null) {
      const selected = { groupId: highlightedGroupId.value, itemId: highlightedId.value }
      goToGroups(0)
      options.onSelect(selected.groupId, selected.itemId)
    }
    updateHighlight()
    schedule()
  }

  if (getCurrentScope()) onScopeDispose(stop)

  return {
    level: readonly(level),
    highlightedId: readonly(highlightedId),
    highlightedGroupId: readonly(highlightedGroupId),
    isRunning: readonly(isRunning),
    isPaused: readonly(isPaused),
    start,
    stop,
    press,
    advance,
  }
}

export interface PressFilter {
  down: () => void
  up: () => void
}

export function createPressFilter(
  acceptanceMs: MaybeRefOrGetter<number>,
  onAccept: () => void,
): PressFilter {
  let isDown = false
  let timer: ReturnType<typeof setTimeout> | undefined

  return {
    down() {
      if (isDown) return
      isDown = true
      const delay = toValue(acceptanceMs)
      if (delay <= 0) {
        onAccept()
        return
      }
      timer = setTimeout(() => {
        timer = undefined
        onAccept()
      }, delay)
    },
    up() {
      isDown = false
      clearTimeout(timer)
      timer = undefined
    },
  }
}
