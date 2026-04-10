import request from '@/utils/request'

// 获取管理员列表
export const getAdminList = (params) => {
  return request({
    url: '/admin/admins',
    method: 'get',
    params
  })
}

// 获取管理员详情
export const getAdminDetail = (id) => {
  return request({
    url: `/admin/admins/${id}`,
    method: 'get'
  })
}

// 创建管理员
export const createAdmin = (data) => {
  return request({
    url: '/admin/admins',
    method: 'post',
    data
  })
}

// 更新管理员
export const updateAdmin = (id, data) => {
  return request({
    url: `/admin/admins/${id}`,
    method: 'put',
    data
  })
}

// 停用管理员
export const deactivateAdmin = (id) => {
  return request({
    url: `/admin/admins/${id}/deactivate`,
    method: 'put'
  })
}

// 激活管理员
export const activateAdmin = (id) => {
  return request({
    url: `/admin/admins/${id}/activate`,
    method: 'put'
  })
}
