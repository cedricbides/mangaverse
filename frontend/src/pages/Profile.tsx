import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { User, Heart, Clock, BookOpen, Star, LogOut } from 'lucide-react'
import axios from 'axios'
import { useAuth } from '@/context/AuthContext'
import type { Manga } from '@/types'
import { getCoverUrl, getMangaTitle } from '@/utils/manga'

const MD = 'https://api.mangadex.org'

export default function Profile() {
  const { user, logout, login } = useAuth()
  const navigate = useNavigate()
  const [favManga, setFavManga] = useState<Manga[]>([])
  const [historyManga, setHistoryManga] = useState<Manga[]>([])
  const [loadingFavs, setLoadingFavs] = useState(false)
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [activeTab, setActiveTab] = useState<'favorites' | 'history'>('favorites')

  useEffect(() => {
    if (!user) return
    if (user.favorites.length) {
      setLoadingFavs(true)
      const ids = user.favorites.slice(0, 20)
      const qp = ids.map(id => `ids[]=${id}`).join('&')
      axios.get(`${MD}/manga?${qp}&includes[]=cover_art&limit=20`)
        .then(res => setFavManga(res.data.data))
        .finally(() => setLoadingFavs(false))
    }

    if (user.readingHistory?.length) {
      setLoadingHistory(true)
      const ids = [...new Set(user.readingHistory.map(h => h.mangaId))].slice(0, 20)
      const qp = ids.map(id => `ids[]=${id}`).join('&')
      axios.get(`${MD}/manga?${qp}&includes[]=cover_art&limit=20`)
        .then(res => setHistoryManga(res.data.data))
        .finally(() => setLoadingHistory(false))
    }
  }, [user])

  if (!user) return (
    <div className="max-w-2xl mx-auto px-5 pt-40 pb-16 text-center">
      <User size={64} className="text-text-muted mx-auto mb-6 opacity-30" />
      <h1 className="font-display text-3xl text-white mb-3">Sign In Required</h1>
      <p className="font-body text-text-muted mb-8">You need to sign in to view your profile.</p>
      <div className="flex gap-3 justify-center">
        <button onClick={login} className="px-6 py-3 bg-primary text-white font-body rounded-xl hover:bg-primary/90 transition-colors">
          Sign in with Google
        </button>
        <Link to="/login" className="px-6 py-3 glass border border-white/10 text-text font-body rounded-xl hover:border-primary/30">
          Email Login
        </Link>
      </div>
    </div>
  )

  const stats = [
    { icon: Heart, label: 'Favorites', value: user.favorites.length, color: 'text-red-400' },
    { icon: Clock, label: 'History', value: user.readingHistory?.length || 0, color: 'text-blue-400' },
    { icon: BookOpen, label: 'Reading', value: user.readingHistory?.filter(h => h.page > 0).length || 0, color: 'text-green-400' },
  ]

  return (
    <div className="max-w-5xl mx-auto px-5 pt-28 pb-16">
      {/* Profile Header */}
      <div className="glass rounded-3xl p-8 mb-8 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-accent/5" />
        <div className="relative flex flex-col sm:flex-row items-center sm:items-start gap-6">
          {user.avatar
            ? <img src={user.avatar} alt={user.name} className="w-24 h-24 rounded-2xl object-cover ring-2 ring-primary/30" />
            : <div className="w-24 h-24 rounded-2xl bg-primary/20 flex items-center justify-center text-3xl font-display text-primary">
                {user.name[0].toUpperCase()}
              </div>
          }
          <div className="flex-1 text-center sm:text-left">
            <div className="flex items-center gap-2 justify-center sm:justify-start mb-1">
              <h1 className="font-display text-3xl text-white">{user.name}</h1>
              {user.role === 'admin' && (
                <span className="px-2.5 py-1 bg-amber-500/20 border border-amber-500/30 text-amber-400 text-xs rounded-full font-body">
                  Admin
                </span>
              )}
            </div>
            <p className="font-body text-text-muted text-sm mb-5">{user.email}</p>
            <div className="flex gap-6 justify-center sm:justify-start">
              {stats.map(({ icon: Icon, label, value, color }) => (
                <div key={label} className="text-center">
                  <div className={`flex items-center gap-1 font-display text-2xl ${color}`}>
                    <Icon size={16} />
                    {value}
                  </div>
                  <p className="text-xs text-text-muted font-body">{label}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            {user.role === 'admin' && (
              <Link to="/admin" className="px-4 py-2 bg-amber-500/20 border border-amber-500/30 text-amber-400 text-sm font-body rounded-xl hover:bg-amber-500/30 transition-colors flex items-center gap-1.5">
                <Star size={14} /> Admin Panel
              </Link>
            )}
            <button onClick={logout} className="px-4 py-2 glass border border-white/10 text-text-muted text-sm font-body rounded-xl hover:border-primary/30 transition-colors flex items-center gap-1.5">
              <LogOut size={14} /> Sign Out
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {([['favorites', 'My Favorites', Heart], ['history', 'Reading History', Clock]] as const).map(([tab, label, Icon]) => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-body transition-all ${
              activeTab === tab ? 'bg-primary text-white' : 'glass text-text-muted hover:text-text'
            }`}>
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      {activeTab === 'favorites' && (
        <div>
          {loadingFavs ? (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="skeleton rounded-xl" style={{ aspectRatio: '2/3' }} />
              ))}
            </div>
          ) : favManga.length === 0 ? (
            <div className="text-center py-20">
              <Heart size={48} className="text-text-muted mx-auto mb-4 opacity-30" />
              <p className="font-body text-text-muted">No favorites yet. Start adding manga you love!</p>
              <Link to="/catalog" className="mt-4 inline-block text-primary text-sm hover:underline">Browse Catalog</Link>
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4">
              {favManga.map(m => (
                <Link key={m.id} to={`/manga/${m.id}`} className="group">
                  <div className="relative overflow-hidden rounded-xl" style={{ aspectRatio: '2/3' }}>
                    <img src={getCoverUrl(m, 256)} alt={getMangaTitle(m)} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  </div>
                  <p className="mt-2 text-xs text-text font-body line-clamp-2 group-hover:text-primary transition-colors px-1">{getMangaTitle(m)}</p>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'history' && (
        <div>
          {loadingHistory ? (
            <div className="flex flex-col gap-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="skeleton h-20 rounded-xl" />
              ))}
            </div>
          ) : historyManga.length === 0 ? (
            <div className="text-center py-20">
              <Clock size={48} className="text-text-muted mx-auto mb-4 opacity-30" />
              <p className="font-body text-text-muted">No reading history yet. Start reading!</p>
              <Link to="/catalog" className="mt-4 inline-block text-primary text-sm hover:underline">Browse Catalog</Link>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {historyManga.map(m => {
                const hist = user.readingHistory?.find(h => h.mangaId === m.id)
                return (
                  <Link key={m.id} to={`/manga/${m.id}`} className="flex items-center gap-4 glass rounded-2xl p-4 hover:border-primary/20 border border-transparent transition-all group">
                    <img src={getCoverUrl(m, 256)} alt={getMangaTitle(m)} className="w-12 h-16 object-cover rounded-lg flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-body text-sm text-text group-hover:text-primary transition-colors line-clamp-1">{getMangaTitle(m)}</p>
                      {hist && (
                        <p className="text-xs text-text-muted mt-1 font-body">
                          Last read: {new Date(hist.updatedAt).toLocaleDateString()}
                          {hist.page > 0 && ` · Page ${hist.page}`}
                        </p>
                      )}
                    </div>
                    <BookOpen size={16} className="text-text-muted group-hover:text-primary transition-colors" />
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
