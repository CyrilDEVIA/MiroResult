// frontend/src/services/api.ts
import axios from 'axios'

// Convention : VITE_API_URL = domaine seul, sans /api
// Tous les appels dans le code incluent /api/ : api.get('/api/users')
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:9904',
  withCredentials: true,
})

let isRefreshing = false
let failedQueue: Array<{ resolve: () => void; reject: (e: unknown) => void }> = []

api.interceptors.response.use(
  res => res,
  async err => {
    const original = err.config
    const url: string = original?.url || ''

    if (url.includes('/api/auth/')) {
      return Promise.reject(err)
    }

    if (err.response?.status === 401 && !original._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({
            resolve: () => resolve(api(original)),
            reject,
          })
        })
      }
      original._retry = true
      isRefreshing = true
      try {
        await api.post('/api/auth/refresh')
        failedQueue.forEach(q => q.resolve())
        failedQueue = []
        return api(original)
      } catch (e) {
        failedQueue.forEach(q => q.reject(e))
        failedQueue = []
        return Promise.reject(e)
      } finally {
        isRefreshing = false
      }
    }
    return Promise.reject(err)
  }
)

export default api
