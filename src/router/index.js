import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/login',
      name: 'Login',
      component: () => import('@/views/Login.vue'),
      meta: { requiresAuth: false }
    },
    {
      path: '/',
      name: 'Layout',
      component: () => import('@/layout/index.vue'),
      redirect: '/dashboard',
      meta: { requiresAuth: true },
      children: [
        {
          path: '/dashboard',
          name: 'Dashboard',
          component: () => import('@/views/Dashboard.vue'),
          meta: { title: '仪表盘', icon: 'DataBoard' }
        },
        {
          path: '/admins',
          name: 'Admins',
          component: () => import('@/views/Admins.vue'),
          meta: { title: '管理员中心', icon: 'UserFilled' }
        },
        {
          path: '/users',
          name: 'Users',
          component: () => import('@/views/Users.vue'),
          meta: { title: '用户管理', icon: 'User' }
        },
        {
          path: '/electricians',
          name: 'Electricians',
          component: () => import('@/views/Electricians.vue'),
          meta: { title: '电工管理', icon: 'Tools' }
        },
        {
          path: '/orders',
          name: 'Orders',
          component: () => import('@/views/Orders.vue'),
          meta: { title: '工单管理', icon: 'Document' }
        },
        {
          path: '/orders/non-five-star',
          name: 'NonFiveStarOrders',
          component: () => import('@/views/NonFiveStarOrders.vue'),
          meta: { title: '非五星订单', icon: 'Star' }
        },
        {
          path: '/messages',
          name: 'Messages',
          component: () => import('@/views/Messages.vue'),
          meta: { title: '系统通知', icon: 'Bell' }
        },
        {
          path: '/deposits',
          name: 'Deposits',
          component: () => import('@/views/Deposits.vue'),
          meta: { title: '押金管理', icon: 'Wallet' }
        },
        {
          path: '/system/time-period-fees',
          name: 'SystemTimePeriodFees',
          component: () => import('@/views/SystemTimePeriodFees.vue'),
          meta: { title: '时段计费配置', icon: 'Clock' }
        }
      ]
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'NotFound',
      component: () => import('@/views/404.vue')
    }
  ]
})

// 路由守卫
router.beforeEach((to, from, next) => {
  const authStore = useAuthStore()
  
  if (to.meta.requiresAuth && !authStore.isLoggedIn) {
    next('/login')
  } else if (to.path === '/login' && authStore.isLoggedIn) {
    next('/')
  } else {
    next()
  }
})

export default router