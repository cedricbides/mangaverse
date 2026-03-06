import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Shield, Plus, Edit3, Trash2, BookOpen, Users, Layers,
  ChevronDown, ChevronUp, X, Check, AlertCircle, Image, List
} from 'lucide-react'
import axios from 'axios'
import { useAuth } from '@/context/AuthContext'
import type { LocalManga, LocalChapter } from '@/types'

const GENRES = [
  'Action','Adventure','Comedy','Drama','Fantasy','Horror','Mystery',
  'Romance','Sci-Fi','Slice of Life','Sports','Thriller','Psychological',
  'Historical','Supernatural','Isekai','Mecha','Music','School Life'
]

export default function Admin() {
  const { user, isAdmin, loading } = useAuth()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<'manga' | 'users' | 'stats'>('manga')
  const [stats, setStats] = useState({ userCount: 0, mangaCount: 0, chapterCount: 0 })
  const [mangaList, setMangaList] = useState<LocalManga[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [loadingData, setLoadingData] = useState(false)
  const [expandedManga, setExpandedManga] = useState<string | null>(null)
  const [chapters, setChapters] = useState<Record<string, LocalChapter[]>>({})

  // Modals
  const [showMangaForm, setShowMangaForm] = useState(false)
  const [editingManga, setEditingManga] = useState<LocalManga | null>(null)
  const [showChapterForm, setShowChapterForm] = useState<string | null>(null) // mangaId

  useEffect(() => {
    if (!loading && !isAdmin) navigate('/')
  }, [loading, isAdmin, navigate])

  useEffect(() => {
    if (!isAdmin) return
    axios.get('/api/admin/stats', { withCredentials: true }).then(res => setStats(res.data)).catch(() => {})
    loadManga()
  }, [isAdmin])

  const loadManga = async () => {
    setLoadingData(true)
    const res = await axios.get('/api/admin/manga', { withCredentials: true })
    setMangaList(res.data)
    setLoadingData(false)
  }

  const loadUsers = async () => {
    setLoadingData(true)
    const res = await axios.get('/api/admin/users', { withCredentials: true })
    setUsers(res.data)
    setLoadingData(false)
  }

  const loadChapters = async (mangaId: string) => {
    if (chapters[mangaId]) return
    const res = await axios.get(`/api/admin/manga/${mangaId}/chapters`, { withCredentials: true })
    setChapters(prev => ({ ...prev, [mangaId]: res.data }))
  }

  const toggleExpand = (id: string) => {
    if (expandedManga === id) {
      setExpandedManga(null)
    } else {
      setExpandedManga(id)
      loadChapters(id)
    }
  }

  const deleteManga = async (id: string) => {
    if (!confirm('Delete this manga and all its chapters?')) return
    await axios.delete(`/api/admin/manga/${id}`, { withCredentials: true })
    setMangaList(prev => prev.filter(m => m._id !== id))
    setStats(s => ({ ...s, mangaCount: s.mangaCount - 1 }))
  }

  const deleteChapter = async (mangaId: string, chapterId: string) => {
    if (!confirm('Delete this chapter?')) return
    await axios.delete(`/api/admin/chapters/${chapterId}`, { withCredentials: true })
    setChapters(prev => ({ ...prev, [mangaId]: prev[mangaId].filter(c => c._id !== chapterId) }))
    setStats(s => ({ ...s, chapterCount: s.chapterCount - 1 }))
  }

  const handleTabChange = (tab: 'manga' | 'users' | 'stats') => {
    setActiveTab(tab)
    if (tab === 'users' && users.length === 0) loadUsers()
  }

  if (loading) return <div className="pt-32 text-center text-text-muted font-body">Loading...</div>
  if (!isAdmin) return null

  return (
    <div className="max-w-6xl mx-auto px-5 pt-28 pb-16">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
            <Shield size={18} className="text-amber-400" />
          </div>
          <div>
            <h1 className="font-display text-3xl text-white tracking-wide">ADMIN DASHBOARD</h1>
            <p className="text-text-muted text-xs font-body">Logged in as {user?.name}</p>
          </div>
        </div>
        <Link to="/" className="px-4 py-2 glass rounded-xl text-sm font-body text-text-muted hover:text-text transition-colors">
          ← Back to Site
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { icon: Users, label: 'Total Users', value: stats.userCount, color: 'text-blue-400 bg-blue-400/10' },
          { icon: BookOpen, label: 'Local Manga', value: stats.mangaCount, color: 'text-green-400 bg-green-400/10' },
          { icon: Layers, label: 'Chapters', value: stats.chapterCount, color: 'text-purple-400 bg-purple-400/10' },
        ].map(({ icon: Icon, label, value, color }) => (
          <div key={label} className="glass rounded-2xl p-5">
            <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center mb-3`}>
              <Icon size={18} />
            </div>
            <p className="font-display text-3xl text-white">{value}</p>
            <p className="text-text-muted text-sm font-body mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {([['manga', 'Manga Management', BookOpen], ['users', 'Users', Users]] as const).map(([tab, label, Icon]) => (
          <button key={tab} onClick={() => handleTabChange(tab)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-body transition-all ${
              activeTab === tab ? 'bg-primary text-white' : 'glass text-text-muted hover:text-text'
            }`}>
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {/* MANGA TAB */}
      {activeTab === 'manga' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <p className="text-sm text-text-muted font-body">{mangaList.length} manga titles</p>
            <button onClick={() => { setEditingManga(null); setShowMangaForm(true) }}
              className="flex items-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary/90 text-white text-sm font-body rounded-xl transition-all">
              <Plus size={15} /> Add Manga
            </button>
          </div>

          {loadingData ? (
            <div className="flex flex-col gap-3">
              {[1,2,3].map(i => <div key={i} className="skeleton h-20 rounded-xl" />)}
            </div>
          ) : mangaList.length === 0 ? (
            <div className="text-center py-20 glass rounded-2xl">
              <BookOpen size={48} className="text-text-muted mx-auto mb-4 opacity-30" />
              <p className="font-body text-text-muted mb-4">No manga added yet.</p>
              <button onClick={() => { setEditingManga(null); setShowMangaForm(true) }}
                className="px-5 py-2.5 bg-primary text-white font-body text-sm rounded-xl">
                Add Your First Manga
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {mangaList.map(manga => (
                <div key={manga._id} className="glass rounded-2xl overflow-hidden">
                  {/* Manga Row */}
                  <div className="flex items-center gap-4 p-4">
                    <img src={manga.coverUrl} alt={manga.title}
                      className="w-12 h-16 object-cover rounded-xl flex-shrink-0"
                      onError={e => (e.currentTarget.src = 'https://placehold.co/48x64/1a1a2e/white?text=No+Cover')} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-body text-text font-medium line-clamp-1">{manga.title}</h3>
                        {manga.featured && <span className="text-xs px-2 py-0.5 bg-amber-500/20 text-amber-400 rounded-full">Featured</span>}
                      </div>
                      <p className="text-xs text-text-muted font-body mt-0.5">
                        {manga.status} · {manga.genres.slice(0, 3).join(', ')} · {manga.views} views
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button onClick={() => { setShowChapterForm(manga._id) }}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-accent/20 border border-accent/30 text-accent text-xs font-body rounded-lg hover:bg-accent/30 transition-colors">
                        <Plus size={12} /> Chapter
                      </button>
                      <button onClick={() => { setEditingManga(manga); setShowMangaForm(true) }}
                        className="p-2 glass rounded-lg text-text-muted hover:text-text transition-colors">
                        <Edit3 size={14} />
                      </button>
                      <button onClick={() => deleteManga(manga._id)}
                        className="p-2 glass rounded-lg text-text-muted hover:text-red-400 transition-colors">
                        <Trash2 size={14} />
                      </button>
                      <button onClick={() => toggleExpand(manga._id)}
                        className="p-2 glass rounded-lg text-text-muted hover:text-text transition-colors">
                        {expandedManga === manga._id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </button>
                    </div>
                  </div>

                  {/* Chapters Expand */}
                  {expandedManga === manga._id && (
                    <div className="border-t border-white/5 bg-black/20 p-4">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-xs text-text-muted font-body uppercase tracking-widest">Chapters ({chapters[manga._id]?.length || 0})</p>
                        <button onClick={() => setShowChapterForm(manga._id)}
                          className="flex items-center gap-1 text-xs text-accent hover:underline font-body">
                          <Plus size={11} /> Add Chapter
                        </button>
                      </div>
                      {!chapters[manga._id] ? (
                        <p className="text-xs text-text-muted font-body">Loading...</p>
                      ) : chapters[manga._id].length === 0 ? (
                        <p className="text-xs text-text-muted font-body">No chapters yet.</p>
                      ) : (
                        <div className="flex flex-col gap-2">
                          {chapters[manga._id].map(ch => (
                            <div key={ch._id} className="flex items-center justify-between bg-white/5 rounded-xl px-4 py-2.5">
                              <div>
                                <span className="text-sm text-text font-body">
                                  {ch.volume && `Vol.${ch.volume} `}Ch.{ch.chapterNumber}
                                  {ch.title && <span className="text-text-muted"> — {ch.title}</span>}
                                </span>
                                <span className="ml-3 text-xs text-text-muted">{ch.pages.length} pages</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Link to={`/read/local/${ch._id}`}
                                  className="text-xs text-accent hover:underline font-body">Preview</Link>
                                <button onClick={() => deleteChapter(manga._id, ch._id)}
                                  className="p-1 text-text-muted hover:text-red-400 transition-colors">
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* USERS TAB */}
      {activeTab === 'users' && (
        <div>
          <p className="text-sm text-text-muted font-body mb-4">{users.length} registered users</p>
          {loadingData ? (
            <div className="flex flex-col gap-3">
              {[1,2,3,4,5].map(i => <div key={i} className="skeleton h-16 rounded-xl" />)}
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {users.map((u: any) => (
                <div key={u._id} className="flex items-center gap-4 glass rounded-2xl p-4">
                  {u.avatar
                    ? <img src={u.avatar} alt={u.name} className="w-10 h-10 rounded-xl object-cover flex-shrink-0" />
                    : <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary font-bold flex-shrink-0">{u.name[0]}</div>
                  }
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm text-text font-body">{u.name}</p>
                      {u.role === 'admin' && (
                        <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 text-xs rounded-full font-body">Admin</span>
                      )}
                    </div>
                    <p className="text-xs text-text-muted font-body">{u.email}</p>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-text-muted font-body">
                    <span>{u.favorites?.length || 0} favs</span>
                    {u._id !== user?.id && (
                      <button
                        onClick={async () => {
                          const newRole = u.role === 'admin' ? 'user' : 'admin'
                          await axios.put(`/api/admin/users/${u._id}/role`, { role: newRole }, { withCredentials: true })
                          setUsers(prev => prev.map(x => x._id === u._id ? { ...x, role: newRole } : x))
                        }}
                        className="px-3 py-1 glass rounded-lg hover:border-amber-500/30 border border-transparent text-text-muted hover:text-amber-400 transition-colors">
                        {u.role === 'admin' ? 'Remove Admin' : 'Make Admin'}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MANGA FORM MODAL */}
      {showMangaForm && (
        <MangaFormModal
          manga={editingManga}
          onClose={() => { setShowMangaForm(false); setEditingManga(null) }}
          onSave={async (data) => {
            if (editingManga) {
              const res = await axios.put(`/api/admin/manga/${editingManga._id}`, data, { withCredentials: true })
              setMangaList(prev => prev.map(m => m._id === editingManga._id ? res.data : m))
            } else {
              const res = await axios.post('/api/admin/manga', data, { withCredentials: true })
              setMangaList(prev => [res.data, ...prev])
              setStats(s => ({ ...s, mangaCount: s.mangaCount + 1 }))
            }
            setShowMangaForm(false)
            setEditingManga(null)
          }}
        />
      )}

      {/* CHAPTER FORM MODAL */}
      {showChapterForm && (
        <ChapterFormModal
          mangaId={showChapterForm}
          onClose={() => setShowChapterForm(null)}
          onSave={async (data) => {
            const res = await axios.post(`/api/admin/manga/${showChapterForm}/chapters`, data, { withCredentials: true })
            setChapters(prev => ({
              ...prev,
              [showChapterForm]: [...(prev[showChapterForm] || []), res.data]
            }))
            if (expandedManga !== showChapterForm) setExpandedManga(showChapterForm)
            setStats(s => ({ ...s, chapterCount: s.chapterCount + 1 }))
            setShowChapterForm(null)
          }}
        />
      )}
    </div>
  )
}

// ─── Manga Form Modal ────────────────────────────────────────────────────────

function MangaFormModal({ manga, onClose, onSave }: {
  manga: LocalManga | null
  onClose: () => void
  onSave: (data: any) => Promise<void>
}) {
  const [title, setTitle] = useState(manga?.title || '')
  const [altTitle, setAltTitle] = useState(manga?.altTitle || '')
  const [coverUrl, setCoverUrl] = useState(manga?.coverUrl || '')
  const [description, setDescription] = useState(manga?.description || '')
  const [genres, setGenres] = useState<string[]>(manga?.genres || [])
  const [status, setStatus] = useState(manga?.status || 'ongoing')
  const [author, setAuthor] = useState(manga?.author || '')
  const [year, setYear] = useState(manga?.year?.toString() || '')
  const [featured, setFeatured] = useState(manga?.featured || false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const toggleGenre = (g: string) => setGenres(prev => prev.includes(g) ? prev.filter(x => x !== g) : [...prev, g])

  const handleSave = async () => {
    if (!title.trim() || !coverUrl.trim()) { setError('Title and cover URL are required'); return }
    setSaving(true)
    try {
      await onSave({ title, altTitle, coverUrl, description, genres, status, author, year: year ? parseInt(year) : undefined, featured })
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save')
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-16 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="w-full max-w-2xl glass rounded-3xl p-6 my-4">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-display text-2xl text-white tracking-wide">
            {manga ? 'Edit Manga' : 'Add New Manga'}
          </h2>
          <button onClick={onClose} className="p-2 text-text-muted hover:text-text transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="text-xs text-text-muted font-body mb-1 block uppercase tracking-widest">Title *</label>
            <input value={title} onChange={e => setTitle(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-text font-body outline-none focus:border-primary/40" />
          </div>
          <div>
            <label className="text-xs text-text-muted font-body mb-1 block uppercase tracking-widest">Alt Title</label>
            <input value={altTitle} onChange={e => setAltTitle(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-text font-body outline-none focus:border-primary/40" />
          </div>
          <div>
            <label className="text-xs text-text-muted font-body mb-1 block uppercase tracking-widest">Author</label>
            <input value={author} onChange={e => setAuthor(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-text font-body outline-none focus:border-primary/40" />
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs text-text-muted font-body mb-1 block uppercase tracking-widest">Cover Image URL *</label>
            <div className="flex gap-2">
              <input value={coverUrl} onChange={e => setCoverUrl(e.target.value)}
                placeholder="https://example.com/cover.jpg"
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-text font-body outline-none focus:border-primary/40" />
              {coverUrl && <img src={coverUrl} className="w-10 h-14 object-cover rounded-lg flex-shrink-0" onError={e => e.currentTarget.style.display='none'} />}
            </div>
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs text-text-muted font-body mb-1 block uppercase tracking-widest">Description</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-text font-body outline-none focus:border-primary/40 resize-none" />
          </div>
          <div>
            <label className="text-xs text-text-muted font-body mb-1 block uppercase tracking-widest">Status</label>
            <select value={status} onChange={e => setStatus(e.target.value as any)}
              className="w-full bg-[#09090f] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-text font-body outline-none focus:border-primary/40">
              {['ongoing','completed','hiatus','cancelled'].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-text-muted font-body mb-1 block uppercase tracking-widest">Year</label>
            <input type="number" value={year} onChange={e => setYear(e.target.value)} placeholder="2024"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-text font-body outline-none focus:border-primary/40" />
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs text-text-muted font-body mb-2 block uppercase tracking-widest">Genres</label>
            <div className="flex flex-wrap gap-2">
              {GENRES.map(g => (
                <button key={g} type="button" onClick={() => toggleGenre(g)}
                  className={`text-xs px-3 py-1.5 rounded-full border transition-colors font-body ${
                    genres.includes(g) ? 'bg-accent/20 border-accent/40 text-accent' : 'bg-white/5 border-white/10 text-text-muted hover:text-text'
                  }`}>
                  {g}
                </button>
              ))}
            </div>
          </div>
          <div className="sm:col-span-2 flex items-center gap-3">
            <button type="button" onClick={() => setFeatured(v => !v)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-body transition-colors ${
                featured ? 'bg-amber-500/20 border-amber-500/40 text-amber-400' : 'glass border-white/10 text-text-muted'
              }`}>
              {featured ? <Check size={14} /> : <div className="w-3.5 h-3.5 rounded border border-current" />}
              Mark as Featured
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-4 flex items-center gap-2 text-red-400 text-sm font-body bg-red-400/10 rounded-xl px-4 py-3">
            <AlertCircle size={14} /> {error}
          </div>
        )}

        <div className="flex gap-3 mt-6 justify-end">
          <button onClick={onClose} className="px-5 py-2.5 glass border border-white/10 rounded-xl text-sm font-body text-text-muted hover:text-text transition-colors">
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving}
            className="px-5 py-2.5 bg-primary hover:bg-primary/90 text-white text-sm font-body rounded-xl transition-all disabled:opacity-50 flex items-center gap-2">
            {saving ? 'Saving...' : <><Check size={14} /> {manga ? 'Update Manga' : 'Add Manga'}</>}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Chapter Form Modal ──────────────────────────────────────────────────────

function ChapterFormModal({ mangaId, onClose, onSave }: {
  mangaId: string
  onClose: () => void
  onSave: (data: any) => Promise<void>
}) {
  const [chapterNumber, setChapterNumber] = useState('')
  const [title, setTitle] = useState('')
  const [volume, setVolume] = useState('')
  const [pagesText, setPagesText] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [previewMode, setPreviewMode] = useState<'text' | 'grid'>('text')

  const pages = pagesText.split('\n').map(l => l.trim()).filter(Boolean)

  const handleSave = async () => {
    if (!chapterNumber.trim()) { setError('Chapter number is required'); return }
    if (pages.length === 0) { setError('Add at least one page image URL'); return }
    setSaving(true)
    try {
      await onSave({ chapterNumber, title, volume, pages, language: 'en' })
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save')
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-16 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="w-full max-w-xl glass rounded-3xl p-6 my-4">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-display text-2xl text-white tracking-wide">Add Chapter</h2>
          <button onClick={onClose} className="p-2 text-text-muted hover:text-text transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-text-muted font-body mb-1 block uppercase tracking-widest">Chapter # *</label>
              <input value={chapterNumber} onChange={e => setChapterNumber(e.target.value)} placeholder="1"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-text font-body outline-none focus:border-primary/40" />
            </div>
            <div>
              <label className="text-xs text-text-muted font-body mb-1 block uppercase tracking-widest">Volume</label>
              <input value={volume} onChange={e => setVolume(e.target.value)} placeholder="1"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-text font-body outline-none focus:border-primary/40" />
            </div>
            <div>
              <label className="text-xs text-text-muted font-body mb-1 block uppercase tracking-widest">Title</label>
              <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Optional"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-text font-body outline-none focus:border-primary/40" />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs text-text-muted font-body uppercase tracking-widest">
                Page Image URLs * ({pages.length} pages)
              </label>
              <div className="flex gap-1">
                <button onClick={() => setPreviewMode('text')}
                  className={`p-1.5 rounded-lg transition-colors ${previewMode === 'text' ? 'text-primary' : 'text-text-muted'}`}>
                  <List size={13} />
                </button>
                <button onClick={() => setPreviewMode('grid')}
                  className={`p-1.5 rounded-lg transition-colors ${previewMode === 'grid' ? 'text-primary' : 'text-text-muted'}`}>
                  <Image size={13} />
                </button>
              </div>
            </div>
            {previewMode === 'text' ? (
              <textarea value={pagesText} onChange={e => setPagesText(e.target.value)} rows={8}
                placeholder={"One image URL per line:\nhttps://example.com/page1.jpg\nhttps://example.com/page2.jpg\n..."}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-text font-body outline-none focus:border-primary/40 resize-none font-mono text-xs" />
            ) : (
              <div className="grid grid-cols-4 gap-2 max-h-64 overflow-y-auto p-2 bg-white/5 rounded-xl">
                {pages.length === 0
                  ? <p className="col-span-4 text-xs text-text-muted text-center py-6 font-body">No pages yet</p>
                  : pages.map((url, i) => (
                    <div key={i} className="relative">
                      <img src={url} alt={`Page ${i+1}`} className="w-full h-20 object-cover rounded-lg"
                        onError={e => { e.currentTarget.src = 'https://placehold.co/80x112/1a1a2e/red?text=ERR' }} />
                      <span className="absolute bottom-1 right-1 text-xs bg-black/60 text-white px-1 rounded">{i+1}</span>
                    </div>
                  ))
                }
              </div>
            )}
            <p className="text-xs text-text-muted font-body mt-1.5">Paste one image URL per line. Supports any direct image URL.</p>
          </div>
        </div>

        {error && (
          <div className="mt-4 flex items-center gap-2 text-red-400 text-sm font-body bg-red-400/10 rounded-xl px-4 py-3">
            <AlertCircle size={14} /> {error}
          </div>
        )}

        <div className="flex gap-3 mt-6 justify-end">
          <button onClick={onClose} className="px-5 py-2.5 glass border border-white/10 rounded-xl text-sm font-body text-text-muted hover:text-text transition-colors">
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving}
            className="px-5 py-2.5 bg-primary hover:bg-primary/90 text-white text-sm font-body rounded-xl disabled:opacity-50 flex items-center gap-2 transition-all">
            {saving ? 'Saving...' : <><Check size={14} /> Add Chapter ({pages.length} pages)</>}
          </button>
        </div>
      </div>
    </div>
  )
}
