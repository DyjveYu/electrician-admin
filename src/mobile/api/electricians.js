import request from '../utils/request'

export const getRegionChange = id => request({ url: '/admin/electrician-region-changes/' + id, method: 'get' })
export const reviewRegionChange = (id, data) => request({ url: '/admin/electrician-region-changes/' + id + '/review', method: 'put', data })
export const retryRegionNotification = (id, data) => request({ url: '/admin/electrician-region-changes/' + id + '/notification/retry', method: 'post', data })

export function getElectricianList(params) {
  return request({
    url: '/admin/electricians',
    method: 'get',
    params
  })
}

export function getElectricianDetail(id) {
  return request({
    url: `/admin/electricians/${id}`,
    method: 'get'
  })
}

export function banElectrician(id) {
  return request({
    url: `/admin/electricians/${id}/ban`,
    method: 'post'
  })
}

export function unbanElectrician(id) {
  return request({
    url: `/admin/electricians/${id}/unban`,
    method: 'post'
  })
}
