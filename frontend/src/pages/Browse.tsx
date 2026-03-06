import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Search, SlidersHorizontal, X } from 'lucide-react'
import axios from 'axios'
import type { Manga } from '@/types'
import MangaCard from '@/components/MangaCard'
import { GridSkeleton } from '@/components/Skeleton'

const MD = 'https://api.mangadex.org'
const GENRES = ['Action','Adventure','Comedy','Drama','Fantasy','Horror','Mystery','Romance','Sci-Fi','Slice of Life','Sports','Thriller','Psychological','Historical']
const STATUSES = ['ongoing', 'completed', 'hiatus', 'cancelled']

export default function Browse() {
  const [params, setParams] = useSearchParams()
  const [manga, setManga] = useState<Manga[]>([])
  const [loading, setLoading] = useState(false)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [showFilters, setShowFilters] = useState(false)

  const query = params.get('q') || ''
  const genre = params.get('genre') || ''
  const status = params.get('status') || ''
  const sort = params.get('sort') || 'popular'

  useEffect(() => {
    setLoading(true)
    setPage(0)
    const qp = new URLSearchParams()
    qp.set('limit', '24')
    qp.set('offset', '0')
    qp.set('includes[]', 'cover_art')
    qp.set('contentRating[]', 'safe')
    qp.set('hasAvailableChapters', 'true')
    if (query) qp.set('title', query)
    if (status) qp.set('status[]', status)
    if (genre) qp.set('includedTags[]', genre)
    if (sort === 'latest') qp.set('order[latestUploadedChapter]', 'desc')
    else if (sort === 'newest') qp.set('order[createdAt]', 'desc')
    else qp.set('order[followedCount]', 'desc')

    axios.get(`${MD}/manga?${qp}`)
      .then((res) => { setManga(res.data.data); setTotal(res.data.total) })
      .finally(() => setLoading(false))
  }, [query, genre, status, sort])

  const setParam = (key: string, val: string) => {
    const next = new URLSearchParams(params)
    if (val) next.set(key, val); else next.delete(key)
    setParams(next)
  }

  return (
    <div className="max-w-7xl mx-auto px-5 pt-28 pb-16">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-display text-4xl text-white tracking-wide mb-2">BROWSE MANGA</h1>
        <p className="font-body text-text-muted text-sm">{total.toLocaleString()} titles found</p>
      </div>

      {/* Search + Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="flex-1 flex items-center gap-2 glass rounded-xl px-4 py-2.5">
          <Search size={15} className="text-text-muted flex-shrink-0" />
          <input
            value={query}
            onChange={(e) => setParam('q', e.target.value)}
            placeholder="Search by title..."
            className="bg-transparent text-sm text-text placeholder-text-muted outline-none flex-1 font-body"
          />
          {query && <button onClick={() => setParam('q', '')}><X size={14} className="text-text-muted" /></button>}
        </div>
        <button onClick={() => setShowFilters(v => !v)}
          className={`flex items-center gap-2 px-4 py-2.5 glass rounded-xl text-sm font-body transition-colors ${showFilters ? 'text-primary border-primary/40' : 'text-text-muted'}`}>
          <SlidersHorizontal size={15} />
          Filters
        </button>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div className="glass rounded-2xl p-5 mb-6">
          <div className="grid sm:grid-cols-3 gap-5">
            {/* Sort */}
            <div>
              <p className="font-mono text-xs text-text-muted mb-2 tracking-widest">SORT BY</p>
              <div className="flex flex-wrap gap-2">
                {[['popular','Popular'],['latest','Latest'],['newest','Newest']].map(([v,l]) => (
                  <button key={v} onClick={() => setParam('sort', v)}
                    className={`badge border transition-colors ${sort === v ? 'bg-primary/20 border-primary/50 text-primary' : 'bg-white/5 border-white/10 text-text-muted hover:text-text'}`}>
                    {l}
                  </button>
                ))}
              </div>
            </div>
            {/* Status */}
            <div>
              <p className="font-mono text-xs text-text-muted mb-2 tracking-widest">STATUS</p>
              <div className="flex flex-wrap gap-2">
                {STATUSES.map((s) => (
                  <button key={s} onClick={() => setParam('status', status === s ? '' : s)}
                    className={`badge border transition-colors capitalize ${status === s ? 'bg-primary/20 border-primary/50 text-primary' : 'bg-white/5 border-white/10 text-text-muted hover:text-text'}`}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
            {/* Genres */}
            <div>
              <p className="font-mono text-xs text-text-muted mb-2 tracking-widest">GENRE</p>
              <div className="flex flex-wrap gap-2">
                {GENRES.map((g) => (
                  <button key={g} onClick={() => setParam('genre', genre === g ? '' : g)}
                    className={`badge border transition-colors ${genre === g ? 'bg-accent/20 border-accent/50 text-accent' : 'bg-white/5 border-white/10 text-text-muted hover:text-text'}`}>
                    {g}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Results */}
      {loading
        ? <GridSkeleton count={24} />
        : <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {manga.map((m, i) => <MangaCard key={m.id} manga={m} index={i} />)}
            </div>
            {manga.length === 0 && (
              <div className="text-center py-24">
                <p className="font-body text-text-muted text-lg">No manga found.</p>
                <button onClick={() => setParams({})} className="mt-4 text-primary text-sm hover:underline">Clear filters</button>
              </div>
            )}
          </>
      }
    </div>
  )
}
