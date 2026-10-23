import request from '@/utils/request'
export const getAds = () => request.get('/admin/content/ads')
export const saveAd = (slot, data) => request.put(`/admin/content/ads/${slot}`, data)
export const clearAd = slot => request.delete(`/admin/content/ads/${slot}`)
export const getNoticeOptions = params => request.get('/admin/content/notice-options', { params })
export const uploadImage = file => {
  const data = new FormData()
  data.append('file', file)
  return request.post('/admin/content/images', data)
}
