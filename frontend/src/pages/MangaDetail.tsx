import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Heart, BookOpen, Star, Calendar, Tag, Plus, Trash2, X, Upload } from 'lucide-react'
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
  source: 'manual'
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
  const [form, setForm] = useState({
    chapterNumber: '',
    title: '',
    volume: '',
    language: 'en',
    pages: '',
  })
  const [mdUrl, setMdUrl] = useState('')
  const [importing, setImporting] = useState(false)
  const [importSuccess, setImportSuccess] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }))

  // Extract chapter ID from MangaDex URL or raw ID
  const extractChapterId = (input: string): string | null => {
    const match = input.match(/chapter\/([a-f0-9-]{36})/)
    if (match) return match[1]
    if (/^[a-f0-9-]{36}$/.test(input.trim())) return input.trim()
    return null
  }

  const handleImport = async () => {
    const chapterId = extractChapterId(mdUrl)
    if (!chapterId) return setError('Invalid MangaDex chapter URL or ID.')
    setImporting(true)
    setError('')
    setImportSuccess(false)
    try {
      const MD = 'https://api.mangadex.org'
      const [metaRes, serverRes] = await Promise.all([
        axios.get(`${MD}/chapter/${chapterId}`),
        axios.get(`${MD}/at-home/server/${chapterId}`),
      ])
      const attr = metaRes.data.data.attributes
      const { baseUrl, chapter } = serverRes.data
      const pages = chapter.data.map(
        (file: string) => `${baseUrl}/data/${chapter.hash}/${file}`
      )
      setForm({
        chapterNumber: attr.chapter || '',
        title: attr.title || '',
        volume: attr.volume || '',
        language: attr.translatedLanguage || 'en',
        pages: pages.join('\n'),
      })
      setImportSuccess(true)
    } catch {
      setError('Failed to fetch chapter from MangaDex.')
    } finally {
      setImporting(false)
    }
  }

  const handleSubmit = async () => {
    if (!form.chapterNumber.trim()) return setError('Chapter number is required.')
    setSaving(true)
    setError('')
    try {
      const pages = form.pages
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean)
      const res = await axios.post(
        `/api/admin/mangadex/${mangaDexId}/chapters`,
        { ...form, pages },
        { withCredentials: true }
      )
      onAdded(res.data)
      onClose()
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save chapter.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
      <div className="bg-[#13131a] border border-white/10 rounded-2xl w-full max-w-lg p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display text-xl text-white tracking-wide">Add Manual Chapter</h2>
          <button onClick={onClose} className="text-text-muted hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-3">

          {/* MangaDex Import */}
          <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl">
            <label className="font-mono text-xs text-blue-400 tracking-widest block mb-1.5">
              IMPORT FROM MANGADEX URL
            </label>
            <div className="flex gap-2">
              <input
                value={mdUrl}
                onChange={(e) => { setMdUrl(e.target.value); setImportSuccess(false) }}
                placeholder="https://mangadex.org/chapter/..."
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-text font-body outline-none focus:border-blue-500/50"
              />
              <button
                onClick={handleImport}
                disabled={importing || !mdUrl.trim()}
                className="px-4 py-2 bg-blue-500/20 border border-blue-500/40 text-blue-400 text-xs font-body rounded-xl hover:bg-blue-500/30 transition-all disabled:opacity-40 whitespace-nowrap"
              >
                {importing ? 'Fetching…' : 'Import'}
              </button>
            </div>
            {importSuccess && (
              <p className="text-xs text-green-400 mt-1.5 font-body">
                ✓ {form.pages.split('\n').filter(Boolean).length} pages imported — review and save below
              </p>
            )}
          </div>

          {/* Row: Number + Volume */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-mono text-xs text-text-muted tracking-widest block mb-1">CHAPTER NO. *</label>
              <input
                value={form.chapterNumber}
                onChange={(e) => set('chapterNumber', e.target.value)}
                placeholder="e.g. 79.2"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-text font-body outline-none focus:border-primary/50"
              />
            </div>
            <div>
              <label className="font-mono text-xs text-text-muted tracking-widest block mb-1">VOLUME</label>
              <input
                value={form.volume}
                onChange={(e) => set('volume', e.target.value)}
                placeholder="e.g. 8"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-text font-body outline-none focus:border-primary/50"
              />
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="font-mono text-xs text-text-muted tracking-widest block mb-1">TITLE</label>
            <input
              value={form.title}
              onChange={(e) => set('title', e.target.value)}
              placeholder="Optional chapter title"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-text font-body outline-none focus:border-primary/50"
            />
          </div>

          {/* Language */}
          <div>
            <label className="font-mono text-xs text-text-muted tracking-widest block mb-1">LANGUAGE</label>
            <select
              value={form.language}
              onChange={(e) => set('language', e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-text font-body outline-none focus:border-primary/50"
            >
              <option value="en">English</option>
              <option value="ja">Japanese</option>
              <option value="es">Spanish</option>
              <option value="fr">French</option>
              <option value="pt-br">Portuguese (BR)</option>
              <option value="id">Indonesian</option>
            </select>
          </div>

          {/* Pages */}
          <div>
            <label className="font-mono text-xs text-text-muted tracking-widest block mb-1">
              PAGE URLs <span className="normal-case text-text-muted/60">(one per line)</span>
            </label>
            <textarea
              value={form.pages}
              onChange={(e) => set('pages', e.target.value)}
              placeholder={"https://cdn.example.com/page1.jpg\nhttps://cdn.example.com/page2.jpg"}
              rows={5}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-text font-body outline-none focus:border-primary/50 resize-none font-mono"
            />
            <p className="text-xs text-text-muted mt-1 font-body">
              {form.pages.split('\n').filter((l) => l.trim()).length} pages entered
            </p>
          </div>

          {error && (
            <p className="text-xs text-red-400 font-body bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-primary hover:bg-primary/90 text-white text-sm font-body font-medium rounded-xl transition-all disabled:opacity-50"
          >
            <Upload size={14} />
            {saving ? 'Saving…' : 'Add Chapter'}
          </button>
          <button
            onClick={onClose}
            className="px-5 py-2.5 glass border border-white/10 text-text-muted text-sm font-body rounded-xl hover:text-text transition-colors"
          >
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
  const { toggleFavorite, isFavorite, isAdmin } = useAuth()

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

  // Admins also load manual chapters and hidden chapter IDs
  useEffect(() => {
    if (!id || !isAdmin) return
    Promise.all([
      axios.get(`/api/admin/mangadex/${id}/chapters`, { withCredentials: true }),
      axios.get(`/api/admin/mangadex/${id}/hidden-chapters`, { withCredentials: true }),
    ]).then(([manualRes, hiddenRes]) => {
      setManualChapters(manualRes.data)
      setHiddenChapterIds(new Set(hiddenRes.data.hidden))
      setDeletedChapterIds(new Set(hiddenRes.data.deleted))
    }).catch(() => {})
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
    ...(isAdmin && !showHidden ? manualChapters.map((c): MergedChapter => ({ type: 'manual', data: c })) : []),
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

      {/* Blurred header */}
      <div className="relative h-64 overflow-hidden">
        <div className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${cover})`, filter: 'blur(60px) brightness(0.2)', transform: 'scale(1.2)' }} />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-bg" />
      </div>

      <div className="max-w-6xl mx-auto px-5 -mt-32 relative z-10 pb-16">
        <div className="flex flex-col sm:flex-row gap-7">
          {/* Cover */}
          <div className="flex-shrink-0">
            <img src={cover} alt={title}
              className="w-36 sm:w-48 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.8)]"
              style={{ aspectRatio: '2/3', objectFit: 'cover' }} />
          </div>

          {/* Info */}
          <div className="flex-1 pt-2">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2 h-2 rounded-full" style={{ background: getStatusColor(status) }} />
              <span className="font-mono text-xs text-text-muted capitalize">{status}</span>
              {manga.attributes.year && (
                <span className="font-mono text-xs text-text-muted">· {manga.attributes.year}</span>
              )}
            </div>
            <h1 className="font-display text-4xl sm:text-5xl text-white tracking-wide leading-tight mb-3">{title}</h1>
            {authors.length > 0 && (
              <p className="font-body text-sm text-text-muted mb-3">by {authors.join(', ')}</p>
            )}
            <p className="font-body text-sm text-text-muted leading-relaxed mb-4 max-w-2xl line-clamp-3 sm:line-clamp-none">{desc}</p>

            <div className="flex flex-wrap gap-2 mb-5">
              {tags.slice(0, 8).map((t) => (
                <Link key={t} to={`/browse?genre=${t}`}
                  className="tag badge bg-white/5 border border-white/10 text-text-muted hover:text-primary">
                  {t}
                </Link>
              ))}
            </div>

            <div className="flex gap-3 flex-wrap">
              {apiChapters[0] && (
                <Link to={`/read/${apiChapters[apiChapters.length - 1]?.id}`}
                  className="flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary/90 text-white text-sm font-body font-medium rounded-xl transition-all hover:shadow-[0_0_20px_rgba(232,57,77,0.4)]">
                  <BookOpen size={15} />
                  Start Reading
                </Link>
              )}
              <button onClick={() => toggleFavorite(manga.id)}
                className={`flex items-center gap-2 px-5 py-3 glass rounded-xl text-sm font-body transition-all ${
                  fav ? 'border border-primary/50 text-primary' : 'border border-white/10 text-text-muted hover:border-white/20'
                }`}>
                <Heart size={15} fill={fav ? 'currentColor' : 'none'} />
                {fav ? 'Saved' : 'Save'}
              </button>
            </div>
          </div>
        </div>

        {/* Stats bar */}
        <div className="flex gap-4 mt-6 mb-8">
          {[
            { icon: BookOpen, label: `${apiChapters.length} Chapters` },
            { icon: Calendar, label: manga.attributes.year?.toString() || 'Unknown year' },
            { icon: Tag, label: manga.attributes.contentRating },
            { icon: Star, label: 'MangaDex' },
          ].map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center gap-1.5 font-body text-xs text-text-muted">
              <Icon size={12} className="text-primary" />
              <span className="capitalize">{label}</span>
            </div>
          ))}
        </div>

        {/* Tabs + Admin button */}
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

          {/* Admin only: Add Chapter + Show Hidden buttons */}
          {isAdmin && tab === 'chapters' && (
            <div className="flex items-center gap-2 mb-3">
              {hiddenChapterIds.size > 0 && (
                <button
                  onClick={() => setShowHidden((v) => !v)}
                  className={`flex items-center gap-1.5 px-4 py-1.5 text-xs font-body rounded-xl border transition-all ${
                    showHidden
                      ? 'bg-red-500/20 border-red-500/40 text-red-400 hover:bg-red-500/30'
                      : 'bg-white/5 border-white/10 text-text-muted hover:border-white/20'
                  }`}
                >
                  {showHidden ? `Hide (${hiddenChapterIds.size} hidden)` : `Show Hidden (${hiddenChapterIds.size})`}
                </button>
              )}
              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-amber-500/20 border border-amber-500/40 text-amber-400 text-xs font-body rounded-xl hover:bg-amber-500/30 transition-all"
              >
                <Plus size={13} />
                Add Chapter
              </button>
            </div>
          )}
        </div>

        {/* Chapter list */}
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
                      className="flex-1 flex items-center justify-between glass-hover glass px-4 py-3 rounded-xl">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-body text-sm text-text group-hover:text-primary transition-colors">
                            {formatChapter(ch)}
                          </p>
                          {/* API source badge */}
                          <span className="px-1.5 py-0.5 bg-blue-500/15 border border-blue-500/30 text-blue-400 text-[10px] font-mono rounded-md">
                            API
                          </span>
                        </div>
                        <p className="font-mono text-xs text-text-muted mt-0.5">
                          {new Date(ch.attributes.publishAt).toLocaleDateString()}
                        </p>
                      </div>
                      <BookOpen size={14} className="text-text-muted group-hover:text-primary transition-colors" />
                    </Link>
                    {/* Admin: hide/restore + permanent delete buttons */}
                    {isAdmin && (
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {showHidden ? (
                          <>
                            <button
                              onClick={() => handleRestoreApi(ch.id)}
                              disabled={deletingId === ch.id}
                              className="px-2 py-1 text-xs font-body text-green-400 hover:text-green-300 transition-colors disabled:opacity-40"
                              title="Restore chapter"
                            >
                              Restore
                            </button>
                            <button
                              onClick={() => handlePermanentDelete(ch)}
                              disabled={deletingId === ch.id}
                              className="p-2 text-red-500 hover:text-red-400 transition-colors disabled:opacity-40"
                              title="Permanently delete"
                            >
                              <Trash2 size={14} />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => handleHideApi(ch)}
                              disabled={deletingId === ch.id}
                              className="p-2 text-text-muted hover:text-yellow-400 transition-colors disabled:opacity-40"
                              title="Hide chapter"
                            >
                              <X size={14} />
                            </button>
                            <button
                              onClick={() => handlePermanentDelete(ch)}
                              disabled={deletingId === ch.id}
                              className="p-2 text-text-muted hover:text-red-400 transition-colors disabled:opacity-40"
                              title="Permanently delete"
                            >
                              <Trash2 size={14} />
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )
              }

              // Manual chapter (admin sees these)
              const ch = item.data
              return (
                <div key={ch._id} className="flex items-center gap-2">
                  <Link to={`/read/manual/${ch._id}`}
                    className="flex-1 flex items-center justify-between glass px-4 py-3 rounded-xl border border-amber-500/20 hover:border-amber-500/40 transition-all group">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-body text-sm text-text group-hover:text-amber-400 transition-colors">
                          {ch.volume ? `Vol.${ch.volume} ` : ''}Ch.{ch.chapterNumber}
                          {ch.title ? ` — ${ch.title}` : ''}
                        </p>
                        <span className="px-1.5 py-0.5 bg-amber-500/15 border border-amber-500/30 text-amber-400 text-[10px] font-mono rounded-md">
                          MANUAL
                        </span>
                      </div>
                      <p className="font-mono text-xs text-text-muted mt-0.5">
                        {new Date(ch.createdAt).toLocaleDateString()} · {ch.pages.length} pages
                      </p>
                    </div>
                  </Link>
                  {/* Admin: delete button */}
                  <button
                    onClick={() => handleDeleteManual(ch._id)}
                    disabled={deletingId === ch._id}
                    className="p-2 text-text-muted hover:text-red-400 transition-colors disabled:opacity-40 flex-shrink-0"
                    title="Delete chapter"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              )
            })}
          </div>
        )}

        {/* Info tab */}
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
      </div>
    </div>
  )
}