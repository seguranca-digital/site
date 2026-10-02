<script setup lang="ts">
import { watchEffect } from 'vue'
import { RouterLink, RouterView, useRoute } from 'vue-router'
import { useSettingsStore } from './stores/settingsStore'

const route = useRoute()
const settings = useSettingsStore()

watchEffect(() => {
  const root = document.documentElement
  root.dataset.theme = settings.theme
  root.style.setProperty('--font-scale', String(settings.fontScale))
})
</script>

<template>
  <main>
    <RouterView />
  </main>
  <footer v-if="route.name !== 'about'" class="app-footer">
    <RouterLink to="/sobre" class="app-footer__link">Sobre e créditos</RouterLink>
  </footer>
</template>

<style scoped>
.app-footer {
  display: flex;
  justify-content: center;
  padding: 0 var(--space-3) var(--space-4);
}

.app-footer__link {
  display: inline-flex;
  align-items: center;
  min-height: 2.75rem;
  padding-inline: var(--space-3);
  color: var(--color-link);
  font-weight: 600;
  text-underline-offset: 0.2em;
}
</style>
