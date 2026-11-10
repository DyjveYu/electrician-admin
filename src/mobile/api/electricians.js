import request from '../utils/request'

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

export function approveElectrician(id, revision) {
  return request({
    url: `/admin/electricians/${id}/review`,
    method: 'put',
    data: { status: 'approved', business_revision: revision }
  })
}

export function rejectElectrician(id, reason, revision) {
  return request({
    url: `/admin/electricians/${id}/review`,
    method: 'put',
    data: { status: 'rejected', reason, business_revision: revision }
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
