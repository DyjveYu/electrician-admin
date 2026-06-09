import request from '@/utils/request'

// 获取合作伙伴列表
export const getPartnerList = (params) => {
  return request({
    url: '/admin/partners',
    method: 'get',
    params
  })
}

// 新增合作伙伴
export const createPartner = (data) => {
  return request({
    url: '/admin/partners',
    method: 'post',
    data
  })
}

// 修改合作伙伴
export const updatePartner = (id, data) => {
  return request({
    url: `/admin/partners/${id}`,
    method: 'put',
    data
  })
}

// 冻结合作伙伴
export const freezePartner = (id) => {
  return request({
    url: `/admin/partners/${id}/freeze`,
    method: 'patch'
  })
}

// 搜索电工（合作伙伴选择器）
export const searchElectricians = (params) => {
  return request({
    url: '/admin/electricians/search',
    method: 'get',
    params
  })
}

// 手动补算合作伙伴统计
export const recalculatePartnerStats = (data) => {
  return request({
    url: '/admin/partner-stats/recalculate',
    method: 'post',
    data
  })
}

// 获取行政区划数据（省市区三级联动）
export const getRegions = (params) => {
  return request({
    url: '/admin/regions',
    method: 'get',
    params
  })
}
