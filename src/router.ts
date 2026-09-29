import { createRouter, createWebHashHistory } from 'vue-router'
import BoardView from './views/BoardView.vue'

// Histórico com hash: evita erro 404 ao recarregar a página no GitHub Pages
export const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', name: 'board', component: BoardView },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
})
