import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Shield, Plus, Edit3, Trash2, BookOpen, Users, Layers,
  ChevronDown, ChevronUp, X, Check, AlertCircle, Image, List, Upload, Loader, Activity, CheckCircle, XCircle, Clock, ChevronRight,
  Search, Eye, FileText, Globe, Filter, TrendingUp, Calendar
} from 'lucide-react'

type MangaWithCounts = LocalManga & {
  chapterCounts: { total: number; published: number; drafts: number; lastUpdated: string | null }
}

type MdxMangaEntry = {
  mangaDexId: string
  title: string
  coverUrl: string
  status: string
  author: string
  year?: number
  pinned: boolean
  chapterCounts: { total: number; published: number; drafts: number; lastUpdated: string | null }
  source: 'mangadex'
}
import axios from 'axios'
import { useAuth } from '@/context/AuthContext'
import type { LocalManga, LocalChapter } from '@/types'

/** Route external image URLs through our backend proxy to bypass CORS/hotlink blocks */
function proxyUrl(url: string): string {
  if (!url) return url
  if (url.startsWith('/') || url.startsWith(window.location.origin)) return url
  return `/api/proxy/image?url=${encodeURIComponent(url)}`
}

const GENRES = [
  'Action','Adventure','Comedy','Drama','Fantasy','Horror','Mystery',
  'Romance','Sci-Fi','Slice of Life','Sports','Thriller','Psychological',
  'Historical','Supernatural','Isekai','Mecha','Music','School Life'
]

