import request from '@/utils/request'
export const getAds = () => request.get('/admin/content/ads')
export const saveAd = (slot, data) => request.put(`/admin/content/ads/${slot}`, data)
export const clearAd = slot => request.delete(`/admin/content/ads/${slot}`)
export const getNoticeOptions = params => request.get('/admin/content/notice-options', { params })
export const getArticles = params => request.get('/admin/content/articles', { params })
export const getArticle = id => request.get(`/admin/content/articles/${id}`)
export const createArticle = data => request.post('/admin/content/articles', data)
export const updateArticle = (id, data) => request.put(`/admin/content/articles/${id}`, data)
export const deleteArticle = id => request.delete(`/admin/content/articles/${id}`)
export const uploadImage = file => {
  const data = new FormData()
  data.append('file', file)
  return request.post('/admin/content/images', data)
}
