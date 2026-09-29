<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue'

// Botão que só é acionado se ficar pressionado por `durationMs` (padrão 2 s), com indicador
// de progresso. Serve para ações que o usuário principal não deve disparar sem querer.
// Funciona com toque/mouse e com teclado (segurando Enter ou Espaço).
const props = withDefaults(defineProps<{ durationMs?: number }>(), { durationMs: 2000 })
const emit = defineEmits<{
  complete: []
  // Soltou antes do tempo: quanto tempo segurou e onde (null no teclado)
  release: [heldMs: number, clientX: number | null]
}>()

const progress = ref(0)
let holding = false
let startedAt = 0
let startX: number | null = null
let completeTimer: ReturnType<typeof setTimeout> | undefined
let frame = 0

function updateProgress() {
  progress.value = Math.min((performance.now() - startedAt) / props.durationMs, 1)
  if (holding) frame = requestAnimationFrame(updateProgress)
}

function start(clientX: number | null) {
  if (holding) return
  holding = true
  startedAt = performance.now()
  startX = clientX
  completeTimer = setTimeout(complete, props.durationMs)
  frame = requestAnimationFrame(updateProgress)
}

function reset() {
  holding = false
  clearTimeout(completeTimer)
  cancelAnimationFrame(frame)
  progress.value = 0
}

function complete() {
  reset()
  emit('complete')
}

// Soltou antes de completar; `cancelled` quando o navegador interrompeu o toque
function end(cancelled = false) {
  if (!holding) return
  const heldMs = performance.now() - startedAt
  reset()
  if (!cancelled) emit('release', heldMs, startX)
}

// O botão cuida do próprio toque: não repassa para quem estiver em volta
function onPointerDown(event: PointerEvent) {
  event.stopPropagation()
  ;(event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId)
  start(event.clientX)
}

function onPointerUp(event: PointerEvent) {
  event.stopPropagation()
  end()
}

function onPointerCancel(event: PointerEvent) {
  event.stopPropagation()
  end(true)
}

function isHoldKey(event: KeyboardEvent): boolean {
  return event.key === 'Enter' || event.key === ' '
}

function onKeyDown(event: KeyboardEvent) {
  if (!isHoldKey(event)) return
  // Evita o clique nativo; o keydown repetido enquanto a tecla está segurada é ignorado
  event.preventDefault()
  if (!event.repeat) start(null)
}

function onKeyUp(event: KeyboardEvent) {
  if (!isHoldKey(event)) return
  event.preventDefault()
  end()
}

onBeforeUnmount(reset)
</script>

<template>
  <button
    type="button"
    class="btn hold-button"
    @pointerdown="onPointerDown"
    @pointerup="onPointerUp"
    @pointercancel="onPointerCancel"
    @keydown="onKeyDown"
    @keyup="onKeyUp"
    @blur="end(true)"
    @click.prevent
    @contextmenu.prevent
  >
    <slot />
    <span class="visually-hidden">(segure por {{ durationMs / 1000 }} segundos)</span>
    <span
      class="hold-button__progress"
      aria-hidden="true"
      :style="{ transform: `scaleX(${progress})` }"
    />
  </button>
</template>

<style scoped>
.hold-button {
  position: relative;
  overflow: hidden;
  /* Toque longo não pode abrir menu nem selecionar texto */
  touch-action: none;
  user-select: none;
  -webkit-user-select: none;
  -webkit-touch-callout: none;
}

/* Barra de progresso na base do botão, controlada por JS (não é animação CSS,
   então continua visível com prefers-reduced-motion) */
.hold-button__progress {
  position: absolute;
  inset: auto 0 0;
  height: 0.375rem;
  background: var(--color-primary);
  transform-origin: left;
}
</style>
