// frontend/src/store/auth.store.ts
import { create } from 'zustand'

interface User {
  id: string
  email: string
}

interface AuthState {
  user: User | null
  token: string | null
  setAuth: (user: User, token: string) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: sessionStorage.getItem('token'),
  setAuth: (user, token) => {
    sessionStorage.setItem('token', token)
    set({ user, token })
  },
  logout: () => {
    sessionStorage.removeItem('token')
    set({ user: null, token: null })
  },
}))
