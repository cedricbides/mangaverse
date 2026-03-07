import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Heart, BookOpen, Star, Calendar, Tag, Plus, Trash2, X, Upload, Download } from 'lucide-react'
import axios from 'axios'
import type { Manga, Chapter } from '@/types'
import { getCoverUrl, getMangaTitle, getMangaDescription, getMangaTags, getStatusColor, formatChapter } from '@/utils/manga'
import { useAuth } from '@/context/AuthContext'
import DownloadChapterButton from '@/components/DownloadChapterButton'

const MD = '/api/mangadex'
const MDX_API = 'https://api.mangadex.org'

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

// ─── Page resolver helpers ────────────────────────────────────────────────────

function resolveApiPages(chapterId: string) {
  return async (): Promise<string[]> => {
    const res = await axios.get(`${MDX_API}/at-home/server/${chapterId}`)
    const { baseUrl, chapter } = res.data
    return chapter.data.map((file: string) => `${baseUrl}/data/${chapter.hash}/${file}`)
  }
}

function resolveManualPages(pages: string[]) {
  return async (): Promise<string[]> => pages
}

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
  const [form, setForm] = useState({ chapterNumber: '', title: '', volume: '', language: 'en', pages: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }))

  const handleSubmit = async () => {
    if (!form.chapterNumber.trim()) return setError('Chapter number is required.')
    setSaving(true)
    setError('')
    try {
      const pages = form.pages.split('\n').map((l) => l.trim()).filter(Boolean)
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
      <div className="bg-[#13131a] border border-white/10 rounded-2xl w-full max-w-lg p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display text-xl text-white tracking-wide">Add Manual Chapter</h2>
          <button onClick={onClose} className="text-text-muted hover:text-white transition-colors"><X size={18} /></button>
        </div>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-mono text-xs text-text-muted tracking-widest block mb-1">CHAPTER NO. *</label>
              <input value={form.chapterNumber} onChange={(e) => set('chapterNumber', e.target.value)}
                placeholder="e.g. 79.2"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-text font-body outline-none focus:border-primary/50" />
            </div>
            <div>
              <label className="font-mono text-xs text-text-muted tracking-widest block mb-1">VOLUME</label>
              <input value={form.volume} onChange={(e) => set('volume', e.target.value)}
                placeholder="e.g. 8"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-text font-body outline-none focus:border-primary/50" />
            </div>
          </div>
          <div>
            <label className="font-mono text-xs text-text-muted tracking-widest block mb-1">TITLE</label>
            <input value={form.title} onChange={(e) => set('title', e.target.value)}
              placeholder="Optional chapter title"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-text font-body outline-none focus:border-primary/50" />
          </div>
          <div>
            <label className="font-mono text-xs text-text-muted tracking-widest block mb-1">LANGUAGE</label>
            <select value={form.language} onChange={(e) => set('language', e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-text font-body outline-none focus:border-primary/50">
              <option value="en">English</option>
              <option value="ja">Japanese</option>
              <option value="es">Spanish</option>
              <option value="fr">French</option>
              <option value="pt-br">Portuguese (BR)</option>
              <option value="id">Indonesian</option>
            </select>
          </div>
          <div>
            <label className="font-mono text-xs text-text-muted tracking-widest block mb-1">
              PAGE URLs <span className="normal-case text-text-muted/60">(one per line)</span>
            </label>
            <textarea value={form.pages} onChange={(e) => set('pages', e.target.value)}
              placeholder={"https://cdn.example.com/page1.jpg\nhttps://cdn.example.com/page2.jpg"}
              rows={5}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-text font-body outline-none focus:border-primary/50 resize-none font-mono" />
            <p className="text-xs text-text-muted mt-1 font-body">
              {form.pages.split('\n').filter((l) => l.trim()).length} pages entered
            </p>
          </div>
          {error && <p className="text-xs text-red-400 font-body bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">{error}</p>}
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={handleSubmit} disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-primary hover:bg-primary/90 text-white text-sm font-body font-medium rounded-xl transition-all disabled:opacity-50">
            <Upload size={14} />
            {saving ? 'Saving…' : 'Add Chapter'}
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
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'chapters' | 'info'>('chapters')
  const [showAddModal, setShowAddModal] = useState(false)
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

  useEffect(() => {
    if (!id || !isAdmin) return
    axios.get(`/api/admin/mangadex/${id}/chapters`, { withCredentials: true })
      .then((res) => setManualChapters(res.data))
      .catch(() => {})
  }, [id, isAdmin])

  const handleDeleteManual = async (chapterId: string) => {
    if (!confirm('Delete this manual chapter?')) return
    setDeletingId(chapterId)
    try {
      await axios.delete(`/api/admin/mangadex/chapters/${chapterId}`, { withCredentials: true })
      setManualChapters((prev) => prev.filter((c) => c._id !== chapterId))
    } finally {
      setDeletingId(null)
    }
  }

  const mergedChapters: MergedChapter[] = [
    ...apiChapters.map((c): MergedChapter => ({ type: 'api', data: c })),
    ...(isAdmin ? manualChapters.map((c): MergedChapter => ({ type: 'manual', data: c })) : []),
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

            <div className="flex gap-3 flex-wrap items-center">
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
              <Link to="/downloads"
                className="flex items-center gap-2 px-4 py-3 glass border border-white/10 rounded-xl text-sm font-body text-text-muted hover:text-violet-400 hover:border-violet-400/30 transition-all">
                <Download size={14} />
                My Downloads
              </Link>
            </div>
          </div>
        </div>

        {/* Stats bar */}
        <div className="flex gap-4 mt-6 mb-8">
          {[
            { icon: BookOpen, label: `${mergedChapters.length} Chapters` },
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
          {isAdmin && tab === 'chapters' && (
            <button onClick={() => setShowAddModal(true)}
              className="flex items-center gap-1.5 px-4 py-1.5 mb-3 bg-amber-500/20 border border-amber-500/40 text-amber-400 text-xs font-body rounded-xl hover:bg-amber-500/30 transition-all">
              <Plus size={13} /> Add Chapter
            </button>
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
                      className="flex-1 flex items-center justify-between glass glass-hover px-4 py-3 rounded-xl">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-body text-sm text-text group-hover:text-primary transition-colors">
                            {formatChapter(ch)}
                          </p>
                          <span className="px-1.5 py-0.5 bg-blue-500/15 border border-blue-500/30 text-blue-400 text-[10px] font-mono rounded-md">API</span>
                        </div>
                        <p className="font-mono text-xs text-text-muted mt-0.5">
                          {new Date(ch.attributes.publishAt).toLocaleDateString()}
                        </p>
                      </div>
                      <BookOpen size={14} className="text-text-muted group-hover:text-primary transition-colors" />
                    </Link>
                    {/* Offline download button */}
                    <DownloadChapterButton
                      chapterId={ch.id}
                      chapterNumber={ch.attributes.chapter || '?'}
                      chapterTitle={ch.attributes.title}
                      source="api"
                      mangaId={manga.id}
                      mangaTitle={title}
                      mangaCover={cover}
                      resolvePages={resolveApiPages(ch.id)}
                      compact
                    />
                  </div>
                )
              }

              const ch = item.data
              return (
                <div key={ch._id}
                  className="flex items-center justify-between glass px-4 py-3 rounded-xl border border-amber-500/20 group">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-body text-sm text-text truncate">
                          {ch.volume ? `Vol.${ch.volume} ` : ''}Ch.{ch.chapterNumber}
                          {ch.title ? ` — ${ch.title}` : ''}
                        </p>
                        <span className="px-1.5 py-0.5 bg-amber-500/15 border border-amber-500/30 text-amber-400 text-[10px] font-mono rounded-md flex-shrink-0">MANUAL</span>
                      </div>
                      <p className="font-mono text-xs text-text-muted mt-0.5">
                        {new Date(ch.createdAt).toLocaleDateString()} · {ch.pages.length} pages
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {ch.pages.length > 0 && (
                      <DownloadChapterButton
                        chapterId={ch._id}
                        chapterNumber={ch.chapterNumber}
                        chapterTitle={ch.title}
                        source="manual"
                        mangaId={manga.id}
                        mangaTitle={title}
                        mangaCover={cover}
                        resolvePages={resolveManualPages(ch.pages)}
                        compact
                      />
                    )}
                    {isAdmin && (
                      <button
                        onClick={() => handleDeleteManual(ch._id)}
                        disabled={deletingId === ch._id}
                        className="p-2 text-text-muted hover:text-red-400 transition-colors disabled:opacity-40"
                        title="Delete chapter">
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
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