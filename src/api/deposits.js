import request from '@/utils/request'

// 获取押金记录列表
export const getDepositList = (params) => {
  return request({
    url: '/admin/deposits',
    method: 'get',
    params
  })
}

// 获取押金详情
export const getDepositDetail = (id) => {
  return request({
    url: `/admin/deposits/${id}`,
    method: 'get'
  })
}

// 处理退款
export const processRefund = (id, data) => {
  return request({
    url: `/admin/deposits/${id}/process-refund`,
    method: 'post',
    data
  })
}
