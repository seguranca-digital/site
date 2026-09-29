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

export const useSettingsStore = defineStore('settings', {
  state: createDefaultSettings,
})
