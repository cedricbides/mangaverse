import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Home, List, Settings } from 'lucide-react'
import axios from 'axios'
import { useReaderSettings, saveProgress, loadProgress, BG_CLASSES } from '../hooks/useReaderSettings'
import ChapterComments from '../components/ChapterComments'
import ReaderSettingsPanel from '../components/ReaderSettingsPanel'

interface ChapterPages {
  baseUrl: string
  chapter: { hash: string; data: string[]; dataSaver: string[] }
}

export default function Reader() {
  const { chapterId } = useParams<{ chapterId: string }>()
  const navigate = useNavigate()
  const { settings, update } = useReaderSettings()
  const [showSettings, setShowSettings] = useState(false)

  const [pages, setPages] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [mangaId, setMangaId] = useState('')
  const [quality, setQuality] = useState<'data' | 'dataSaver'>('data')
  const [chapterList, setChapterList] = useState<string[]>([])
  const [currentIndex, setCurrentIndex] = useState(-1)

  // Single-page mode state
  const [page, setPage] = useState(0)

  // Load pages
  useEffect(() => {
    if (!chapterId) return
    setLoading(true)
    const savedPage = loadProgress(chapterId)

    Promise.all([
      axios.get(`https://api.mangadex.org/at-home/server/${chapterId}`),
      axios.get(`https://api.mangadex.org/chapter/${chapterId}?includes[]=manga`)
    ]).then(([serverRes, chapterRes]) => {
      const { baseUrl, chapter }: ChapterPages = serverRes.data
      const imgs = chapter[quality].map(f => `${baseUrl}/${quality}/${chapter.hash}/${f}`)
      setPages(imgs)
      setPage(Math.min(savedPage, imgs.length - 1))

      const mangaRel = chapterRes.data.data.relationships.find((r: { type: string }) => r.type === 'manga')
      if (mangaRel) setMangaId(mangaRel.id)
    }).finally(() => setLoading(false))
  }, [chapterId, quality])

  // Fetch chapter list for prev/next
  useEffect(() => {
    if (!mangaId) return
    axios.get(`https://api.mangadex.org/manga/${mangaId}/feed`, {
      params: { translatedLanguage: ['en'], order: { chapter: 'asc' }, limit: 500 }
    }).then(res => {
      const ids: string[] = res.data.data.map((c: { id: string }) => c.id)
      setChapterList(ids)
      setCurrentIndex(ids.findIndex(id => id === chapterId))
    })
  }, [mangaId, chapterId])

  const prevChapterId = currentIndex > 0 ? chapterList[currentIndex - 1] : null
  const nextChapterId = currentIndex >= 0 && currentIndex < chapterList.length - 1 ? chapterList[currentIndex + 1] : null

  const goToChapter = (id: string) => {
    window.scrollTo(0, 0)
    navigate(`/read/${id}`)
  }

  const goToPage = useCallback((p: number) => {
    if (!pages.length) return
    const clamped = Math.max(0, Math.min(pages.length - 1, p))
    setPage(clamped)
    saveProgress(chapterId!, clamped)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [pages.length, chapterId])

  // Save progress on scroll (webtoon mode)
  const scrollSaveRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const handleWebtoonScroll = useCallback(() => {
    if (scrollSaveRef.current) clearTimeout(scrollSaveRef.current)
    scrollSaveRef.current = setTimeout(() => {
      if (chapterId) saveProgress(chapterId, 0)
    }, 500)
  }, [chapterId])

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (settings.layout === 'single') {
        if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
          settings.direction === 'rtl' ? goToPage(page - 1) : goToPage(page + 1)
        }
        if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
          settings.direction === 'rtl' ? goToPage(page + 1) : goToPage(page - 1)
        }
      }
      if (e.key === 'Escape') setShowSettings(false)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [page, goToPage, settings.layout, settings.direction])

  const bgClass = BG_CLASSES[settings.bg]
  const isLight = settings.bg === 'white'

  return (
    <div className={`min-h-screen ${bgClass}`} onScroll={settings.layout === 'webtoon' ? handleWebtoonScroll : undefined}>

      {/* Toolbar */}
      <div className={`sticky top-0 z-50 backdrop-blur-xl border-b px-4 py-3 flex items-center justify-between gap-4 ${isLight ? 'bg-white/90 border-black/10' : 'bg-black/90 border-white/5'}`}>
        <div className="flex items-center gap-3">
          {mangaId && (
            <Link to={`/manga/${mangaId}`} className={`flex items-center gap-1.5 text-sm font-body transition-colors ${isLight ? 'text-gray-500 hover:text-black' : 'text-text-muted hover:text-white'}`}>
              <ChevronLeft size={16} /> Back
            </Link>
          )}
          <Link to="/" className={`transition-colors ${isLight ? 'text-gray-400 hover:text-black' : 'text-text-muted hover:text-white'}`}>
            <Home size={16} />
          </Link>
        </div>

        <div className="flex items-center gap-3">
          {settings.layout === 'single' && !loading && (
            <span className={`font-mono text-xs ${isLight ? 'text-gray-500' : 'text-text-muted'}`}>
              {page + 1} / {pages.length}
            </span>
          )}
          <button onClick={() => setQuality(q => q === 'data' ? 'dataSaver' : 'data')}
            className={`font-mono text-xs px-2.5 py-1 rounded-md border transition-colors ${
              quality === 'dataSaver'
                ? 'border-accent/50 text-accent bg-accent/10'
                : isLight ? 'border-black/10 text-gray-500' : 'border-white/10 text-text-muted'
            }`}>
            {quality === 'dataSaver' ? 'Data Saver' : 'HQ'}
          </button>
          <div className="relative">
            <button onClick={() => setShowSettings(v => !v)}
              className={`p-1.5 rounded-lg transition-colors ${showSettings ? 'text-primary bg-primary/10' : isLight ? 'text-gray-400 hover:text-black' : 'text-text-muted hover:text-white'}`}>
              <Settings size={16} />
            </button>
            {showSettings && <ReaderSettingsPanel settings={settings} update={update} onClose={() => setShowSettings(false)} />}
          </div>
        </div>
      </div>

      {/* ── WEBTOON MODE: all pages scrolling ── */}
      {settings.layout === 'webtoon' && (
        <div className="flex flex-col items-center py-4 gap-1">
          {loading
            ? Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="skeleton w-full max-w-2xl bg-gray-900 rounded" style={{ height: '600px' }} />
              ))
            : pages.map((src, i) => (
                <img key={i} src={src} alt={`Page ${i + 1}`}
                  className="block w-full max-w-3xl"
                  loading="lazy" />
              ))
          }
          {!loading && chapterId && (
            <ChapterComments chapterId={chapterId} mangaId={mangaId} />
          )}
          {!loading && (
            <div className="flex gap-4 mt-6 mb-4">
              <button onClick={() => prevChapterId && goToChapter(prevChapterId)} disabled={!prevChapterId}
                className={`flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-body transition-colors ${isLight ? 'bg-black/10 hover:bg-black/20 text-black disabled:opacity-30' : 'bg-white/10 hover:bg-white/20 text-white disabled:opacity-20'}`}>
                <ChevronLeft size={16} /> Prev Chapter
              </button>
              {mangaId && (
                <Link to={`/manga/${mangaId}`} className="flex items-center gap-1.5 px-4 py-2.5 text-sm text-primary font-body">
                  <List size={14} /> Chapter List
                </Link>
              )}
              <button onClick={() => nextChapterId && goToChapter(nextChapterId)} disabled={!nextChapterId}
                className={`flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-body transition-colors ${isLight ? 'bg-black/10 hover:bg-black/20 text-black disabled:opacity-30' : 'bg-white/10 hover:bg-white/20 text-white disabled:opacity-20'}`}>
                Next Chapter <ChevronRight size={16} />
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── SINGLE PAGE MODE ── */}
      {settings.layout === 'single' && (
        <>
          {!loading && chapterId && (
            <div className="max-w-3xl mx-auto w-full px-4 pb-2">
              <ChapterComments chapterId={chapterId} mangaId={mangaId} />
            </div>
          )}
          <div className="flex justify-center items-start min-h-[calc(100vh-112px)] py-4 px-2 cursor-pointer"
            onClick={(e) => {
              const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
              const mid = rect.left + rect.width / 2
              if (settings.direction === 'rtl') {
                e.clientX < mid ? goToPage(page + 1) : goToPage(page - 1)
              } else {
                e.clientX > mid ? goToPage(page + 1) : goToPage(page - 1)
              }
            }}>
            {loading ? (
              <div className="skeleton w-full max-w-2xl bg-gray-900 rounded" style={{ height: '80vh' }} />
            ) : pages[page] ? (
              <img src={pages[page]} alt={`Page ${page + 1}`}
                className={`block object-contain ${
                  settings.fit === 'width' ? 'w-full max-w-3xl' :
                  settings.fit === 'height' ? 'h-[calc(100vh-120px)] w-auto' :
                  'max-w-full'
                }`}
                loading="eager" />
            ) : null}
          </div>

          {/* Progress bar + nav */}
          {!loading && (
            <div className={`sticky bottom-0 backdrop-blur-xl border-t py-3 px-4 ${isLight ? 'bg-white/90 border-black/10' : 'bg-black/90 border-white/5'}`}>
              {/* Progress bar */}
              <div className="flex items-center gap-2 mb-3 max-w-3xl mx-auto">
                <span className={`font-mono text-xs w-6 ${isLight ? 'text-gray-400' : 'text-white/50'}`}>{page + 1}</span>
                <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden cursor-pointer"
                  onClick={e => {
                    const rect = e.currentTarget.getBoundingClientRect()
                    goToPage(Math.floor(((e.clientX - rect.left) / rect.width) * pages.length))
                  }}>
                  <div className="h-full bg-primary rounded-full transition-all duration-200"
                    style={{ width: `${pages.length ? ((page + 1) / pages.length) * 100 : 0}%` }} />
                </div>
                <span className={`font-mono text-xs w-6 text-right ${isLight ? 'text-gray-400' : 'text-white/50'}`}>{pages.length}</span>
              </div>

              <div className="flex items-center justify-between max-w-3xl mx-auto gap-3">
                {(settings.direction === 'rtl' ? page < pages.length - 1 : page > 0) ? (
                  <button onClick={() => settings.direction === 'rtl' ? goToPage(page + 1) : goToPage(page - 1)}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-body transition-colors ${isLight ? 'bg-black/10 hover:bg-black/20 text-black' : 'bg-white/10 hover:bg-white/20 text-white'}`}>
                    <ChevronLeft size={16} /> {settings.direction === 'rtl' ? 'Next' : 'Prev'}
                  </button>
                ) : prevChapterId ? (
                  <button onClick={() => goToChapter(prevChapterId)}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-body transition-colors ${isLight ? 'bg-black/5 hover:bg-black/10 text-gray-600' : 'bg-white/5 hover:bg-white/10 text-white/70'}`}>
                    <ChevronLeft size={16} /> Prev Ch.
                  </button>
                ) : <div className="w-28" />}

                {mangaId && (
                  <Link to={`/manga/${mangaId}`} className="flex items-center gap-1 px-3 py-2 text-xs text-primary font-body">
                    <List size={12} />
                  </Link>
                )}

                {(settings.direction === 'rtl' ? page > 0 : page < pages.length - 1) ? (
                  <button onClick={() => settings.direction === 'rtl' ? goToPage(page - 1) : goToPage(page + 1)}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-body transition-colors ${isLight ? 'bg-black/10 hover:bg-black/20 text-black' : 'bg-white/10 hover:bg-white/20 text-white'}`}>
                    {settings.direction === 'rtl' ? 'Prev' : 'Next'} <ChevronRight size={16} />
                  </button>
                ) : nextChapterId ? (
                  <button onClick={() => goToChapter(nextChapterId)}
                    className="flex items-center gap-1.5 px-4 py-2 bg-primary/20 hover:bg-primary/30 text-primary rounded-xl text-sm font-body border border-primary/30">
                    Next Ch. <ChevronRight size={16} />
                  </button>
                ) : <div className="w-28" />}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}