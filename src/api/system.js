import request from '@/utils/request'

// 获取时段费率列表
export const getTimePeriodFees = () => {
  return request({
    url: '/system/time-period-fees',
    method: 'get'
  })
}

// 更新时段费率
export const updateTimePeriodFee = (id, data) => {
  return request({
    url: `/system/time-period-fees/${id}`,
    method: 'put',
    data
  })
}
