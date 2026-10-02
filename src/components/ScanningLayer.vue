<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, useTemplateRef, watch } from 'vue'
import {
  BACK_ITEM_ID,
  createPressFilter,
  useScanning,
  type ScanStructure,
} from '../composables/useScanning'
import { useSpeech } from '../composables/useSpeech'
import { useSettingsStore } from '../stores/settingsStore'
import HoldButton from './HoldButton.vue'

const settings = useSettingsStore()
const { speak } = useSpeech()
const layerRef = useTemplateRef<HTMLDivElement>('layer')
const backRef = useTemplateRef<HTMLButtonElement>('back')

const isTwoButtons = computed(() => settings.scanning.mode === 'dois-botoes')

function root(): HTMLElement | null {
  return layerRef.value?.closest<HTMLElement>('[data-scan-root]') ?? null
}

function groupElements(): HTMLElement[] {
  return Array.from(root()?.querySelectorAll<HTMLElement>('[data-scan-group]') ?? [])
}

function itemElements(group: HTMLElement): HTMLElement[] {
  return Array.from(group.querySelectorAll<HTMLElement>('[data-scan-item]'))
}

function findGroup(groupId: string | null): HTMLElement | undefined {
  return groupElements().find((group) => group.dataset.scanGroup === groupId)
}

function findItem(groupId: string | null, itemId: string): HTMLElement | undefined {
  const group = findGroup(groupId)
  return group && itemElements(group).find((item) => item.dataset.scanItem === itemId)
}

function readStructure(): ScanStructure {
  return {
    groups: groupElements().map((group) => ({
      id: group.dataset.scanGroup ?? '',
      itemIds: itemElements(group).map((item) => item.dataset.scanItem ?? ''),
    })),
  }
}

const scanning = useScanning({
  structure: readStructure,
  intervalMs: () => settings.scanning.intervalMs,
  loopsBeforePause: () => settings.scanning.loopsBeforePause,
  automatic: () => !isTwoButtons.value,
  onSelect: (groupId, itemId) => findItem(groupId, itemId)?.click(),
})
const { level, highlightedId, highlightedGroupId, isPaused } = scanning

let highlighted: HTMLElement | undefined
let openGroup: HTMLElement | undefined

function clearMarks() {
  highlighted?.removeAttribute('data-scan-highlight')
  openGroup?.removeAttribute('data-scan-open')
  highlighted = undefined
  openGroup = undefined
}

function nameOf(element: HTMLElement): string {
  return (
    element.dataset.scanLabel ??
    element.getAttribute('aria-label') ??
    element.textContent?.trim() ??
    ''
  )
}

watch([highlightedId, level], async () => {
  await nextTick()
  clearMarks()
  const id = highlightedId.value
  if (id === null) return

  if (level.value === 'group') {
    highlighted = findGroup(id)
  } else {
    openGroup = findGroup(highlightedGroupId.value)
    openGroup?.setAttribute('data-scan-open', '')
    highlighted =
      id === BACK_ITEM_ID ? (backRef.value ?? undefined) : findItem(highlightedGroupId.value, id)
  }
  if (!highlighted) return

  highlighted.setAttribute('data-scan-highlight', level.value === 'group' ? 'grupo' : 'item')
  highlighted.focus()
  if (settings.scanning.auditoryPreview) speak(nameOf(highlighted), { preview: true })
})

type SwitchAction = 'advance' | 'select'

function trigger(action: SwitchAction) {
  const dialog = root()?.querySelector<HTMLDialogElement>('dialog[open]')
  if (dialog) {
    dialog.close()
    return
  }
  if (action === 'advance') scanning.advance()
  else scanning.press()
}

const acceptanceMs = () => settings.scanning.acceptanceMs
const switches = {
  select: createPressFilter(acceptanceMs, () => trigger('select')),
  advance: createPressFilter(acceptanceMs, () => trigger('advance')),
}

function actionForKey(key: string): SwitchAction | undefined {
  if (key === 'Enter') return 'select'
  if (key === ' ') return isTwoButtons.value ? 'advance' : 'select'
  return undefined
}

function actionForPoint(clientX: number | null): SwitchAction {
  if (!isTwoButtons.value || clientX === null) return 'select'
  return clientX < window.innerWidth / 2 ? 'advance' : 'select'
}

function turnOff() {
  settings.scanning.enabled = false
}

function onKeyDown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    if (!root()?.querySelector('dialog[open]')) turnOff()
    return
  }
  const action = actionForKey(event.key)
  if (!action) return
  event.preventDefault()
  event.stopPropagation()
  if (!event.repeat) switches[action].down()
}

