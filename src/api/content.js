import request from '@/utils/request'
export const getAds = () => request.get('/admin/content/ads')
export const saveAd = (slot, data) => request.put(`/admin/content/ads/${slot}`, data)
export const clearAd = slot => request.delete(`/admin/content/ads/${slot}`)
export const getNoticeOptions = params => request.get('/admin/content/notice-options', { params })
export const getArticles = params => request.get('/admin/content/articles', { params })
export const getArticle = (id, category = 'electrician_home') => request.get(`/admin/content/articles/${id}`, { params: { category } })
export const createArticle = (data, category = 'electrician_home') => request.post('/admin/content/articles', data, { params: { category } })
export const updateArticle = (id, data, category = 'electrician_home') => request.put(`/admin/content/articles/${id}`, data, { params: { category } })
export const deleteArticle = (id, category = 'electrician_home') => request.delete(`/admin/content/articles/${id}`, { params: { category } })
export const uploadImage = file => {
  const data = new FormData()
  data.append('file', file)
  return request.post('/admin/content/images', data)
}
