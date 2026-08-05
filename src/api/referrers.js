import request from '@/utils/request'

// 获取推荐达人列表
export const getReferrerList = (params) => {
  return request({
    url: '/admin/referrers',
    method: 'get',
    params
  })
}

// 冻结推荐达人
export const freezeReferrer = (id) => {
  return request({
    url: `/admin/referrers/${id}/freeze`,
    method: 'patch'
  })
}
