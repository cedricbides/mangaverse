import { useEffect, useState, useRef } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Home, List, ZoomIn, ZoomOut, WifiOff } from 'lucide-react'
import axios from 'axios'
import { getOfflinePages } from '@/utils/offlineStorage'
import { useAuth } from '@/context/AuthContext'

const MD = 'https://api.mangadex.org'

interface ChapterPages {
  baseUrl: string
  chapter: { hash: string; data: string[]; dataSaver: string[] }
}

export default function Reader() {
  const { chapterId } = useParams<{ chapterId: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [pages, setPages] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [mangaId, setMangaId] = useState('')
  const [zoom, setZoom] = useState(100)
  const [quality, setQuality] = useState<'data' | 'dataSaver'>('data')
  const [chapterList, setChapterList] = useState<string[]>([])
  const [currentIndex, setCurrentIndex] = useState(-1)
  const [isOffline, setIsOffline] = useState(false)
  const objectUrlsRef = useRef<string[]>([])

  useEffect(() => {
    return () => { objectUrlsRef.current.forEach(url => URL.revokeObjectURL(url)) }
  }, [])

  useEffect(() => {
    if (!chapterId) return
    setLoading(true)
    setIsOffline(false)
    objectUrlsRef.current.forEach(url => URL.revokeObjectURL(url))
    objectUrlsRef.current = []

    const load = async () => {
      const offlinePages = user?.id
        ? await getOfflinePages(user.id, chapterId).catch(() => null)
        : null
      if (offlinePages && offlinePages.length > 0) {
        objectUrlsRef.current = offlinePages
        setPages(offlinePages)
        setIsOffline(true)
        setLoading(false)
        return
      }

      try {
        const [serverRes, chapterRes] = await Promise.all([
          axios.get(`${MD}/at-home/server/${chapterId}`),
          axios.get(`${MD}/chapter/${chapterId}?includes[]=manga`),
        ])
        const { baseUrl, chapter }: ChapterPages = serverRes.data
        const imgs = chapter[quality].map((file) => `${baseUrl}/${quality}/${chapter.hash}/${file}`)
        setPages(imgs)
        const mangaRel = chapterRes.data.data.relationships.find((r: { type: string }) => r.type === 'manga')
        if (mangaRel) setMangaId(mangaRel.id)
      } catch (err) {
        console.error('Failed to load chapter pages', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [chapterId, quality])

  useEffect(() => {
    if (!mangaId) return
    axios.get(`${MD}/manga/${mangaId}/feed`, {
      params: { translatedLanguage: ['en'], order: { chapter: 'asc' }, limit: 500 }
    }).then(res => {
      const ids: string[] = res.data.data.map((c: { id: string }) => c.id)
      setChapterList(ids)
      setCurrentIndex(ids.findIndex(id => id === chapterId))
    })
  }, [mangaId, chapterId])

  const prevChapterId = currentIndex > 0 ? chapterList[currentIndex - 1] : null
  const nextChapterId = currentIndex >= 0 && currentIndex < chapterList.length - 1 ? chapterList[currentIndex + 1] : null

  const goToChapter = (id: string) => { window.scrollTo(0, 0); navigate(`/read/${id}`) }

  return (
    <div className="min-h-screen bg-black">
      <div className="sticky top-0 z-50 bg-black/90 backdrop-blur-xl border-b border-white/5 px-4 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {mangaId && (
            <Link to={`/manga/${mangaId}`} className="flex items-center gap-1.5 text-text-muted hover:text-white transition-colors text-sm font-body">
              <ChevronLeft size={16} /> Back
            </Link>
          )}
          <Link to="/" className="text-text-muted hover:text-white transition-colors"><Home size={16} /></Link>
        </div>

        <div className="flex items-center gap-3">
          {isOffline && (
            <div className="flex items-center gap-1 px-2 py-1 bg-violet-500/15 border border-violet-500/30 rounded-lg">
              <WifiOff size={10} className="text-violet-400" />
              <span className="font-mono text-[10px] text-violet-300">Offline</span>
            </div>
          )}
          <span className="font-mono text-xs text-text-muted">{pages.length} pages</span>
          {!isOffline && (
            <button
              onClick={() => setQuality(q => q === 'data' ? 'dataSaver' : 'data')}
              className={`font-mono text-xs px-2.5 py-1 rounded-md border transition-colors ${quality === 'dataSaver' ? 'border-accent/50 text-accent bg-accent/10' : 'border-white/10 text-text-muted'}`}>
              {quality === 'dataSaver' ? 'Data Saver' : 'HQ'}
            </button>
          )}
          <button onClick={() => setZoom(z => Math.max(50, z - 10))} className="text-text-muted hover:text-white"><ZoomOut size={16} /></button>
          <span className="font-mono text-xs text-text-muted w-12 text-center">{zoom}%</span>
          <button onClick={() => setZoom(z => Math.min(200, z + 10))} className="text-text-muted hover:text-white"><ZoomIn size={16} /></button>
        </div>
      </div>

      <div className="flex flex-col items-center py-4 gap-1">
        {loading
          ? Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="skeleton w-full max-w-2xl bg-gray-900 rounded" style={{ height: '600px' }} />
            ))
          : pages.map((src, i) => (
              <img key={i} src={src} alt={`Page ${i + 1}`}
                style={{ width: `${zoom}%`, maxWidth: '900px' }} className="block" loading="lazy" />
            ))
        }
      </div>

      {!loading && (
        <div className="sticky bottom-0 bg-black/90 backdrop-blur-xl border-t border-white/5 py-3 px-4 flex items-center justify-center gap-4">
          <button onClick={() => prevChapterId && goToChapter(prevChapterId)} disabled={!prevChapterId}
            className={`flex items-center gap-1.5 text-sm font-body transition-colors ${prevChapterId ? 'text-text-muted hover:text-white cursor-pointer' : 'text-white/20 cursor-not-allowed'}`}>
            <ChevronLeft size={16} /> Previous Chapter
          </button>
          {mangaId && (
            <Link to={`/manga/${mangaId}`} className="flex items-center gap-1.5 text-sm text-primary font-body">
              <List size={14} /> Chapter List
            </Link>
          )}
          <button onClick={() => nextChapterId && goToChapter(nextChapterId)} disabled={!nextChapterId}
            className={`flex items-center gap-1.5 text-sm font-body transition-colors ${nextChapterId ? 'text-text-muted hover:text-white cursor-pointer' : 'text-white/20 cursor-not-allowed'}`}>
            Next Chapter <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  )
}