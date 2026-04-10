import { createContext, useContext, ReactNode } from 'react'
import { useAuthStore } from '@/store/auth.store'

interface User {
  id: string
  email: string
}

interface AuthContextValue {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  login: (user: User, token: string) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const { user, token, setAuth, logout } = useAuthStore()

  const value: AuthContextValue = {
    user,
    token,
    isAuthenticated: !!token,
    login: setAuth,
    logout,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth doit être utilisé dans AuthProvider')
  return ctx
}
