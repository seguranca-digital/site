import { nextTick } from 'vue'
import { createRouter, createWebHashHistory } from 'vue-router'
import AboutView from './views/AboutView.vue'
import BoardView from './views/BoardView.vue'

const appName = 'Comunicador Alternativo'

// Histórico com hash: evita erro 404 ao recarregar a página no GitHub Pages
export const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', name: 'board', component: BoardView },
    { path: '/sobre', name: 'about', component: AboutView, meta: { title: 'Sobre' } },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
  scrollBehavior: () => ({ top: 0 }),
})

// Ao trocar de tela: atualiza o título da aba e leva o foco ao título da nova tela,
// para o leitor de tela anunciar a mudança
router.afterEach((to, from) => {
  const title = to.meta.title
  document.title = typeof title === 'string' ? `${title} — ${appName}` : appName

  // No carregamento inicial o foco fica onde o navegador colocou
  if (from.matched.length === 0) return
  void nextTick(() => document.querySelector<HTMLElement>('main h1')?.focus())
})
