import { defineStore } from 'pinia'
import type { Settings } from '../types'

// Valores padrão definidos na especificação (seção 4)
export function createDefaultSettings(): Settings {
  return {
    voiceURI: null,
    rate: 0.9,
    pitch: 1,
    volume: 1,
    speakOnTap: true,
    clearAfterSpeak: false,
    gridColumns: 4,
    fontScale: 1,
    showLabels: true,
    theme: 'claro',
    scanning: {
      enabled: false,
      mode: 'automatica',
      intervalMs: 1500,
      acceptanceMs: 0,
      auditoryPreview: false,
      loopsBeforePause: 3,
    },
  }
}

export interface NumberLimits {
  min: number
  max: number
  step: number
}

// Faixas dos controles da tela de configurações; também usadas para validar o que vem do
// IndexedDB e dos backups
export const SETTINGS_LIMITS = {
  rate: { min: 0.5, max: 2, step: 0.1 },
  pitch: { min: 0, max: 2, step: 0.1 },
  volume: { min: 0, max: 1, step: 0.1 },
  gridColumns: { min: 2, max: 6, step: 1 },
  fontScale: { min: 1, max: 2, step: 0.25 },
  intervalMs: { min: 500, max: 5000, step: 100 },
  // Até 2 s: segurar o botão "Desligar varredura" por 2 s desliga a varredura
  acceptanceMs: { min: 0, max: 2000, step: 100 },
  loopsBeforePause: { min: 1, max: 10, step: 1 },
} satisfies Record<string, NumberLimits>

export const THEMES = ['claro', 'escuro', 'alto-contraste'] as const satisfies readonly Settings['theme'][]

export const useSettingsStore = defineStore('settings', {
  state: createDefaultSettings,
})