function onKeyUp(event: KeyboardEvent) {
  const action = actionForKey(event.key)
  if (!action) return
  event.preventDefault()
  event.stopPropagation()
  switches[action].up()
}

let pointerAction: SwitchAction | undefined

function onPointerDown(event: PointerEvent) {
  event.preventDefault()
  if (pointerAction) switches[pointerAction].up()
  pointerAction = actionForPoint(event.clientX)
  switches[pointerAction].down()
}

function onPointerUp() {
  if (pointerAction) switches[pointerAction].up()
  pointerAction = undefined
}

function onOffRelease(heldMs: number, clientX: number | null) {
  if (heldMs >= settings.scanning.acceptanceMs) trigger(actionForPoint(clientX))
}

watch(isTwoButtons, () => {
  scanning.stop()
  scanning.start()
})

onMounted(() => {
  window.addEventListener('keydown', onKeyDown, true)
  window.addEventListener('keyup', onKeyUp, true)
  scanning.start()
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeyDown, true)
  window.removeEventListener('keyup', onKeyUp, true)
  switches.select.up()
  switches.advance.up()
  scanning.stop()
  clearMarks()
})
</script>

<template>
  <div ref="layer">
    <div
      class="scan-overlay"
      :class="{ 'scan-overlay--split': isTwoButtons }"
      @pointerdown="onPointerDown"
      @pointerup="onPointerUp"
      @pointercancel="onPointerUp"
      @contextmenu.prevent
    >
      <template v-if="isTwoButtons">
        <span class="scan-overlay__label scan-overlay__label--advance" aria-hidden="true">
          Avançar
        </span>
        <span class="scan-overlay__label scan-overlay__label--select" aria-hidden="true">
          Selecionar
        </span>
      </template>
      <p v-if="isPaused" class="scan-overlay__paused" aria-hidden="true">
        Pressione para continuar
      </p>
    </div>

    <div
      class="scan-bar"
      @pointerdown="onPointerDown"
      @pointerup="onPointerUp"
      @pointercancel="onPointerUp"
      @contextmenu.prevent
    >
      <HoldButton class="scan-bar__off" @complete="turnOff" @release="onOffRelease">
        Desligar varredura
      </HoldButton>
      <button
        v-if="level === 'item'"
        ref="back"
        type="button"
        tabindex="-1"
        class="btn scan-bar__back"
      >
        <span aria-hidden="true">↩</span> Voltar
      </button>
      <p class="visually-hidden" role="status">
        {{ isPaused ? 'Varredura pausada. Pressione para continuar.' : '' }}
      </p>
    </div>
  </div>
</template>

<style scoped>
.scan-overlay {
  position: fixed;
  inset: 0;
  z-index: 20;
  touch-action: none;
  user-select: none;
  -webkit-user-select: none;
  -webkit-tap-highlight-color: transparent;
}

.scan-overlay--split {
  background: linear-gradient(
    to right,
    transparent calc(50% - 0.125rem),
    var(--color-scan) calc(50% - 0.125rem) calc(50% + 0.125rem),
    transparent calc(50% + 0.125rem)
  );
}

.scan-overlay__label {
  position: absolute;
  bottom: calc(var(--scan-bar-height) + var(--space-3));
  padding: var(--space-1) var(--space-4);
  border-radius: 999px;
  background: var(--color-scan);
  color: var(--color-scan-text);
  font-size: 1.125rem;
  font-weight: 700;
  transform: translateX(-50%);
}

.scan-overlay__label--advance {
  left: 25%;
}

.scan-overlay__label--select {
  left: 75%;
}

.scan-overlay__paused {
  position: absolute;
  top: 50%;
  left: 50%;
  width: max-content;
  max-width: calc(100% - 2rem);
  padding: var(--space-6);
  border: 0.375rem solid var(--color-scan-halo);
  border-radius: var(--radius);
  background: var(--color-scan);
  color: var(--color-scan-text);
  font-size: 1.75rem;
  font-weight: 700;
  text-align: center;
  transform: translate(-50%, -50%);
}

.scan-bar {
  position: fixed;
  inset: auto 0 0;
  z-index: 21;
  display: flex;
  gap: var(--space-3);
  align-items: center;
  min-height: var(--scan-bar-height);
  padding: var(--space-2) var(--space-3);
  padding-bottom: calc(var(--space-2) + env(safe-area-inset-bottom, 0px));
  border-top: var(--border-width) solid var(--color-border);
  background: var(--color-surface);
  touch-action: none;
  user-select: none;
  -webkit-user-select: none;
}

.scan-bar__back {
  min-width: 9rem;
  margin-left: auto;
  font-size: 1.25rem;
}
</style>
