import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import axios from 'axios'
import type { User } from '@/types'

interface AuthContextType {
  user: User | null
  loading: boolean
  isAdmin: boolean
  logout: () => void
  loginWithEmail: (email: string, password: string) => Promise<void>
  register: (name: string, email: string, password: string) => Promise<void>
  toggleFavorite: (mangaId: string) => Promise<void>
  isFavorite: (mangaId: string) => boolean
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    axios.get('/api/auth/me', { withCredentials: true })
      .then((res) => setUser(res.data.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false))
  }, [])

  const loginWithEmail = async (email: string, password: string) => {
    const res = await axios.post('/api/auth/login', { email, password }, { withCredentials: true })
    setUser(res.data.user)
  }

  const register = async (name: string, email: string, password: string) => {
    const res = await axios.post('/api/auth/register', { name, email, password }, { withCredentials: true })
    setUser(res.data.user)
  }

  const logout = async () => {
    await axios.get('/api/auth/logout', { withCredentials: true })
    setUser(null)
    window.location.href = '/'
  }

  const toggleFavorite = async (mangaId: string) => {
    if (!user) return window.location.href = '/login'
    const res = await axios.post('/api/favorites/toggle', { mangaId }, { withCredentials: true })
    setUser((prev) => prev ? { ...prev, favorites: res.data.favorites } : null)
  }

  const isFavorite = (mangaId: string) => user?.favorites?.includes(mangaId) ?? false
  const isAdmin = user?.role === 'admin'

  return (
    <AuthContext.Provider value={{ user, loading, isAdmin, logout, loginWithEmail, register, toggleFavorite, isFavorite }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
