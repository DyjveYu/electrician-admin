import request from '@/utils/request'

// 获取推荐达人申请列表
export const getReferrerApplications = (params) => {
  return request({
    url: '/admin/referrer-applications',
    method: 'get',
    params
  })
}

// 通过申请
export const approveApplication = (id) => {
  return request({
    url: `/admin/referrer-applications/${id}/approve`,
    method: 'put'
  })
}

// 驳回申请
export const rejectApplication = (id) => {
  return request({
    url: `/admin/referrer-applications/${id}/reject`,
    method: 'put'
  })
}

// 生成小程序二维码
export const generateQRCode = (data) => {
  return request({
    url: '/admin/qrcode',
    method: 'post',
    data
  })
}
