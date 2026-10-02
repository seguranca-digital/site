import { nextTick } from 'vue'
import { createRouter, createWebHashHistory } from 'vue-router'
import AboutView from './views/AboutView.vue'
import BoardView from './views/BoardView.vue'
import EditorView from './views/EditorView.vue'
import SettingsView from './views/SettingsView.vue'

const appName = 'Comunicador Alternativo'

export const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', name: 'board', component: BoardView },
    { path: '/sobre', name: 'about', component: AboutView, meta: { title: 'Sobre' } },
    { path: '/editor', name: 'editor', component: EditorView, meta: { title: 'Editor' } },
    {
      path: '/configuracoes',
      name: 'settings',
      component: SettingsView,
      meta: { title: 'Configurações' },
    },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
  scrollBehavior: () => ({ top: 0 }),
})

router.afterEach((to, from) => {
  const title = to.meta.title
  document.title = typeof title === 'string' ? `${title} — ${appName}` : appName

  if (from.matched.length === 0) return
  void nextTick(() => document.querySelector<HTMLElement>('main h1')?.focus())
})
