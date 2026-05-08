import { createRouter, createWebHashHistory } from 'vue-router'

const TOKEN_KEY = 'admin_token'

function checkAuth() {
  return !!localStorage.getItem(TOKEN_KEY)
}

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/Login.vue')
  },
  {
    path: '/',
    name: 'ElectricianList',
    component: () => import('../views/ElectricianList.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/electrician-detail',
    name: 'ElectricianDetail',
    component: () => import('../views/ElectricianDetail.vue'),
    meta: { requiresAuth: true }
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

router.beforeEach((to, from, next) => {
  if (to.meta.requiresAuth && !checkAuth()) {
    next('/login')
  } else if (to.path === '/login' && checkAuth()) {
    next('/')
  } else {
    next()
  }
})

export default router
