import request from '@/utils/request'

// 获取工单列表
export const getOrderList = (params) => {
  return request({
    url: '/admin/orders',
    method: 'get',
    params
  })
}

// 更新工单状态
export const updateOrderStatus = (id, data) => {
  return request({
    url: `/admin/orders/${id}/status`,
    method: 'put',
    data
  })
}

// 获取工单详情
export const getOrderDetail = (id) => {
  return request({
    url: `/admin/orders/${id}`,
    method: 'get'
  })
}

// 获取数据统计
export const getStatistics = (params) => {
  return request({
    url: '/admin/statistics',
    method: 'get',
    params
  })
}

// 获取仪表盘图表数据
export const getDashboardChartData = () => {
  return request({
    url: '/admin/dashboard-chart-data',
    method: 'get'
  })
}

// 获取非五星订单列表
export const getNonFiveStarOrders = (params) => {
  return request({
    url: '/admin/orders/non-five-star',
    method: 'get',
    params
  })
}

// 获取最近活动
export const getRecentActivities = (params) => {
  return request({
    url: '/admin/activities',
    method: 'get',
    params
  })
}