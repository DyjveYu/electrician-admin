import request from '@/utils/request'
export const getTestToolsCapabilities = () => request({ url: '/admin/test-tools/capabilities', method: 'get' })
export const updateTestOpenid = (id, data) => request({ url: `/admin/test-tools/users/${id}/openid`, method: 'put', data })
