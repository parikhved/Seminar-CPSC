import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
  headers: { 'Content-Type': 'application/json' },
})

// Attach auth token on every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('cpsc_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Redirect to login on 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('cpsc_token')
      localStorage.removeItem('cpsc_user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  },
)

export default api
