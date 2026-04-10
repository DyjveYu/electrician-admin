import request from '@/utils/request'

export const getTodoCounts = () => {
  return request({
    url: '/admin/todo/counts',
    method: 'get'
  })
}
