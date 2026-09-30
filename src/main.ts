import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import { setupPersistence } from './composables/usePersistence'
import { router } from './router'
import './styles/tokens.css'
import './styles/base.css'

const app = createApp(App).use(createPinia()).use(router)

// Carrega a prancha salva neste aparelho antes de mostrar a tela
setupPersistence().finally(() => app.mount('#app'))
