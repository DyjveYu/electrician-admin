import axios from 'axios'

const TOKEN_KEY = 'admin_token'

export function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token)
}

export function removeToken() {
  localStorage.removeItem(TOKEN_KEY)
}

export function checkAuth() {
  return !!getToken()
}

export async function login(username, password) {
  try {
    const response = await axios.post('/api/admin/auth/login', { username, password })
    if (response.data.code === 200) {
      setToken(response.data.data.token)
      return { success: true }
    }
    return { success: false, message: response.data.message || '登录失败' }
  } catch (error) {
    const message = error.response?.data?.message || '网络错误，请稍后重试'
    return { success: false, message }
  }
}

export function logout() {
  removeToken()
}
