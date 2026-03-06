import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, ArrowLeft } from 'lucide-react'
import axios from 'axios'

interface ManualChapter {
  _id: string
  mangaDexId: string
  chapterNumber: string
  title?: string
  volume?: string
  pages: string[]
  language: string
  createdAt: string
}

export default function ManualReader() {
  const { chapterId } = useParams<{ chapterId: string }>()
  const [chapter, setChapter] = useState<ManualChapter | null>(null)
  const [allChapters, setAllChapters] = useState<ManualChapter[]>([])
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(true)
  const [showControls, setShowControls] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    if (!chapterId) return
    setLoading(true)
    axios.get(`/api/local-manga/manual-chapter/${chapterId}`)
      .then(res => {
        const ch: ManualChapter = res.data
        setChapter(ch)
        return axios.get(`/api/admin/mangadex/${ch.mangaDexId}/chapters`, { withCredentials: true })
      })
      .then(res => setAllChapters(res.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [chapterId])

  const currentIndex = allChapters.findIndex(c => c._id === chapterId)
  const prevChapter = currentIndex > 0 ? allChapters[currentIndex - 1] : null
  const nextChapter = currentIndex < allChapters.length - 1 ? allChapters[currentIndex + 1] : null

  const goToPage = (p: number) => {
    if (!chapter) return
    const clamped = Math.max(0, Math.min(chapter.pages.length - 1, p))
    setPage(clamped)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  if (loading) return (
    <div className="min-h-screen bg-bg flex items-center justify-center">
      <div className="skeleton w-80 h-[560px] rounded-2xl" />
    </div>
  )

  if (!chapter) return (
    <div className="min-h-screen bg-bg flex items-center justify-center">
      <p className="text-text-muted font-body">Chapter not found.</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#050508]" onClick={() => setShowControls(v => !v)}>
      {/* Top Bar */}
      <div className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${showControls ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'}`}>
        <div className="bg-gradient-to-b from-black/90 to-transparent p-4">
          <div className="max-w-3xl mx-auto flex items-center justify-between">
            <Link to={`/manga/${chapter.mangaDexId}`}
              className="flex items-center gap-2 text-white text-sm font-body hover:text-primary transition-colors">
              <ArrowLeft size={16} />
              Back to Manga
            </Link>
            <div className="text-center">
              <p className="text-white text-sm font-body">Chapter {chapter.chapterNumber}</p>
              <p className="text-white/60 text-xs">Page {page + 1} / {chapter.pages.length}</p>
            </div>
            <div className="w-24" />
          </div>
        </div>
      </div>

      {/* Page Image */}
      <div className="flex justify-center pt-0">
        <img
          src={chapter.pages[page]}
          alt={`Page ${page + 1}`}
          className="max-w-full md:max-w-2xl w-full object-contain"
          style={{ minHeight: '80vh' }}
          onError={e => { e.currentTarget.src = 'https://placehold.co/800x1200/09090f/white?text=Image+Error' }}
        />
      </div>

      {/* Bottom Controls */}
      <div className={`fixed bottom-0 left-0 right-0 z-50 transition-all duration-300 ${showControls ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'}`}>
        <div className="bg-gradient-to-t from-black/90 to-transparent p-4">
          <div className="max-w-3xl mx-auto">
            {/* Progress Bar */}
            <div className="flex items-center gap-2 mb-3">
              <span className="text-white/50 text-xs font-mono w-6">{page + 1}</span>
              <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation()
                  const rect = e.currentTarget.getBoundingClientRect()
                  const ratio = (e.clientX - rect.left) / rect.width
                  goToPage(Math.floor(ratio * chapter.pages.length))
                }}>
                <div className="h-full bg-primary transition-all duration-200 rounded-full"
                  style={{ width: `${((page + 1) / chapter.pages.length) * 100}%` }} />
              </div>
              <span className="text-white/50 text-xs font-mono w-6 text-right">{chapter.pages.length}</span>
            </div>

            {/* Nav Buttons */}
            <div className="flex items-center justify-between gap-3" onClick={e => e.stopPropagation()}>
              <button onClick={() => goToPage(page - 1)} disabled={page === 0}
                className="flex items-center gap-1.5 px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-sm font-body rounded-xl transition-colors disabled:opacity-30">
                <ChevronLeft size={16} /> Prev
              </button>
              <div className="flex gap-2">
                {prevChapter && (
                  <button onClick={() => { navigate(`/read/manual/${prevChapter._id}`); setPage(0) }}
                    className="px-3 py-2 bg-white/5 hover:bg-white/10 text-white/70 text-xs font-body rounded-xl transition-colors">
                    ← Ch.{prevChapter.chapterNumber}
                  </button>
                )}
                {nextChapter && (
                  <button onClick={() => { navigate(`/read/manual/${nextChapter._id}`); setPage(0) }}
                    className="px-3 py-2 bg-primary/20 hover:bg-primary/30 text-primary text-xs font-body rounded-xl transition-colors border border-primary/30">
                    Ch.{nextChapter.chapterNumber} →
                  </button>
                )}
              </div>
              <button onClick={() => goToPage(page + 1)} disabled={page === chapter.pages.length - 1}
                className="flex items-center gap-1.5 px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-sm font-body rounded-xl transition-colors disabled:opacity-30">
                Next <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}