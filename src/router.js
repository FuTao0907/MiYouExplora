// 路由：多游戏导航
// - /game/:gameId            地区总览（默认游戏由 store 初始化决定）
// - /game/:gameId/region/:regionId   单地区录入表格
// URL 可直达 / 分享 / 刷新不丢状态；未匹配路径重定向到默认游戏
import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  { path: '/', redirect: () => ({ path: '/game/genshin' }) },
  {
    path: '/game/:gameId',
    name: 'overview',
    component: () => import('./views/Overview.vue')
  },
  {
    path: '/game/:gameId/region/:regionId',
    name: 'region',
    component: () => import('./views/RegionView.vue')
  },
  { path: '/:pathMatch(.*)*', redirect: '/game/genshin' }
]

export default createRouter({
  history: createWebHistory(),
  routes
})
