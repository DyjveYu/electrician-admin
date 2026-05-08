import axios from 'axios'
import { showToast, showDialog } from 'vant'

const request = axios.create({
  baseURL: '/api',
  timeout: 10000
})

request.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('admin_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

request.interceptors.response.use(
  (response) => {
    const { data } = response
    if (data.code === 200) {
      return data
    }
    showToast(data.message || '请求失败')
    return Promise.reject(new Error(data.message || '请求失败'))
  },
  (error) => {
    if (error.response) {
      const { status, data } = error.response
      switch (status) {
        case 401:
          showDialog({ title: '提示', message: '登录已过期，请重新登录' }).then(() => {
            localStorage.removeItem('admin_token')
            window.location.hash = '#/login'
          })
          break
        case 403:
          showToast('没有权限访问')
          break
        case 404:
          showToast('请求的资源不存在')
          break
        case 500:
          showToast('服务器内部错误')
          break
        default:
          showToast(data?.message || '请求失败')
      }
    } else if (error.code === 'ECONNABORTED') {
      showToast('请求超时')
    } else {
      showToast('网络错误')
    }
    return Promise.reject(error)
  }
)

export default request
