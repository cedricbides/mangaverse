import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import ReadingListButton from '@/components/ReadingListButton'
import RatingReviews from '@/components/RatingReviews'
import DownloadChapterButton from '@/components/DownloadChapterButton'
import { Heart, BookOpen, Star, Calendar, Tag, Plus, Trash2, X, Upload, CheckSquare, Square, Eye, EyeOff, Download, MoreHorizontal, ExternalLink, Link2, AlertCircle, CheckCircle } from 'lucide-react'
import axios from 'axios'
import type { Manga, Chapter } from '@/types'
import { getCoverUrl, getMangaTitle, getMangaDescription, getMangaTags, getStatusColor, formatChapter } from '@/utils/manga'
import { useAuth } from '@/context/AuthContext'

const MD = '/api/mangadex'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ManualChapter {
  _id: string
  mangaDexId: string
  chapterNumber: string
  title?: string
  volume?: string
  pages: string[]
  language: string
  source: 'manual' | 'mangadex'
  published: boolean
  mdxChapterId?: string
  externalUrl?: string
  createdAt: string
}

type MergedChapter =
  | { type: 'api'; data: Chapter }
  | { type: 'manual'; data: ManualChapter }

// ─── Admin: Add Chapter Modal ─────────────────────────────────────────────────

function AddChapterModal({
  mangaDexId,
  onClose,
  onAdded,
}: {
  mangaDexId: string
  onClose: () => void
  onAdded: (ch: ManualChapter) => void
}) {
  const [mangaUrl, setMangaUrl] = useState('')
  const [fetching, setFetching] = useState(false)
  const [chapterList, setChapterList] = useState<any[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)
  const [savedCount, setSavedCount] = useState(0)
  const [error, setError] = useState('')

  const handleFetchChapters = async () => {
    setError('')
    const uuidMatch = mangaUrl.match(/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i)
    const id = uuidMatch?.[1]
    if (!id) { setError('Could not find a manga ID. Paste the full MangaDex manga page URL.'); return }
    setFetching(true)
    setChapterList([])
    setSelected(new Set())
    try {
      const res = await axios.get(`/api/mangadex/manga-chapters/${id}`)
      setChapterList(res.data)
    } catch {
      setError('Failed to load chapters from MangaDex.')
    } finally {
      setFetching(false)
    }
  }

  const toggle = (id: string) => setSelected(prev => {
    const next = new Set(prev)
    next.has(id) ? next.delete(id) : next.add(id)
    return next
  })

  const handleImport = async () => {
    if (selected.size === 0) { setError('Select at least one chapter.'); return }
    setSaving(true)
    setSavedCount(0)
    setError('')
    try {
      let count = 0
      for (const ch of chapterList.filter(c => selected.has(c.id))) {
        const res = await axios.post(
          `/api/admin/mangadex/${mangaDexId}/chapters`,
          { chapterNumber: ch.chapter || '?', title: ch.title || '', volume: ch.volume || '', pages: [], language: 'en', mdxChapterId: ch.id },
          { withCredentials: true }
        )
        onAdded(res.data)
        count++
        setSavedCount(count)
      }
      onClose()
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to import chapters.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
      <div className="bg-[#13131a] border border-white/10 rounded-2xl w-full max-w-lg p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display text-xl text-white tracking-wide">Import from MangaDex</h2>
          <button onClick={onClose} className="text-text-muted hover:text-white transition-colors"><X size={18} /></button>
        </div>

        <div className="space-y-4">
          {/* Step 1: paste manga URL */}
          <div>
            <label className="font-mono text-xs text-blue-400 tracking-widest block mb-1.5">STEP 1 — PASTE MANGA PAGE URL</label>
            <div className="flex gap-2">
              <input
                value={mangaUrl}
                onChange={e => { setMangaUrl(e.target.value); setChapterList([]); setSelected(new Set()) }}
                placeholder="https://mangadex.org/title/32d76d19-..."
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-text font-body outline-none focus:border-blue-500/50 font-mono text-xs"
              />
              <button onClick={handleFetchChapters} disabled={fetching || !mangaUrl.trim()}
                className="px-4 py-2 bg-blue-500/20 border border-blue-500/40 text-blue-400 text-xs font-body rounded-xl hover:bg-blue-500/30 transition-all disabled:opacity-40 whitespace-nowrap">
                {fetching ? 'Loading…' : 'Load Chapters'}
              </button>
            </div>
          </div>

          {/* Step 2: pick chapters */}
          {chapterList.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="font-mono text-xs text-blue-400 tracking-widest">STEP 2 — SELECT CHAPTERS ({chapterList.length} found)</label>
                <div className="flex gap-3">
                  <button onClick={() => setSelected(new Set(chapterList.map(c => c.id)))} className="text-xs text-primary font-body">All</button>
                  <button onClick={() => setSelected(new Set())} className="text-xs text-text-muted font-body">None</button>
                </div>
              </div>
              <div className="flex flex-col gap-1 max-h-64 overflow-y-auto pr-1">
                {chapterList.map(ch => (
                  <label key={ch.id}
                    className={`flex items-center gap-3 px-3 py-2 rounded-xl cursor-pointer transition-all ${selected.has(ch.id) ? 'bg-primary/20 border border-primary/30' : 'bg-white/5 border border-transparent hover:bg-white/10'}`}>
                    <input type="checkbox" checked={selected.has(ch.id)} onChange={() => toggle(ch.id)} className="accent-primary shrink-0" />
                    <span className="text-sm text-white font-body font-medium w-16 shrink-0">Ch. {ch.chapter}</span>
                    <span className="text-xs text-text-muted font-body truncate flex-1">{ch.title || '—'}</span>
                    <span className="text-xs text-text-muted font-mono shrink-0">{ch.pages}p</span>
                  </label>
                ))}
              </div>
              {selected.size > 0 && (
                <p className="text-xs text-green-400 font-body mt-2">✓ {selected.size} chapter{selected.size !== 1 ? 's' : ''} selected — pages load live when reading</p>
              )}
            </div>
          )}

          {error && (
            <p className="text-xs text-red-400 font-body bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">{error}</p>
          )}
        </div>

        <div className="flex gap-3 mt-6">
          <button onClick={handleImport} disabled={saving || selected.size === 0}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-primary hover:bg-primary/90 text-white text-sm font-body font-medium rounded-xl transition-all disabled:opacity-50">
            <Upload size={14} />
            {saving ? `Importing ${savedCount}/${selected.size}…` : `Import ${selected.size > 0 ? selected.size + ' ' : ''}Chapter${selected.size !== 1 ? 's' : ''}`}
          </button>
          <button onClick={onClose}
            className="px-5 py-2.5 glass border border-white/10 text-text-muted text-sm font-body rounded-xl hover:text-text transition-colors">
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function MangaDetail() {
  const { id } = useParams<{ id: string }>()
  const [manga, setManga] = useState<Manga | null>(null)
  const [apiChapters, setApiChapters] = useState<Chapter[]>([])
  const [manualChapters, setManualChapters] = useState<ManualChapter[]>([])
  const [hiddenChapterIds, setHiddenChapterIds] = useState<Set<string>>(new Set())
  const [deletedChapterIds, setDeletedChapterIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'chapters' | 'info'>('chapters')
  const [showAddModal, setShowAddModal] = useState(false)
  const [showHidden, setShowHidden] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [bulkSelected, setBulkSelected] = useState<Set<string>>(new Set())
  const [bulkMode, setBulkMode] = useState(false)
  const [bulkWorking, setBulkWorking] = useState(false)
  const [showDownloadModal, setShowDownloadModal] = useState(false)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [importModal, setImportModal] = useState<{ chapterId: string; chapterLabel: string } | null>(null)
  const [importUrl, setImportUrl] = useState('')
  const [importResult, setImportResult] = useState<{ pages: string[]; note: string } | null>(null)
  const [importing, setImporting] = useState(false)
  const [importSaving, setImportSaving] = useState(false)
  const { toggleFavorite, isFavorite, isAdmin } = useAuth()

  const toggleBulkSelect = (id: string) => setBulkSelected(prev => {
    const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next
  })

  const handleBulkDelete = async () => {
    if (!confirm(`Delete ${bulkSelected.size} chapters? This cannot be undone.`)) return
    setBulkWorking(true)
    try {
      await axios.post('/api/admin/mangadex/chapters/bulk-delete', { ids: [...bulkSelected] }, { withCredentials: true })
      setManualChapters(prev => prev.filter(c => !bulkSelected.has(c._id)))
      setBulkSelected(new Set()); setBulkMode(false)
    } finally { setBulkWorking(false) }
  }

  const handleBulkPublish = async (publish: boolean) => {
    setBulkWorking(true)
    try {
      await axios.post('/api/admin/mangadex/chapters/bulk-publish', { ids: [...bulkSelected], published: publish }, { withCredentials: true })
      setManualChapters(prev => prev.map(c => bulkSelected.has(c._id) ? { ...c, published: publish } : c))
      setBulkSelected(new Set()); setBulkMode(false)
    } finally { setBulkWorking(false) }
  }

  useEffect(() => {
    if (!id) return
    setLoading(true)
    Promise.all([
      axios.get(`${MD}/manga/${id}?includes[]=cover_art&includes[]=author&includes[]=artist`),
      axios.get(`${MD}/manga/${id}/feed?limit=96&translatedLanguage[]=en&order[chapter]=desc&includeEmptyPages=0`),
    ]).then(([mangaRes, chaptersRes]) => {
      setManga(mangaRes.data.data)
      setApiChapters(chaptersRes.data.data)
    }).finally(() => setLoading(false))
  }, [id])

  // Load manual chapters for all users; admins also get hidden chapter IDs
  useEffect(() => {
    if (!id) return
    if (isAdmin) {
      Promise.all([
        axios.get(`/api/admin/mangadex/${id}/chapters`, { withCredentials: true }),
        axios.get(`/api/admin/mangadex/${id}/hidden-chapters`, { withCredentials: true }),
      ]).then(([manualRes, hiddenRes]) => {
        setManualChapters(manualRes.data)
        setHiddenChapterIds(new Set(hiddenRes.data.hidden))
        setDeletedChapterIds(new Set(hiddenRes.data.deleted))
      }).catch(() => {})
    } else {
      axios.get(`/api/local-manga/manual-chapters/${id}`)
        .then(res => setManualChapters(res.data))
        .catch(() => {})
    }
  }, [id, isAdmin])

  const handleDeleteManual = async (chapterId: string) => {
    if (!confirm('Delete this manual chapter? This cannot be undone.')) return
    setDeletingId(chapterId)
    try {
      await axios.delete(`/api/admin/mangadex/chapters/${chapterId}`, { withCredentials: true })
      setManualChapters((prev) => prev.filter((c) => c._id !== chapterId))
    } finally {
      setDeletingId(null)
    }
  }

  const handleHideApi = async (ch: Chapter) => {
    if (!confirm('Hide this chapter from the list?')) return
    setDeletingId(ch.id)
    try {
      await axios.post(
        `/api/admin/mangadex/${id}/hidden-chapters`,
        { chapterId: ch.id, chapterNumber: ch.attributes.chapter, chapterTitle: ch.attributes.title, mangaTitle: title },
        { withCredentials: true }
      )
      setHiddenChapterIds((prev) => new Set([...prev, ch.id]))
    } finally {
      setDeletingId(null)
    }
  }

  const handleRestoreApi = async (chapterId: string) => {
    setDeletingId(chapterId)
    try {
      await axios.delete(`/api/admin/mangadex/${id}/hidden-chapters/${chapterId}`, { withCredentials: true })
      setHiddenChapterIds((prev) => {
        const next = new Set(prev)
        next.delete(chapterId)
        return next
      })
    } finally {
      setDeletingId(null)
    }
  }

  const handlePermanentDelete = async (ch: Chapter) => {
    if (!confirm('Permanently delete this chapter? This CANNOT be undone or restored.')) return
    setDeletingId(ch.id)
    try {
      await axios.post(
        `/api/admin/mangadex/${id}/deleted-chapters`,
        { chapterId: ch.id, chapterNumber: ch.attributes.chapter, chapterTitle: ch.attributes.title, mangaTitle: title },
        { withCredentials: true }
      )
      setDeletedChapterIds((prev) => new Set([...prev, ch.id]))
      setHiddenChapterIds((prev) => {
        const next = new Set(prev)
        next.delete(ch.id)
        return next
      })
    } finally {
      setDeletingId(null)
    }
  }

  // Merge and sort all chapters by chapter number descending
  const mergedChapters: MergedChapter[] = [
    ...apiChapters
      .filter((c) => {
        if (deletedChapterIds.has(c.id)) return false
        if (showHidden) return hiddenChapterIds.has(c.id)
        return !hiddenChapterIds.has(c.id)
      })
      .map((c): MergedChapter => ({ type: 'api', data: c })),
    ...(!showHidden ? (isAdmin ? manualChapters : manualChapters.filter(c => c.published)).map((c): MergedChapter => ({ type: 'manual', data: c })) : []),
  ].sort((a, b) => {
    const numA = parseFloat(a.type === 'api' ? a.data.attributes.chapter || '0' : a.data.chapterNumber)
    const numB = parseFloat(b.type === 'api' ? b.data.attributes.chapter || '0' : b.data.chapterNumber)
    return numB - numA
  })

  if (loading) return (
    <div className="max-w-6xl mx-auto px-5 pt-28 pb-16 animate-pulse">
      <div className="flex gap-8">
        <div className="skeleton w-48 rounded-2xl flex-shrink-0" style={{ aspectRatio: '2/3' }} />
        <div className="flex-1 space-y-4 pt-4">
          <div className="skeleton h-8 rounded w-3/4" />
          <div className="skeleton h-4 rounded w-1/2" />
          <div className="skeleton h-24 rounded w-full" />
        </div>
      </div>
    </div>
  )

  if (!manga) return <div className="pt-28 text-center text-text-muted">Manga not found.</div>

  const title = getMangaTitle(manga)
  const desc = getMangaDescription(manga)
  const tags = manga.attributes.tags.map((t) => t.attributes.name.en)
  const cover = getCoverUrl(manga, 512)
  const fav = isFavorite(manga.id)
  const status = manga.attributes.status
  const authors = manga.relationships
    .filter((r) => r.type === 'author')
    .map((r) => (r.attributes as { name?: string })?.name)
    .filter(Boolean)

  return (
    <div>
      {showAddModal && id && (
        <AddChapterModal
          mangaDexId={id}
          onClose={() => setShowAddModal(false)}
          onAdded={(ch) => setManualChapters((prev) => [ch, ...prev])}
        />
      )}

      {/* ── Cinematic blurred backdrop ── */}
      <div className="relative h-72 overflow-hidden">
        <div className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${cover})`, filter: 'blur(80px) brightness(0.15) saturate(1.4)', transform: 'scale(1.3)' }} />
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-bg" />
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
      </div>

      {/* ── max-w-6xl container — wraps everything below the backdrop ── */}
      <div className="max-w-6xl mx-auto px-5 -mt-40 relative z-10 pb-16">

        {/* ── Main hero row ── */}
        <div className="flex flex-col sm:flex-row gap-8">

          {/* Cover */}
          <div className="flex-shrink-0 relative">
            <div className="absolute inset-0 rounded-2xl blur-2xl opacity-30 scale-95"
              style={{ background: `url(${cover}) center/cover`, filter: 'blur(20px)' }} />
            <img src={cover} alt={title}
              className="relative w-36 sm:w-52 rounded-2xl shadow-[0_32px_80px_rgba(0,0,0,0.9)] ring-1 ring-white/10"
              style={{ aspectRatio: '2/3', objectFit: 'cover' }} />
            <div className="absolute bottom-2 left-2 right-2 flex gap-1 flex-wrap">
              <span className="badge bg-black/70 backdrop-blur-sm text-text-muted border border-white/10">
                {manga.attributes.contentRating}
              </span>
            </div>
          </div>

          {/* Info */}
          <div className="flex-1 pt-4 sm:pt-8">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: getStatusColor(status) }} />
              <span className="font-mono text-xs capitalize" style={{ color: getStatusColor(status) }}>{status}</span>
              {manga.attributes.year && (
                <span className="font-mono text-xs text-text-muted">· {manga.attributes.year}</span>
              )}
              <span className="font-mono text-xs text-white/20">·</span>
              <span className="badge bg-blue-500/10 border border-blue-500/20 text-blue-400">MangaDex</span>
            </div>

            <h1 className="font-display text-4xl sm:text-5xl text-white tracking-wide leading-none mb-2">{title}</h1>

            {authors.length > 0 && (
              <p className="font-body text-sm text-text-muted mb-4">
                by <span className="text-text">{authors.join(', ')}</span>
              </p>
            )}

            <p className="font-body text-sm text-text-muted leading-relaxed mb-5 max-w-2xl line-clamp-4 sm:line-clamp-none">
              {desc
                .replace(/\*\*[^*]+\*\*/g, '')
                .replace(/\[[^\]]+\]\([^)]+\)/g, '')
                .replace(/https?:\/\/\S+/g, '')
                .replace(/---+/g, '—')
                .replace(/\s{2,}/g, ' ')
                .trim()
              }
            </p>

            <div className="flex flex-wrap gap-1.5 mb-5">
              {tags.slice(0, 8).map((t) => (
                <Link key={t} to={`/browse?genre=${t}`}
                  className="tag badge bg-white/5 border border-white/10 text-text-muted">
                  {t}
                </Link>
              ))}
            </div>

            <div className="flex gap-2.5 flex-wrap items-center">
              {mergedChapters.length > 0 && (() => {
                const first = mergedChapters[mergedChapters.length - 1]
                const href = first.type === 'api' ? `/read/${first.data.id}` : `/read/manual/${(first.data as ManualChapter)._id}`
                return (
                  <Link to={href}
                    className="flex items-center gap-2 px-6 py-2.5 bg-primary hover:bg-primary/90 text-white text-sm font-body font-medium rounded-xl transition-all hover:shadow-[0_0_24px_rgba(232,57,77,0.45)] active:scale-95">
                    <BookOpen size={15} />
                    Start Reading
                  </Link>
                )
              })()}

              <button onClick={() => toggleFavorite(manga.id)}
                className={`flex items-center gap-2 px-5 py-2.5 glass rounded-xl text-sm font-body transition-all ${
                  fav ? 'border-primary/50 text-primary' : 'text-text-muted hover:text-text hover:border-white/20'
                }`}>
                <Heart size={15} fill={fav ? 'currentColor' : 'none'} />
                {fav ? 'Saved' : 'Save'}
              </button>

              <ReadingListButton mangaId={manga.id} />

              <button onClick={() => setShowDownloadModal(true)}
                className="flex items-center gap-2 px-5 py-2.5 glass border-white/10 rounded-xl text-sm font-body text-text-muted hover:text-blue-400 hover:border-blue-400/30 transition-all">
                <Download size={15} />
                Downloads
              </button>
            </div>
          </div>
        </div>

        {/* ── Stats pill bar ── */}
        <div className="flex flex-wrap gap-2 mt-7 mb-8">
          {[
            { label: `${mergedChapters.length} Chapters`, icon: BookOpen },
            { label: manga.attributes.year?.toString() || '—', icon: Calendar },
            { label: manga.attributes.contentRating || 'Unknown', icon: Tag },
            { label: 'MangaDex', icon: Star },
          ].map(({ icon: Icon, label }) => (
            <div key={label}
              className="flex items-center gap-1.5 px-3 py-1.5 glass rounded-full border-white/5 font-body text-xs text-text-muted">
              <Icon size={11} className="text-primary" />
              <span className="capitalize">{label}</span>
            </div>
          ))}
          {isAdmin && (
            <div className="ml-auto">
              {/* pin button placeholder */}
            </div>
          )}
        </div>

        {/* ── Tabs + Admin toolbar ── */}
        <div className="flex items-center justify-between border-b border-white/5 mb-6">
          <div className="flex gap-4">
            {(['chapters', 'info'] as const).map((t) => (
              <button key={t} onClick={() => setTab(t)}
                className={`pb-3 font-body text-sm capitalize transition-colors border-b-2 -mb-px ${
                  tab === t ? 'border-primary text-primary' : 'border-transparent text-text-muted hover:text-text'
                }`}>
                {t}
              </button>
            ))}
          </div>

          {isAdmin && tab === 'chapters' && (
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              {bulkMode ? (
                <>
                  <span className="text-xs text-text-muted font-body">{bulkSelected.size} selected</span>
                  <button onClick={() => setBulkSelected(new Set(manualChapters.map(c => c._id)))}
                    className="text-xs text-primary font-body hover:underline">All</button>
                  <button onClick={() => setBulkSelected(new Set())}
                    className="text-xs text-text-muted font-body hover:underline">None</button>
                  <button onClick={() => handleBulkPublish(true)} disabled={bulkWorking || bulkSelected.size === 0}
                    className="flex items-center gap-1 px-3 py-1.5 bg-green-500/20 border border-green-500/40 text-green-400 text-xs font-body rounded-xl hover:bg-green-500/30 disabled:opacity-40">
                    <Eye size={11} /> Publish
                  </button>
                  <button onClick={() => handleBulkPublish(false)} disabled={bulkWorking || bulkSelected.size === 0}
                    className="flex items-center gap-1 px-3 py-1.5 bg-yellow-500/20 border border-yellow-500/40 text-yellow-400 text-xs font-body rounded-xl hover:bg-yellow-500/30 disabled:opacity-40">
                    <EyeOff size={11} /> Unpublish
                  </button>
                  <button onClick={handleBulkDelete} disabled={bulkWorking || bulkSelected.size === 0}
                    className="flex items-center gap-1 px-3 py-1.5 bg-red-500/20 border border-red-500/40 text-red-400 text-xs font-body rounded-xl hover:bg-red-500/30 disabled:opacity-40">
                    <Trash2 size={11} /> Delete
                  </button>
                  <button onClick={() => { setBulkMode(false); setBulkSelected(new Set()) }}
                    className="px-3 py-1.5 bg-white/5 border border-white/10 text-text-muted text-xs font-body rounded-xl hover:bg-white/10">
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  {hiddenChapterIds.size > 0 && (
                    <button onClick={() => setShowHidden((v) => !v)}
                      className={`flex items-center gap-1.5 px-4 py-1.5 text-xs font-body rounded-xl border transition-all ${showHidden ? 'bg-red-500/20 border-red-500/40 text-red-400' : 'bg-white/5 border-white/10 text-text-muted hover:border-white/20'}`}>
                      {showHidden ? `Hide (${hiddenChapterIds.size})` : `Show Hidden (${hiddenChapterIds.size})`}
                    </button>
                  )}
                  {manualChapters.length > 0 && (
                    <button onClick={() => setBulkMode(true)}
                      className="flex items-center gap-1.5 px-4 py-1.5 bg-white/5 border border-white/10 text-text-muted text-xs font-body rounded-xl hover:bg-white/10 transition-all">
                      <CheckSquare size={13} /> Bulk Edit
                    </button>
                  )}
                  <button onClick={() => setShowAddModal(true)}
                    className="flex items-center gap-1.5 px-4 py-1.5 bg-amber-500/20 border border-amber-500/40 text-amber-400 text-xs font-body rounded-xl hover:bg-amber-500/30 transition-all">
                    <Plus size={13} /> Add Chapter
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {/* ── Chapter list ── */}
        {tab === 'chapters' && (
          <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
            {mergedChapters.length === 0 && (
              <p className="text-text-muted font-body text-sm text-center py-12">No English chapters available.</p>
            )}

            {mergedChapters.map((item) => {
              if (item.type === 'api') {
                const ch = item.data
                return (
                  <div key={ch.id} className="flex items-center gap-2 group">
                    <Link to={`/read/${ch.id}`}
                      className="flex-1 flex items-center justify-between glass glass-hover px-4 py-3 rounded-xl">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-body text-sm text-text group-hover:text-primary transition-colors">
                            {formatChapter(ch)}
                          </p>
                          <span className="badge bg-blue-500/10 border border-blue-500/20 text-blue-400">API</span>
                        </div>
                        <p className="font-mono text-xs text-text-muted mt-0.5">
                          {new Date(ch.attributes.publishAt).toLocaleDateString()}
                        </p>
                      </div>
                      <BookOpen size={14} className="text-text-muted group-hover:text-primary transition-colors" />
                    </Link>
                    <DownloadChapterButton
                      mdxChapterId={ch.id}
                      label={`${getMangaTitle(manga)} - ${formatChapter(ch)}`}
                      mangaId={manga.id}
                      mangaTitle={getMangaTitle(manga)}
                      mangaCover={getCoverUrl(manga)}
                      chapterNumber={ch.attributes.chapter || '?'}
                    />
                    {isAdmin && (
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {showHidden ? (
                          <>
                            <button
                              onClick={() => handleRestoreApi(ch.id)}
                              disabled={deletingId === ch.id}
                              className="px-2 py-1 text-xs font-body text-green-400 hover:text-green-300 transition-colors disabled:opacity-40"
                              title="Restore chapter">
                              Restore
                            </button>
                            <button
                              onClick={() => handlePermanentDelete(ch)}
                              disabled={deletingId === ch.id}
                              className="p-2 text-red-500 hover:text-red-400 transition-colors disabled:opacity-40"
                              title="Permanently delete">
                              <Trash2 size={14} />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => handleHideApi(ch)}
                              disabled={deletingId === ch.id}
                              className="p-2 text-text-muted hover:text-yellow-400 transition-colors disabled:opacity-40"
                              title="Hide chapter">
                              <X size={14} />
                            </button>
                            <button
                              onClick={() => handlePermanentDelete(ch)}
                              disabled={deletingId === ch.id}
                              className="p-2 text-text-muted hover:text-red-400 transition-colors disabled:opacity-40"
                              title="Permanently delete">
                              <Trash2 size={14} />
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )
              }

              // Manual chapter
              const ch = item.data
              const chapterHref = ch.externalUrl
                ? ch.externalUrl
                : ch.source === 'mangadex' && ch.mdxChapterId
                  ? `/read/${ch.mdxChapterId}`
                  : `/read/manual/${ch._id}`
              const isExternal = !!ch.externalUrl
              const menuOpen = openMenuId === ch._id

              return (
                <div key={ch._id} className="flex items-center gap-2 group/row">
                  {bulkMode && (
                    <button onClick={() => toggleBulkSelect(ch._id)} className="p-1 shrink-0 text-text-muted hover:text-primary transition-colors">
                      {bulkSelected.has(ch._id) ? <CheckSquare size={16} className="text-primary" /> : <Square size={16} />}
                    </button>
                  )}

                  {isExternal ? (
                    <a href={chapterHref} target="_blank" rel="noopener noreferrer"
                      className={`flex-1 flex items-center justify-between glass glass-hover px-4 py-3 rounded-xl transition-all group ${bulkSelected.has(ch._id) ? 'ring-1 ring-primary/40 bg-primary/5' : ''}`}>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-body text-sm text-text group-hover:text-amber-400 transition-colors">
                            {ch.volume ? `Vol.${ch.volume} ` : ''}Ch.{ch.chapterNumber}
                            {ch.title ? ` — ${ch.title}` : ''}
                          </p>
                          <span className="flex items-center gap-1 px-1.5 py-0.5 bg-blue-500/10 border border-blue-500/25 text-blue-400 text-[10px] font-mono rounded-md">
                            <ExternalLink size={9} /> EXT
                          </span>
                          <span className="badge bg-amber-500/10 border border-amber-500/25 text-amber-400">
                            {ch.source === 'mangadex' ? 'MDX' : 'MANUAL'}
                          </span>
                          {isAdmin && (
                            <span className={`badge ${ch.published ? 'bg-green-500/10 border border-green-500/25 text-green-400' : 'bg-white/5 border border-white/20 text-text-muted'}`}>
                              {ch.published ? 'PUBLISHED' : 'DRAFT'}
                            </span>
                          )}
                        </div>
                        <p className="font-mono text-xs text-text-muted mt-0.5">
                          {new Date(ch.createdAt).toLocaleDateString()}
                          {ch.source !== 'mangadex' && ` · ${ch.pages.length} pages`}
                          <span className="ml-2 text-blue-400/70">↗ Opens external site</span>
                        </p>
                      </div>
                      <ExternalLink size={13} className="text-blue-400/50 group-hover:text-blue-400 transition-colors shrink-0" />
                    </a>
                  ) : (
                    <Link to={chapterHref}
                      className={`flex-1 flex items-center justify-between glass glass-hover px-4 py-3 rounded-xl transition-all group ${bulkSelected.has(ch._id) ? 'ring-1 ring-primary/40 bg-primary/5' : ''}`}>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-body text-sm text-text group-hover:text-amber-400 transition-colors">
                            {ch.volume ? `Vol.${ch.volume} ` : ''}Ch.{ch.chapterNumber}
                            {ch.title ? ` — ${ch.title}` : ''}
                          </p>
                          <span className="badge bg-amber-500/10 border border-amber-500/25 text-amber-400">
                            {ch.source === 'mangadex' ? 'MDX' : 'MANUAL'}
                          </span>
                          {isAdmin && (
                            <span className={`badge ${ch.published ? 'bg-green-500/10 border border-green-500/25 text-green-400' : 'bg-white/5 border border-white/20 text-text-muted'}`}>
                              {ch.published ? 'PUBLISHED' : 'DRAFT'}
                            </span>
                          )}
                        </div>
                        <p className="font-mono text-xs text-text-muted mt-0.5">
                          {new Date(ch.createdAt).toLocaleDateString()}
                          {ch.source !== 'mangadex' && ` · ${ch.pages.length} pages`}
                        </p>
                      </div>
                      <BookOpen size={14} className="text-text-muted group-hover:text-amber-400 transition-colors shrink-0" />
                    </Link>
                  )}

                  {!bulkMode && (
                    <div className="relative shrink-0">
                      <button
                        onClick={() => setOpenMenuId(menuOpen ? null : ch._id)}
                        className="p-2 text-text-muted hover:text-text transition-colors opacity-0 group-hover/row:opacity-100 focus:opacity-100"
                        title="More options">
                        <MoreHorizontal size={15} />
                      </button>

                      {menuOpen && (
                        <>
                          <div className="fixed inset-0 z-30" onClick={() => setOpenMenuId(null)} />
                          <div className="absolute right-0 top-8 z-40 w-44 bg-surface border border-white/10 rounded-xl shadow-2xl overflow-hidden py-1">

                            {(ch.pages?.length > 0 || (ch.source === 'mangadex' && ch.mdxChapterId)) && (
                              <div className="px-1">
                                <DownloadChapterButton
                                  pages={ch.source !== 'mangadex' && ch.pages?.length > 0 ? ch.pages : undefined}
                                  mdxChapterId={ch.source === 'mangadex' ? ch.mdxChapterId : undefined}
                                  label={`${getMangaTitle(manga)} - Ch.${ch.chapterNumber}${ch.title ? ' - ' + ch.title : ''}`}
                                  mangaId={manga.id}
                                  mangaTitle={getMangaTitle(manga)}
                                  mangaCover={getCoverUrl(manga)}
                                  chapterNumber={ch.chapterNumber}
                                />
                              </div>
                            )}

                            {isAdmin && (
                              <>
                                <div className="h-px bg-white/10 my-1" />

                                <button
                                  onClick={async () => {
                                    const url = prompt('External URL (leave blank to remove):', ch.externalUrl || '')
                                    if (url === null) return
                                    await axios.patch(`/api/admin/chapters/${ch._id}/external-url`, { externalUrl: url || null }, { withCredentials: true })
                                    setManualChapters(prev => prev.map(c => c._id === ch._id ? { ...c, externalUrl: url || undefined } : c))
                                    setOpenMenuId(null)
                                  }}
                                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-body text-text-muted hover:text-text hover:bg-white/5 transition-all">
                                  <ExternalLink size={13} />
                                  {ch.externalUrl ? 'Edit external link' : 'Set external link'}
                                </button>

                                <button
                                  onClick={() => {
                                    setImportModal({ chapterId: ch._id, chapterLabel: `Ch.${ch.chapterNumber}${ch.title ? ' — ' + ch.title : ''}` })
                                    setImportUrl(ch.externalUrl || '')
                                    setImportResult(null)
                                    setOpenMenuId(null)
                                  }}
                                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-body text-blue-400 hover:bg-blue-500/10 transition-all">
                                  <Link2 size={13} />
                                  Import pages from URL
                                </button>

                                <button
                                  onClick={async () => {
                                    await axios.post('/api/admin/mangadex/chapters/bulk-publish', { ids: [ch._id], published: !ch.published }, { withCredentials: true })
                                    setManualChapters(prev => prev.map(c => c._id === ch._id ? { ...c, published: !c.published } : c))
                                    setOpenMenuId(null)
                                  }}
                                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-body text-text-muted hover:text-text hover:bg-white/5 transition-all">
                                  {ch.published ? <EyeOff size={13} /> : <Eye size={13} />}
                                  {ch.published ? 'Unpublish' : 'Publish'}
                                </button>

                                <div className="h-px bg-white/10 my-1" />

                                <button
                                  onClick={() => { handleDeleteManual(ch._id); setOpenMenuId(null) }}
                                  disabled={deletingId === ch._id}
                                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-body text-red-400 hover:bg-red-500/10 transition-all disabled:opacity-40">
                                  <Trash2 size={13} />
                                  Delete chapter
                                </button>
                              </>
                            )}

                            {!isAdmin && !ch.pages?.length && !ch.mdxChapterId && (
                              <p className="px-3 py-2 text-xs text-text-muted font-body">No options</p>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* ── Info tab ── */}
        {tab === 'info' && (
          <div className="glass rounded-2xl p-6">
            <p className="font-body text-sm text-text-muted leading-relaxed">{desc}</p>
            <div className="grid sm:grid-cols-2 gap-4 mt-6">
              {[
                ['Status', manga.attributes.status],
                ['Year', manga.attributes.year?.toString() || '-'],
                ['Content Rating', manga.attributes.contentRating],
                ['Languages', manga.attributes.availableTranslatedLanguages?.join(', ') || '-'],
                ['Last Chapter', manga.attributes.lastChapter || '-'],
                ['Last Volume', manga.attributes.lastVolume || '-'],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between py-2 border-b border-white/5">
                  <span className="font-mono text-xs text-text-muted">{k}</span>
                  <span className="font-body text-xs text-text capitalize">{v}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Ratings & Reviews ── */}
        <RatingReviews mangaId={manga.id} />

      </div>
      {/* ↑ closes max-w-6xl mx-auto */}

      {/* ── Import Pages from URL Modal ── */}
      {importModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => { setImportModal(null); setImportResult(null) }} />
          <div className="relative w-full max-w-lg bg-surface border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-10">
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
              <div className="flex items-center gap-3">
                <Link2 size={16} className="text-blue-400" />
                <div>
                  <p className="font-body text-sm text-white font-semibold">Import Pages from URL</p>
                  <p className="text-xs text-text-muted font-body">{importModal.chapterLabel}</p>
                </div>
              </div>
              <button onClick={() => { setImportModal(null); setImportResult(null) }}
                className="p-1.5 text-text-muted hover:text-text transition-colors">
                <X size={16} />
              </button>
            </div>

            <div className="px-5 py-4 flex flex-col gap-4">
              <div>
                <label className="text-xs text-text-muted font-body mb-1.5 block">Chapter URL</label>
                <div className="flex gap-2">
                  <input
                    value={importUrl}
                    onChange={e => setImportUrl(e.target.value)}
                    placeholder="https://example.com/manga/chapter-1"
                    className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm font-body text-text placeholder-text-muted focus:outline-none focus:border-blue-400/50"
                  />
                  <button
                    onClick={async () => {
                      if (!importUrl.trim()) return
                      setImporting(true)
                      setImportResult(null)
                      try {
                        const res = await axios.post('/api/admin/scrape-chapter-url', { url: importUrl.trim() }, { withCredentials: true })
                        setImportResult(res.data)
                      } catch (err: any) {
                        setImportResult({ pages: [], note: err.response?.data?.error || 'Failed to fetch URL' })
                      } finally {
                        setImporting(false)
                      }
                    }}
                    disabled={importing || !importUrl.trim()}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-500/20 border border-blue-500/30 text-blue-400 text-sm font-body rounded-xl hover:bg-blue-500/30 disabled:opacity-40 transition-all">
                    {importing ? 'Scanning…' : 'Scan'}
                  </button>
                </div>
              </div>

              <div className="flex gap-2 px-3 py-2.5 bg-yellow-500/5 border border-yellow-500/15 rounded-xl">
                <AlertCircle size={13} className="text-yellow-400 shrink-0 mt-0.5" />
                <p className="text-xs text-text-muted font-body leading-relaxed">
                  Works on sites with plain image tags. <span className="text-yellow-400">Won't work</span> on JS-rendered sites like Webnovel or Pocket Comics. For those, paste the image URLs manually below.
                </p>
              </div>

              {importResult && (
                <div className="flex flex-col gap-3">
                  <div className={`flex gap-2 px-3 py-2.5 rounded-xl border ${importResult.pages.length > 0 ? 'bg-green-500/5 border-green-500/15' : 'bg-red-500/5 border-red-500/15'}`}>
                    {importResult.pages.length > 0
                      ? <CheckCircle size={13} className="text-green-400 shrink-0 mt-0.5" />
                      : <AlertCircle size={13} className="text-red-400 shrink-0 mt-0.5" />}
                    <p className="text-xs font-body text-text-muted">{importResult.note}</p>
                  </div>

                  {importResult.pages.length > 0 && (
                    <>
                      <div className="max-h-32 overflow-y-auto flex flex-col gap-1">
                        {importResult.pages.slice(0, 5).map((p, i) => (
                          <p key={i} className="text-[10px] text-text-muted font-mono truncate px-2 py-1 bg-white/5 rounded-lg">{p}</p>
                        ))}
                        {importResult.pages.length > 5 && (
                          <p className="text-[10px] text-text-muted font-body px-2">…and {importResult.pages.length - 5} more</p>
                        )}
                      </div>
                      <button
                        onClick={async () => {
                          setImportSaving(true)
                          try {
                            await axios.patch(`/api/admin/chapters/${importModal.chapterId}/external-url`, { externalUrl: null }, { withCredentials: true })
                            await axios.put(`/api/admin/mangadex/chapters/${importModal.chapterId}`, { pages: importResult.pages, externalUrl: null, source: 'manual' }, { withCredentials: true })
                            setManualChapters(prev => prev.map(c => c._id === importModal.chapterId ? { ...c, pages: importResult!.pages, externalUrl: undefined, source: 'manual' } : c))
                            setImportModal(null)
                            setImportResult(null)
                          } catch {
                            alert('Failed to save pages')
                          } finally {
                            setImportSaving(false)
                          }
                        }}
                        disabled={importSaving}
                        className="w-full py-2.5 bg-green-500/20 border border-green-500/30 text-green-400 text-sm font-body rounded-xl hover:bg-green-500/30 disabled:opacity-40 transition-all">
                        {importSaving ? 'Saving…' : `Save ${importResult.pages.length} pages to chapter`}
                      </button>
                    </>
                  )}

                  {importResult.pages.length === 0 && (
                    <div>
                      <label className="text-xs text-text-muted font-body mb-1.5 block">Paste image URLs manually (one per line)</label>
                      <textarea
                        rows={5}
                        placeholder="https://cdn.example.com/page1.jpg&#10;https://cdn.example.com/page2.jpg"
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-text placeholder-text-muted focus:outline-none focus:border-primary/50 resize-none"
                        onChange={e => {
                          const lines = e.target.value.split('\n').map(l => l.trim()).filter(Boolean)
                          setImportResult(prev => prev ? { ...prev, pages: lines } : { pages: lines, note: `${lines.length} URLs entered manually` })
                        }}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Download Modal ── */}
      {showDownloadModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
          onClick={e => { if (e.target === e.currentTarget) setShowDownloadModal(false) }}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowDownloadModal(false)} />
          <div className="relative w-full max-w-md bg-surface border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-10">
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
              <div className="flex items-center gap-3">
                <Download size={16} className="text-blue-400" />
                <div>
                  <p className="font-body text-sm text-white font-semibold">Download Chapters</p>
                  <p className="text-xs text-text-muted font-body">Saved as ZIP to your device</p>
                </div>
              </div>
              <button onClick={() => setShowDownloadModal(false)}
                className="p-1.5 text-text-muted hover:text-text transition-colors">
                <X size={16} />
              </button>
            </div>

            <div className="max-h-80 overflow-y-auto px-3 py-3 flex flex-col gap-1.5">
              {mergedChapters.length === 0 ? (
                <p className="text-center text-text-muted text-sm font-body py-6">No chapters available to download.</p>
              ) : (
                mergedChapters.map(item => {
                  if (item.type === 'api') {
                    const ch = item.data
                    return (
                      <div key={ch.id} className="flex items-center justify-between px-3 py-2.5 glass rounded-xl border border-white/5">
                        <div>
                          <p className="text-sm font-body text-text">{formatChapter(ch)}</p>
                          <p className="text-xs text-text-muted font-body">{new Date(ch.attributes.publishAt).toLocaleDateString()} · API</p>
                        </div>
                        <DownloadChapterButton
                          mdxChapterId={ch.id}
                          label={`${getMangaTitle(manga)} - ${formatChapter(ch)}`}
                          mangaId={manga.id}
                          mangaTitle={getMangaTitle(manga)}
                          mangaCover={getCoverUrl(manga)}
                          chapterNumber={ch.attributes.chapter || '?'}
                        />
                      </div>
                    )
                  }
                  const ch = item.data
                  return (
                    <div key={ch._id} className="flex items-center justify-between px-3 py-2.5 glass rounded-xl border border-white/5">
                      <div>
                        <p className="text-sm font-body text-text">
                          {ch.volume ? `Vol.${ch.volume} ` : ''}Ch.{ch.chapterNumber}
                          {ch.title ? ` — ${ch.title}` : ''}
                        </p>
                        <p className="text-xs text-text-muted font-body">
                          {new Date(ch.createdAt).toLocaleDateString()}
                          {ch.source !== 'mangadex' && ` · ${ch.pages.length} pages`}
                        </p>
                      </div>
                      {(ch.pages?.length > 0 || (ch.source === 'mangadex' && ch.mdxChapterId)) ? (
                        <DownloadChapterButton
                          pages={ch.source !== 'mangadex' && ch.pages?.length > 0 ? ch.pages : undefined}
                          mdxChapterId={ch.source === 'mangadex' ? ch.mdxChapterId : undefined}
                          label={`${getMangaTitle(manga)} - Ch.${ch.chapterNumber}${ch.title ? ' - ' + ch.title : ''}`}
                          mangaId={manga.id}
                          mangaTitle={getMangaTitle(manga)}
                          mangaCover={getCoverUrl(manga)}
                          chapterNumber={ch.chapterNumber}
                        />
                      ) : (
                        <span className="text-xs text-text-muted font-body px-2">No pages</span>
                      )}
                    </div>
                  )
                })
              )}
            </div>

            <div className="px-5 py-3 border-t border-white/10 bg-white/[0.02]">
              <p className="text-xs text-text-muted font-body text-center">
                Each chapter downloads as a ZIP · No server bandwidth used
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}