export default function Admin() {
  const { user, isAdmin, loading } = useAuth()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<'manga' | 'users' | 'stats'>('manga')
  const [stats, setStats] = useState({ userCount: 0, mangaCount: 0, chapterCount: 0, mdxPublished: 0, mdxDraft: 0, mdxManual: 0, mdxApi: 0, totalChapters: 0 })
  const [mangaList, setMangaList] = useState<MangaWithCounts[]>([])
  const [mdxMangaList, setMdxMangaList] = useState<MdxMangaEntry[]>([])
  const [mdxMangaLoading, setMdxMangaLoading] = useState(false)
  const [mdxSearchQuery, setMdxSearchQuery] = useState('')
  const [mdxSearchResults, setMdxSearchResults] = useState<any[]>([])
  const [mdxSearching, setMdxSearching] = useState(false)
  const [mdxPinning, setMdxPinning] = useState<string | null>(null)
  const [showMdxSearch, setShowMdxSearch] = useState(false)
  const [mangaSearch, setMangaSearch] = useState('')
  const [mangaStatusFilter, setMangaStatusFilter] = useState<string>('all')
  const [users, setUsers] = useState<any[]>([])
  const [loadingData, setLoadingData] = useState(false)
  const [expandedManga, setExpandedManga] = useState<string | null>(null)
  const [chapters, setChapters] = useState<Record<string, LocalChapter[]>>({})

  // Batch jobs
  type JobStatus = 'running' | 'done' | 'failed' | 'toolarge'
  interface BatchJob {
    id: string
    label: string
    total: number
    done: number
    failed: number
    status: JobStatus
    startedAt: Date
    errors: string[]
  }
  const [jobs, setJobs] = useState<BatchJob[]>([])
  const [showJobs, setShowJobs] = useState(false)

  const createJob = (label: string, total: number): string => {
    const id = Date.now().toString()
    const job: BatchJob = { id, label, total, done: 0, failed: 0, status: 'running', startedAt: new Date(), errors: [] }
    setJobs(prev => [job, ...prev.slice(0, 19)]) // keep last 20
    setShowJobs(true)
    return id
  }

  const updateJob = (id: string, patch: Partial<BatchJob>) => {
    setJobs(prev => prev.map(j => j.id === id ? { ...j, ...patch } : j))
  }

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
    loadMdxManga()
  }, [isAdmin])

  const loadMdxManga = async () => {
    setMdxMangaLoading(true)
    try {
      const res = await axios.get('/api/admin/mangadex-manga', { withCredentials: true })
      setMdxMangaList(res.data)
    } catch {}
    setMdxMangaLoading(false)
  }

  const searchMdxManga = async () => {
    if (!mdxSearchQuery.trim()) return
    setMdxSearching(true)
    setMdxSearchResults([])
    try {
      const res = await axios.get(`/api/admin/mangadex-manga/search?q=${encodeURIComponent(mdxSearchQuery)}`, { withCredentials: true })
      setMdxSearchResults(res.data)
    } catch { alert('Search failed') }
    setMdxSearching(false)
  }

  const pinMdxManga = async (manga: any) => {
    setMdxPinning(manga.mangaDexId)
    try {
      await axios.post('/api/admin/mangadex-manga/pin', manga, { withCredentials: true })
      setMdxSearchResults([])
      setMdxSearchQuery('')
      setShowMdxSearch(false)
      await loadMdxManga()
    } catch { alert('Failed to pin manga') }
    setMdxPinning(null)
  }

  const unpinMdxManga = async (mangaDexId: string) => {
    if (!confirm('Remove this manga from your admin panel? (Chapters already added are kept)')) return
    try {
      await axios.delete(`/api/admin/mangadex-manga/pin/${mangaDexId}`, { withCredentials: true })
      setMdxMangaList(prev => prev.filter(m => m.mangaDexId !== mangaDexId))
    } catch { alert('Failed to unpin') }
  }

  const loadManga = async () => {
    setLoadingData(true)
    const res = await axios.get('/api/admin/manga-with-counts', { withCredentials: true })
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
        <div className="flex items-center gap-2">
          <Link to="/" className="px-4 py-2 glass rounded-xl text-sm font-body text-text-muted hover:text-text transition-colors">
            ← Back to Site
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
        {/* Row 1: top-level */}
        {[
          { icon: Users, label: 'Total Users', value: stats.userCount, color: 'text-blue-400 bg-blue-400/10' },
          { icon: BookOpen, label: 'Local Manga', value: stats.mangaCount, color: 'text-green-400 bg-green-400/10' },
          { icon: Layers, label: 'Total Chapters', value: stats.totalChapters, color: 'text-purple-400 bg-purple-400/10' },
        ].map(({ icon: Icon, label, value, color }) => (
          <div key={label} className="glass rounded-2xl p-5">
            <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center mb-3`}>
              <Icon size={18} />
            </div>
            <p className="font-display text-3xl text-white">{value}</p>
            <p className="text-text-muted text-sm font-body mt-1">{label}</p>
          </div>
        ))}
        {/* Row 2: chapter breakdown */}
        <div className="glass rounded-2xl p-5 border border-green-500/20">
          <div className="w-10 h-10 rounded-xl text-green-400 bg-green-400/10 flex items-center justify-center mb-3">
            <Check size={18} />
          </div>
          <p className="font-display text-3xl text-white">{stats.mdxPublished}</p>
          <p className="text-text-muted text-sm font-body mt-1">Published</p>
        </div>
        <div className="glass rounded-2xl p-5 border border-yellow-500/20">
          <div className="w-10 h-10 rounded-xl text-yellow-400 bg-yellow-400/10 flex items-center justify-center mb-3">
            <AlertCircle size={18} />
          </div>
          <p className="font-display text-3xl text-white">{stats.mdxDraft}</p>
          <p className="text-text-muted text-sm font-body mt-1">Drafts</p>
        </div>
        <div className="glass rounded-2xl p-5 border border-amber-500/20">
          <div className="w-10 h-10 rounded-xl text-amber-400 bg-amber-400/10 flex items-center justify-center mb-3">
            <Upload size={18} />
          </div>
          <p className="font-display text-3xl text-white">{stats.mdxApi + stats.mdxManual + stats.chapterCount}</p>
          <p className="text-text-muted text-sm font-body mt-1">Manually Added</p>
        </div>
      </div>


      {/* ── Batch Jobs Panel ─────────────────────────────────────── */}
      {jobs.length > 0 && (
        <div className="glass rounded-2xl mb-6 overflow-hidden">
          <button
            onClick={() => setShowJobs(v => !v)}
            className="w-full flex items-center justify-between px-5 py-3 hover:bg-white/5 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Activity size={14} className="text-primary" />
              <span className="font-body text-sm text-text font-medium">Batch Jobs</span>
              <span className="text-xs text-text-muted font-body">({jobs.length})</span>
              {jobs.some(j => j.status === 'running') && (
                <span className="flex items-center gap-1 text-xs text-blue-400 font-body">
                  <Loader size={10} className="animate-spin" /> Running
                </span>
              )}
              {jobs.some(j => j.status === 'failed' || j.status === 'toolarge') && (
                <span className="flex items-center gap-1 text-xs text-red-400 font-body">
                  <XCircle size={10} /> Needs attention
                </span>
              )}
            </div>
            <ChevronRight size={14} className={`text-text-muted transition-transform ${showJobs ? 'rotate-90' : ''}`} />
          </button>

          {showJobs && (
            <div className="border-t border-white/5 divide-y divide-white/5 max-h-72 overflow-y-auto">
              {jobs.map(job => (
                <div key={job.id} className="px-5 py-3 flex items-start gap-3">
                  <div className="mt-0.5 shrink-0">
                    {job.status === 'running' && <Loader size={14} className="text-blue-400 animate-spin" />}
                    {job.status === 'done' && <CheckCircle size={14} className="text-green-400" />}
                    {job.status === 'failed' && <XCircle size={14} className="text-red-400" />}
                    {job.status === 'toolarge' && <AlertCircle size={14} className="text-yellow-400" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-body text-sm text-text truncate">{job.label}</p>
                      <span className="text-xs text-text-muted font-mono shrink-0">
                        {job.done}/{job.total}
                      </span>
                    </div>
                    {/* Progress bar */}
                    <div className="mt-1.5 h-1 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          job.status === 'done' ? 'bg-green-400' :
                          job.status === 'failed' ? 'bg-red-400' :
                          job.status === 'toolarge' ? 'bg-yellow-400' : 'bg-blue-400'
                        }`}
                        style={{ width: job.total > 0 ? `${Math.round((job.done / job.total) * 100)}%` : '0%' }}
                      />
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <span className={`text-xs font-body capitalize ${
                        job.status === 'done' ? 'text-green-400' :
                        job.status === 'failed' ? 'text-red-400' :
                        job.status === 'toolarge' ? 'text-yellow-400' : 'text-blue-400'
                      }`}>
                        {job.status === 'toolarge' ? 'Too large / partial' : job.status}
                        {job.failed > 0 && ` · ${job.failed} failed`}
                      </span>
                      <span className="text-xs text-text-muted font-mono">
                        {job.startedAt.toLocaleTimeString()}
                      </span>
                    </div>
                    {job.errors.length > 0 && (
                      <p className="text-xs text-red-400 font-body mt-1 truncate" title={job.errors.join(', ')}>
                        ⚠ {job.errors[0]}
                      </p>
                    )}
                  </div>
                  <button onClick={() => setJobs(prev => prev.filter(j => j.id !== job.id))}
                    className="p-1 text-text-muted hover:text-text transition-colors shrink-0 mt-0.5">
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

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
      {activeTab === 'manga' && (() => {
        const filtered = mangaList
          .filter(m => mangaStatusFilter === 'all' || m.status === mangaStatusFilter)
          .filter(m => !mangaSearch || m.title.toLowerCase().includes(mangaSearch.toLowerCase()) || m.author?.toLowerCase().includes(mangaSearch.toLowerCase()))

        const STATUS_BADGE: Record<string, string> = {
          ongoing:   'text-green-400 bg-green-400/10 border-green-400/20',
          completed: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
          hiatus:    'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
          cancelled: 'text-red-400 bg-red-400/10 border-red-400/20',
        }

        const totalPublished = mangaList.reduce((s, m) => s + (m.chapterCounts?.published || 0), 0)
        const totalDrafts    = mangaList.reduce((s, m) => s + (m.chapterCounts?.drafts    || 0), 0)
        const totalChaps     = mangaList.reduce((s, m) => s + (m.chapterCounts?.total     || 0), 0)

        return (
          <div>
            {/* Search + filter toolbar */}
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <div className="flex-1 min-w-48 relative">
                <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
                <input
                  value={mangaSearch}
                  onChange={e => setMangaSearch(e.target.value)}
                  placeholder="Search by title or author…"
                  className="w-full pl-9 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-text font-body outline-none focus:border-primary/40 placeholder-text-muted/50"
                />
              </div>
              <div className="flex items-center gap-1 bg-white/5 rounded-xl p-1">
                {['all', 'ongoing', 'completed', 'hiatus', 'cancelled'].map(s => (
                  <button key={s} onClick={() => setMangaStatusFilter(s)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-body capitalize transition-all ${mangaStatusFilter === s ? 'bg-primary text-white' : 'text-text-muted hover:text-text'}`}>
                    {s}
                  </button>
                ))}
              </div>
              <button onClick={() => { setEditingManga(null); setShowMangaForm(true) }}
                className="flex items-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary/90 text-white text-sm font-body rounded-xl transition-all ml-auto">
                <Plus size={15} /> Add Manga
              </button>
            </div>

            {/* ── LOCAL MANGA section header ── */}
            <div className="flex items-center justify-between glass rounded-2xl px-5 py-3.5 mb-3 border border-white/5">
              <div className="flex items-center gap-3">
                <div className="w-1.5 h-5 bg-primary rounded-full" />
                <span className="font-display text-base text-white tracking-wide">LOCAL MANGA</span>
                <span className="text-xs text-text-muted font-body">{mangaList.length} titles</span>
              </div>
              <div className="flex items-center gap-1 text-xs font-body divide-x divide-white/10">
                <span className="pr-3 text-text-muted">
                  <span className="text-white font-semibold">{totalChaps}</span> chapters
                </span>
                <span className="px-3 text-green-400">
                  <span className="font-semibold">{totalPublished}</span> published
                </span>
                <span className="pl-3 text-yellow-400">
                  <span className="font-semibold">{totalDrafts}</span> draft
                </span>
              </div>
            </div>

            {loadingData ? (
              <div className="flex flex-col gap-3">
                {[1,2,3,4].map(i => <div key={i} className="skeleton h-24 rounded-2xl" />)}
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-20 glass rounded-2xl">
                <BookOpen size={48} className="text-text-muted mx-auto mb-4 opacity-30" />
                <p className="font-body text-text-muted mb-4">{mangaList.length === 0 ? 'No manga added yet.' : 'No results match your filters.'}</p>
                {mangaList.length === 0 && (
                  <button onClick={() => { setEditingManga(null); setShowMangaForm(true) }}
                    className="px-5 py-2.5 bg-primary text-white font-body text-sm rounded-xl">
                    Add Your First Manga
                  </button>
                )}
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {filtered.map(manga => {
                  const counts = manga.chapterCounts || { total: 0, published: 0, drafts: 0, lastUpdated: null }
                  const isExpanded = expandedManga === manga._id

                  return (
                    <div key={manga._id} className="glass rounded-2xl overflow-hidden border border-white/5 hover:border-white/10 transition-colors">
                      {/* Main Row */}
                      <div className="flex items-center gap-4 p-4">
                        {/* Cover */}
                        <img src={manga.coverUrl} alt={manga.title}
                          className="w-12 h-16 object-cover rounded-xl flex-shrink-0 shadow-lg"
                          onError={e => (e.currentTarget.src = 'https://placehold.co/48x64/1a1a2e/white?text=?')} />

                        {/* Title + meta */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <h3 className="font-body text-text font-semibold line-clamp-1">{manga.title}</h3>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full border font-body capitalize ${STATUS_BADGE[manga.status] || 'text-text-muted bg-white/5 border-white/10'}`}>
                              {manga.status}
                            </span>
                            {manga.featured && (
                              <span className="text-[10px] px-2 py-0.5 bg-amber-500/20 text-amber-400 border border-amber-500/20 rounded-full font-body">★ Featured</span>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-text-muted font-body">
                            {manga.author && <span className="flex items-center gap-1"><Users size={10} />{manga.author}</span>}
                            {manga.year && <span className="flex items-center gap-1"><Calendar size={10} />{manga.year}</span>}
                            <span className="flex items-center gap-1"><Eye size={10} />{manga.views.toLocaleString()} views</span>
                            {counts.lastUpdated && (
                              <span className="flex items-center gap-1 text-text-muted/60">
                                Updated {new Date(counts.lastUpdated).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Chapter stats pills */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <div className="flex items-center gap-1.5 bg-white/5 rounded-xl px-3 py-2 border border-white/5">
                            <Layers size={12} className="text-text-muted" />
                            <span className="text-sm font-body font-semibold text-white">{counts.total}</span>
                            <span className="text-xs text-text-muted font-body">total</span>
                          </div>
                          <div className="flex items-center gap-1.5 bg-green-500/10 rounded-xl px-3 py-2 border border-green-500/20">
                            <Globe size={12} className="text-green-400" />
                            <span className="text-sm font-body font-semibold text-green-400">{counts.published}</span>
                            <span className="text-xs text-green-400/60 font-body">pub</span>
                          </div>
                          {counts.drafts > 0 && (
                            <div className="flex items-center gap-1.5 bg-yellow-500/10 rounded-xl px-3 py-2 border border-yellow-500/20">
                              <FileText size={12} className="text-yellow-400" />
                              <span className="text-sm font-body font-semibold text-yellow-400">{counts.drafts}</span>
                              <span className="text-xs text-yellow-400/60 font-body">draft</span>
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <button onClick={() => setShowChapterForm(manga._id)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-accent/20 border border-accent/30 text-accent text-xs font-body rounded-lg hover:bg-accent/30 transition-colors">
                            <Plus size={12} /> Chapter
                          </button>
                          <Link to={`/manga/local/${manga._id}`} target="_blank"
                            className="p-2 glass rounded-lg text-text-muted hover:text-blue-400 transition-colors" title="View page">
                            <Eye size={14} />
                          </Link>
                          <button onClick={() => { setEditingManga(manga); setShowMangaForm(true) }}
                            className="p-2 glass rounded-lg text-text-muted hover:text-text transition-colors" title="Edit">
                            <Edit3 size={14} />
                          </button>
                          <button onClick={() => deleteManga(manga._id)}
                            className="p-2 glass rounded-lg text-text-muted hover:text-red-400 transition-colors" title="Delete">
                            <Trash2 size={14} />
                          </button>
                          <button onClick={() => toggleExpand(manga._id)}
                            className={`p-2 glass rounded-lg transition-colors ${isExpanded ? 'text-primary bg-primary/10' : 'text-text-muted hover:text-text'}`}
                            title="Show chapters">
                            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          </button>
                        </div>
                      </div>

                      {/* Chapters Expand */}
                      {isExpanded && (
                        <div className="border-t border-white/5 bg-black/20">
                          {/* Chapter list header */}
                          <div className="flex items-center justify-between px-5 py-3 border-b border-white/5">
                            <div className="flex items-center gap-3">
                              <span className="text-xs text-text-muted font-body uppercase tracking-widest">
                                Chapters
                              </span>
                              <div className="flex items-center gap-2">
                                <span className="text-xs px-2 py-0.5 bg-green-500/10 text-green-400 border border-green-500/20 rounded-full font-body">
                                  {counts.published} published
                                </span>
                                {counts.drafts > 0 && (
                                  <span className="text-xs px-2 py-0.5 bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 rounded-full font-body">
                                    {counts.drafts} draft
                                  </span>
                                )}
                              </div>
                            </div>
                            <button onClick={() => setShowChapterForm(manga._id)}
                              className="flex items-center gap-1 text-xs text-accent hover:underline font-body">
                              <Plus size={11} /> Add Chapter
                            </button>
                          </div>

                          <div className="p-4">
                            {!chapters[manga._id] ? (
                              <div className="flex items-center gap-2 text-xs text-text-muted font-body py-2">
                                <Loader size={12} className="animate-spin" /> Loading chapters…
                              </div>
                            ) : chapters[manga._id].length === 0 ? (
                              <p className="text-xs text-text-muted font-body py-2">No chapters yet. Add one above!</p>
                            ) : (
                              <div className="flex flex-col gap-1.5">
                                {[...chapters[manga._id]].reverse().map((ch, i) => (
                                  <div key={ch._id} className="flex items-center justify-between bg-white/5 hover:bg-white/8 rounded-xl px-4 py-2.5 transition-colors group">
                                    <div className="flex items-center gap-3 min-w-0">
                                      <span className="text-xs font-mono text-text-muted w-5 shrink-0">{chapters[manga._id].length - i}</span>
                                      <div className="min-w-0">
                                        <span className="text-sm text-text font-body">
                                          {ch.volume && <span className="text-text-muted">Vol.{ch.volume} </span>}
                                          Ch.{ch.chapterNumber}
                                          {ch.title && <span className="text-text-muted"> — {ch.title}</span>}
                                        </span>
                                        <div className="flex items-center gap-3 mt-0.5">
                                          <span className="text-xs text-text-muted font-body">{ch.pages.length} pages</span>
                                          <span className="text-xs text-text-muted/60 font-body">{new Date(ch.createdAt).toLocaleDateString()}</span>
                                        </div>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <Link to={`/read/local/${ch._id}`}
                                        className="text-xs text-accent hover:underline font-body flex items-center gap-1">
                                        <Eye size={11} /> Preview
                                      </Link>
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
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })()}

      {/* MANGADEX MANGA SECTION (shown inside manga tab) */}
      {activeTab === 'manga' && (() => {
        const STATUS_BADGE: Record<string, string> = {
          ongoing:   'text-green-400 bg-green-400/10 border-green-400/20',
          completed: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
          hiatus:    'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
          cancelled: 'text-red-400 bg-red-400/10 border-red-400/20',
        }
        const filtered = mdxMangaList.filter(m =>
          !mangaSearch || m.title.toLowerCase().includes(mangaSearch.toLowerCase()) || m.author?.toLowerCase().includes(mangaSearch.toLowerCase())
        )

        const mdxTotalPublished = mdxMangaList.reduce((s, m) => s + (m.chapterCounts?.published || 0), 0)
        const mdxTotalDrafts    = mdxMangaList.reduce((s, m) => s + (m.chapterCounts?.drafts    || 0), 0)
        const mdxTotalChaps     = mdxMangaList.reduce((s, m) => s + (m.chapterCounts?.total     || 0), 0)
        const alreadyPinnedIds  = new Set(mdxMangaList.map(m => m.mangaDexId))

        return (
          <div className="mt-6">
            {/* ── MANGADEX section header ── */}
            <div className="flex items-center justify-between glass rounded-2xl px-5 py-3.5 mb-3 border border-orange-400/10">
              <div className="flex items-center gap-3">
                <div className="w-1.5 h-5 bg-orange-400 rounded-full" />
                <span className="font-display text-base text-white tracking-wide">MANGADEX TITLES</span>
                <span className="text-xs text-text-muted font-body">
                  {mdxMangaLoading ? 'Loading…' : `${mdxMangaList.length} titles`}
                </span>
              </div>
              <div className="flex items-center gap-3">
                {!mdxMangaLoading && mdxMangaList.length > 0 && (
                  <div className="flex items-center gap-1 text-xs font-body divide-x divide-white/10">
                    <span className="pr-3 text-text-muted">
                      <span className="text-white font-semibold">{mdxTotalChaps}</span> chapters
                    </span>
                    <span className="px-3 text-green-400">
                      <span className="font-semibold">{mdxTotalPublished}</span> published
                    </span>
                    <span className="pl-3 text-yellow-400">
                      <span className="font-semibold">{mdxTotalDrafts}</span> draft
                    </span>
                  </div>
                )}
                <button
                  onClick={() => { setShowMdxSearch(v => !v); setMdxSearchResults([]); setMdxSearchQuery('') }}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-body border transition-all ${showMdxSearch ? 'bg-orange-500/20 border-orange-500/40 text-orange-400' : 'glass border-white/10 text-text-muted hover:text-orange-400 hover:border-orange-400/30'}`}>
                  <Plus size={12} /> Add MangaDex Title
                </button>
              </div>
            </div>

            {/* ── Search panel ── */}
            {showMdxSearch && (
              <div className="glass rounded-2xl p-4 mb-3 border border-orange-400/20">
                <p className="text-xs text-text-muted font-body mb-3">
                  Search for any MangaDex manga to add it to your admin panel. This only tracks it here — it won't affect the site catalog.
                </p>
                <div className="flex gap-2 mb-3">
                  <input
                    value={mdxSearchQuery}
                    onChange={e => setMdxSearchQuery(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && searchMdxManga()}
                    placeholder="e.g. Solo Leveling, One Piece…"
                    className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-text font-body outline-none focus:border-orange-400/40"
                  />
                  <button onClick={searchMdxManga} disabled={mdxSearching || !mdxSearchQuery.trim()}
                    className="px-4 py-2.5 bg-orange-500 hover:bg-orange-500/90 text-white text-sm font-body rounded-xl disabled:opacity-50 flex items-center gap-2 transition-all whitespace-nowrap">
                    {mdxSearching ? <><Loader size={13} className="animate-spin" /> Searching…</> : <><Search size={13} /> Search</>}
                  </button>
                </div>

                {mdxSearchResults.length > 0 && (
                  <div className="flex flex-col gap-2 max-h-72 overflow-y-auto">
                    {mdxSearchResults.map(result => {
                      const alreadyAdded = alreadyPinnedIds.has(result.mangaDexId)
                      return (
                        <div key={result.mangaDexId} className="flex items-center gap-3 bg-white/5 rounded-xl px-3 py-2.5">
                          <img src={result.coverUrl} alt={result.title}
                            className="w-8 h-11 object-cover rounded-lg flex-shrink-0"
                            onError={e => (e.currentTarget.src = 'https://placehold.co/32x44/1a1a2e/white?text=?')} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-text font-body font-medium line-clamp-1">{result.title}</p>
                            <div className="flex items-center gap-2 text-xs text-text-muted font-body mt-0.5">
                              {result.author && <span>{result.author}</span>}
                              {result.year && <span>· {result.year}</span>}
                              <span className={`capitalize px-1.5 py-0.5 rounded text-[10px] ${STATUS_BADGE[result.status] || 'text-text-muted bg-white/5'}`}>
                                {result.status}
                              </span>
                            </div>
                          </div>
                          <button
                            onClick={() => !alreadyAdded && pinMdxManga(result)}
                            disabled={alreadyAdded || mdxPinning === result.mangaDexId}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-body border transition-all shrink-0 ${
                              alreadyAdded
                                ? 'bg-green-500/10 border-green-500/20 text-green-400 cursor-default'
                                : 'bg-orange-500/20 border-orange-500/40 text-orange-400 hover:bg-orange-500/30 disabled:opacity-50'
                            }`}>
                            {mdxPinning === result.mangaDexId
                              ? <><Loader size={11} className="animate-spin" /> Adding…</>
                              : alreadyAdded
                                ? <><Check size={11} /> Added</>
                                : <><Plus size={11} /> Add</>
                            }
                          </button>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ── List ── */}
            {mdxMangaLoading ? (
              <div className="flex flex-col gap-3">
                {[1,2].map(i => <div key={i} className="skeleton h-24 rounded-2xl" />)}
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-10 glass rounded-2xl border border-orange-400/10">
                <BookOpen size={32} className="text-text-muted mx-auto mb-3 opacity-30" />
                <p className="font-body text-text-muted text-sm">No MangaDex titles tracked yet.</p>
                <p className="font-body text-text-muted/60 text-xs mt-1">Use "Add MangaDex Title" above, or they appear automatically when you import chapters.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {filtered.map(manga => {
                  const counts = manga.chapterCounts
                  return (
                    <div key={manga.mangaDexId} className="glass rounded-2xl overflow-hidden border border-orange-400/10 hover:border-orange-400/20 transition-colors">
                      <div className="flex items-center gap-4 p-4">
                        <img src={manga.coverUrl} alt={manga.title}
                          className="w-12 h-16 object-cover rounded-xl flex-shrink-0 shadow-lg"
                          onError={e => (e.currentTarget.src = 'https://placehold.co/48x64/1a1a2e/white?text=MDX')} />

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <h3 className="font-body text-text font-semibold line-clamp-1">{manga.title}</h3>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full border font-body capitalize ${STATUS_BADGE[manga.status] || 'text-text-muted bg-white/5 border-white/10'}`}>
                              {manga.status}
                            </span>
                            <span className="text-[10px] px-2 py-0.5 bg-orange-500/20 text-orange-400 border border-orange-500/20 rounded-full font-body">
                              MangaDex
                            </span>
                            {manga.pinned && (
                              <span className="text-[10px] px-2 py-0.5 bg-white/5 text-text-muted border border-white/10 rounded-full font-body">
                                📌 pinned
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-text-muted font-body">
                            {manga.author && <span className="flex items-center gap-1"><Users size={10} />{manga.author}</span>}
                            {manga.year && <span className="flex items-center gap-1"><Calendar size={10} />{manga.year}</span>}
                            {counts.lastUpdated && (
                              <span className="text-text-muted/60">Updated {new Date(counts.lastUpdated).toLocaleDateString()}</span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 flex-shrink-0">
                          <div className="flex items-center gap-1.5 bg-white/5 rounded-xl px-3 py-2 border border-white/5">
                            <Layers size={12} className="text-text-muted" />
                            <span className="text-sm font-body font-semibold text-white">{counts.total}</span>
                            <span className="text-xs text-text-muted font-body">total</span>
                          </div>
                          <div className="flex items-center gap-1.5 bg-green-500/10 rounded-xl px-3 py-2 border border-green-500/20">
                            <Globe size={12} className="text-green-400" />
                            <span className="text-sm font-body font-semibold text-green-400">{counts.published}</span>
                            <span className="text-xs text-green-400/60 font-body">pub</span>
                          </div>
                          {counts.drafts > 0 && (
                            <div className="flex items-center gap-1.5 bg-yellow-500/10 rounded-xl px-3 py-2 border border-yellow-500/20">
                              <FileText size={12} className="text-yellow-400" />
                              <span className="text-sm font-body font-semibold text-yellow-400">{counts.drafts}</span>
                              <span className="text-xs text-yellow-400/60 font-body">draft</span>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <Link to={`/manga/${manga.mangaDexId}`} target="_blank"
                            className="p-2 glass rounded-lg text-text-muted hover:text-blue-400 transition-colors" title="View manga page">
                            <Eye size={14} />
                          </Link>
                          <a href={`https://mangadex.org/title/${manga.mangaDexId}`} target="_blank" rel="noopener noreferrer"
                            className="p-2 glass rounded-lg text-text-muted hover:text-orange-400 transition-colors" title="Open on MangaDex">
                            <Globe size={14} />
                          </a>
                          {manga.pinned && (
                            <button onClick={() => unpinMdxManga(manga.mangaDexId)}
                              className="p-2 glass rounded-lg text-text-muted hover:text-red-400 transition-colors" title="Unpin from admin">
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })()}

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
          onSave={async (data, jobCtx) => {
            const res = await axios.post(`/api/admin/manga/${showChapterForm}/chapters`, data, { withCredentials: true })
            setChapters(prev => ({
              ...prev,
              [showChapterForm]: [...(prev[showChapterForm] || []), res.data]
            }))
            if (expandedManga !== showChapterForm) setExpandedManga(showChapterForm)
            setStats(s => ({ ...s, chapterCount: s.chapterCount + 1, totalChapters: s.totalChapters + 1, mdxManual: s.mdxManual + (data.mdxChapterId ? 1 : 0), mdxApi: s.mdxApi + (data.mdxChapterId ? 1 : 0) }))
            setShowChapterForm(null)
          }}
          createJob={createJob}
          updateJob={updateJob}
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

function ChapterFormModal({ mangaId, onClose, onSave, createJob, updateJob }: {
  mangaId: string
  onClose: () => void
  onSave: (data: any, jobCtx?: any) => Promise<void>
  createJob?: (label: string, total: number) => string
  updateJob?: (id: string, patch: any) => void
}) {
  const [chapterNumber, setChapterNumber] = useState('')
  const [title, setTitle] = useState('')
  const [volume, setVolume] = useState('')
  const [externalUrl, setExternalUrl] = useState('')
  const [pagesText, setPagesText] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [previewMode, setPreviewMode] = useState<'text' | 'grid'>('text')
  const [inputTab, setInputTab] = useState<'mdx' | 'url' | 'upload'>('mdx')
  const [uploadedPages, setUploadedPages] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const [mdxMangaUrl, setMdxMangaUrl] = useState('')
  const [mdxFetching, setMdxFetching] = useState(false)
  const [mdxChapterList, setMdxChapterList] = useState<any[]>([])
  const [mdxSelected, setMdxSelected] = useState<Set<string>>(new Set())

  const handleMdxFetchChapters = async () => {
    setError('')
    const trimmed = mdxMangaUrl.trim()
    const uuidMatch = trimmed.match(/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i)
    const mangaId = uuidMatch?.[1]
    if (!mangaId) { setError('Could not find a manga ID in that URL. Paste the MangaDex manga page URL.'); return }
    setMdxFetching(true)
    setMdxChapterList([])
    setMdxSelected(new Set())
    try {
      const res = await axios.get(`/api/mangadex/manga-chapters/${mangaId}`)
      setMdxChapterList(res.data)
    } catch (err: any) {
      setError('Failed to fetch chapters from MangaDex')
    } finally {
      setMdxFetching(false)
    }
  }

  const toggleMdxChapter = (id: string) => {
    setMdxSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  // Combine URL pages + uploaded pages
  const urlPages = pagesText.split('\n').map(l => l.trim()).filter(Boolean)
  const pages = inputTab === 'url' ? urlPages : inputTab === 'upload' ? uploadedPages : []

  const handleUploadFiles = async (files: FileList | File[]) => {
    const fileArr = Array.from(files).filter(f => f.type.startsWith('image/'))
    if (fileArr.length === 0) { setError('Please select image files only'); return }

    setUploading(true)
    setError('')
    setUploadProgress(`Uploading 0 / ${fileArr.length}…`)

    try {
      // Upload in batches of 10
      const batchSize = 10
      const allUrls: string[] = []
      for (let i = 0; i < fileArr.length; i += batchSize) {
        const batch = fileArr.slice(i, i + batchSize)
        const formData = new FormData()
        batch.forEach(f => formData.append('pages', f))
        const res = await axios.post('/api/upload/pages', formData, {
          withCredentials: true,
          headers: { 'Content-Type': 'multipart/form-data' },
        })
        allUrls.push(...res.data.urls)
        setUploadProgress(`Uploading ${Math.min(i + batchSize, fileArr.length)} / ${fileArr.length}…`)
      }
      // Sort by filename so pages are in order
      allUrls.sort()
      setUploadedPages(prev => [...prev, ...allUrls])
      setUploadProgress('')
    } catch (err: any) {
      setError(err.response?.data?.error || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const removeUploadedPage = (idx: number) => {
    setUploadedPages(prev => prev.filter((_, i) => i !== idx))
  }

  const movePage = (from: number, to: number) => {
    setUploadedPages(prev => {
      const arr = [...prev]
      const [item] = arr.splice(from, 1)
      arr.splice(to, 0, item)
      return arr
    })
  }

  const handleSave = async () => {
    // MangaDex bulk import mode
    if (inputTab === 'mdx') {
      if (mdxSelected.size === 0) { setError('Select at least one chapter to import'); return }
      const chaptersToImport = mdxChapterList.filter(c => mdxSelected.has(c.id))
      const TOO_LARGE = 100
      setSaving(true)
      const jobId = createJob?.(`MDX Import — ${chaptersToImport.length} chapters`, chaptersToImport.length) ?? ''
      let done = 0; let failed = 0; const errors: string[] = []
      for (const ch of chaptersToImport) {
        try {
          await onSave({
            chapterNumber: ch.chapter || '?',
            title: ch.title || '',
            volume: ch.volume || '',
            pages: [],
            language: ch.language || 'en',
            mdxChapterId: ch.id,
          })
          done++
          updateJob?.(jobId, { done, errors, status: done + failed < chaptersToImport.length ? 'running' : (failed > 0 ? 'failed' : 'done') })
        } catch (err: any) {
          failed++
          const msg = err.response?.data?.error || `Ch.${ch.chapter} failed`
          errors.push(msg)
          const isTooLarge = err.response?.status === 413 || msg.toLowerCase().includes('large')
          updateJob?.(jobId, { done, failed, errors, status: isTooLarge ? 'toolarge' : 'running' })
        }
        if (chaptersToImport.length > TOO_LARGE && done + failed < chaptersToImport.length) {
          await new Promise(r => setTimeout(r, 50)) // small delay to avoid rate limits on large batches
        }
      }
      updateJob?.(jobId, { status: failed === chaptersToImport.length ? 'failed' : failed > 0 ? 'failed' : 'done' })
      if (failed > 0) setError(`${failed} chapter(s) failed to import. See Batch Jobs panel.`)
      setSaving(false)
      if (failed === 0) onClose()
      return
    }
    // URL / Upload mode
    if (!chapterNumber.trim()) { setError('Chapter number is required'); return }
    if (pages.length === 0) { setError('Add at least one page image'); return }
    setSaving(true)
    try {
      await onSave({ chapterNumber, title, volume, pages, language: 'en', externalUrl: externalUrl.trim() || undefined })
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

        {/* Chapter meta fields */}
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

          {/* External URL field */}
          <div>
            <label className="text-xs text-text-muted font-body mb-1 block uppercase tracking-widest">
              External Read Link
              <span className="ml-2 text-white/30 normal-case font-body">optional — shows a link button on the chapter</span>
            </label>
            <input
              value={externalUrl}
              onChange={e => setExternalUrl(e.target.value)}
              placeholder="https://webtoon.kakao.com/..."
              type="url"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-text font-body outline-none focus:border-blue-400/40 font-mono text-xs"
            />
          </div>

          {/* Tab switcher: MangaDex / URL / Upload */}
          <div className="flex gap-1 bg-white/5 rounded-xl p-1">
            <button
              onClick={() => setInputTab('mdx')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-body transition-all ${inputTab === 'mdx' ? 'bg-primary text-white' : 'text-text-muted hover:text-text'}`}>
              <BookOpen size={13} /> MangaDex
            </button>
            <button
              onClick={() => setInputTab('url')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-body transition-all ${inputTab === 'url' ? 'bg-primary text-white' : 'text-text-muted hover:text-text'}`}>
              <List size={13} /> URL Import
            </button>
            <button
              onClick={() => setInputTab('upload')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-body transition-all ${inputTab === 'upload' ? 'bg-primary text-white' : 'text-text-muted hover:text-text'}`}>
              <Upload size={13} /> Upload Files
            </button>
          </div>

          {/* MangaDex Import Tab */}
          {inputTab === 'mdx' && (
            <div className="flex flex-col gap-3">
              <label className="text-xs text-text-muted font-body uppercase tracking-widest">MangaDex Manga URL</label>
              <div className="flex gap-2">
                <input
                  value={mdxMangaUrl}
                  onChange={e => { setMdxMangaUrl(e.target.value); setMdxChapterList([]); setMdxSelected(new Set()) }}
                  placeholder="https://mangadex.org/title/32d76d19-.../manga-name"
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-text font-body outline-none focus:border-primary/40 font-mono text-xs"
                />
                <button
                  onClick={handleMdxFetchChapters}
                  disabled={mdxFetching || !mdxMangaUrl.trim()}
                  className="px-4 py-2.5 bg-primary hover:bg-primary/90 text-white text-sm font-body rounded-xl disabled:opacity-50 flex items-center gap-2 transition-all whitespace-nowrap">
                  {mdxFetching ? <><Loader size={13} className="animate-spin" /> Loading...</> : <><BookOpen size={13} /> Load Chapters</>}
                </button>
              </div>
              <p className="text-xs text-text-muted font-body">Paste the MangaDex manga page URL. Select chapters to import — pages are fetched live when reading, so they never expire.</p>

              {mdxChapterList.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-text-muted font-body uppercase tracking-widest">{mdxChapterList.length} chapters found</span>
                    <div className="flex gap-3">
                      <button onClick={() => setMdxSelected(new Set(mdxChapterList.map(c => c.id)))}
                        className="text-xs text-primary hover:text-primary/80 font-body">Select all</button>
                      <button onClick={() => setMdxSelected(new Set())}
                        className="text-xs text-text-muted hover:text-text font-body">Clear</button>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1 max-h-56 overflow-y-auto pr-1">
                    {mdxChapterList.map(ch => (
                      <label key={ch.id}
                        className={`flex items-center gap-3 px-3 py-2 rounded-xl cursor-pointer transition-all ${mdxSelected.has(ch.id) ? 'bg-primary/20 border border-primary/30' : 'bg-white/5 border border-transparent hover:bg-white/10'}`}>
                        <input type="checkbox" checked={mdxSelected.has(ch.id)} onChange={() => toggleMdxChapter(ch.id)} className="accent-primary" />
                        <span className="text-sm text-white font-body font-medium w-16 shrink-0">Ch. {ch.chapter}</span>
                        <span className="text-xs text-text-muted font-body truncate flex-1">{ch.title || '—'}</span>
                        <span className="text-xs text-text-muted font-mono shrink-0">{ch.pages}p</span>
                      </label>
                    ))}
                  </div>
                  {mdxSelected.size > 0 && (
                    <p className="text-xs text-green-400 font-body mt-2">✓ {mdxSelected.size} chapter{mdxSelected.size > 1 ? 's' : ''} selected</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* URL Tab */}
          {inputTab === 'url' && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs text-text-muted font-body uppercase tracking-widest">
                  Page Image URLs * ({urlPages.length} pages)
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
                  {urlPages.length === 0
                    ? <p className="col-span-4 text-xs text-text-muted text-center py-6 font-body">No pages yet</p>
                    : urlPages.map((url, i) => (
                      <div key={i} className="relative">
                        <img src={proxyUrl(url)} alt={`Page ${i+1}`} className="w-full h-20 object-cover rounded-lg"
                          onError={e => { e.currentTarget.src = 'https://placehold.co/80x112/1a1a2e/red?text=ERR' }} />
                        <span className="absolute bottom-1 right-1 text-xs bg-black/60 text-white px-1 rounded">{i+1}</span>
                      </div>
                    ))
                  }
                </div>
              )}
              <p className="text-xs text-text-muted font-body mt-1.5">Paste one image URL per line. Note: some hosts block hotlinking — use Upload Files instead.</p>
            </div>
          )}

          {/* Upload Tab */}
          {inputTab === 'upload' && (
            <div className="flex flex-col gap-3">
              {/* Drop zone */}
              <label
                onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={e => { e.preventDefault(); setDragOver(false); handleUploadFiles(e.dataTransfer.files) }}
                className={`flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-2xl py-8 cursor-pointer transition-all ${dragOver ? 'border-primary bg-primary/10' : 'border-white/10 hover:border-primary/40 hover:bg-white/5'}`}>
                {uploading ? (
                  <>
                    <Loader size={24} className="text-primary animate-spin" />
                    <span className="text-sm text-text-muted font-body">{uploadProgress}</span>
                  </>
                ) : (
                  <>
                    <Upload size={24} className="text-text-muted" />
                    <span className="text-sm text-text font-body">Drop images here or <span className="text-primary">browse</span></span>
                    <span className="text-xs text-text-muted font-body">PNG, JPG, WEBP — up to 10MB each</span>
                  </>
                )}
                <input type="file" multiple accept="image/*" className="hidden"
                  onChange={e => e.target.files && handleUploadFiles(e.target.files)} disabled={uploading} />
              </label>

              {/* Uploaded pages grid */}
              {uploadedPages.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs text-text-muted font-body uppercase tracking-widest">{uploadedPages.length} pages uploaded</label>
                    <button onClick={() => setUploadedPages([])} className="text-xs text-red-400 hover:text-red-300 font-body">Clear all</button>
                  </div>
                  <div className="grid grid-cols-4 gap-2 max-h-64 overflow-y-auto p-2 bg-white/5 rounded-xl">
                    {uploadedPages.map((url, i) => (
                      <div key={url} className="relative group">
                        <img src={url} alt={`Page ${i+1}`} className="w-full h-20 object-cover rounded-lg"
                          onError={e => { e.currentTarget.src = 'https://placehold.co/80x112/1a1a2e/red?text=ERR' }} />
                        <span className="absolute bottom-1 left-1 text-xs bg-black/60 text-white px-1 rounded">{i+1}</span>
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-1">
                          <button onClick={() => i > 0 && movePage(i, i - 1)}
                            className="p-1 bg-white/20 hover:bg-white/40 rounded text-white text-xs disabled:opacity-30" disabled={i === 0}>↑</button>
                          <button onClick={() => removeUploadedPage(i)}
                            className="p-1 bg-red-500/60 hover:bg-red-500 rounded text-white"><X size={10} /></button>
                          <button onClick={() => i < uploadedPages.length - 1 && movePage(i, i + 1)}
                            className="p-1 bg-white/20 hover:bg-white/40 rounded text-white text-xs disabled:opacity-30" disabled={i === uploadedPages.length - 1}>↓</button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-text-muted font-body mt-1.5">Hover pages to reorder ↑↓ or remove ✕</p>
                </div>
              )}
            </div>
          )}
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
          <button onClick={handleSave} disabled={saving || uploading}
            className="px-5 py-2.5 bg-primary hover:bg-primary/90 text-white text-sm font-body rounded-xl disabled:opacity-50 flex items-center gap-2 transition-all">
            {saving ? 'Saving...' : inputTab === 'mdx' ? <><Check size={14} /> Import {mdxSelected.size} Chapter{mdxSelected.size !== 1 ? 's' : ''}</> : <><Check size={14} /> Add Chapter ({pages.length} pages)</>}
          </button>
        </div>
      </div>
    </div>
  )
}