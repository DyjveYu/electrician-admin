import request from '@/utils/request'

export const getRegionChanges = params => request({ url: '/admin/electrician-region-changes', method: 'get', params })
export const getRegionChange = id => request({ url: '/admin/electrician-region-changes/' + id, method: 'get' })
export const reviewRegionChange = (id, data) => request({ url: '/admin/electrician-region-changes/' + id + '/review', method: 'put', data })
export const retryRegionNotification = (id, data) => request({ url: '/admin/electrician-region-changes/' + id + '/notification/retry', method: 'post', data })

// 获取电工列表
export const getElectricianList = (params) => {
  return request({
    url: '/admin/electricians',
    method: 'get',
    params
  })
}

// 获取省级电工统计
export const getElectricianRegionStats = () => {
  return request({
    url: '/admin/electricians/region-stats',
    method: 'get'
  })
}

// 获取电工详情
export const getElectricianDetail = (id) => {
  return request({
    url: `/admin/electricians/${id}`,
    method: 'get'
  })
}

// 封禁电工
export const banElectrician = (id) => {
  return request({
    url: `/admin/electricians/${id}/ban`,
    method: 'post'
  })
}

// 解封电工
export const unbanElectrician = (id) => {
  return request({
    url: `/admin/electricians/${id}/unban`,
    method: 'post'
  })
}
