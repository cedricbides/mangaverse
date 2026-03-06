import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Home, List, ZoomIn, ZoomOut } from 'lucide-react'
import axios from 'axios'

const MD = 'https://api.mangadex.org'

interface ChapterPages {
  baseUrl: string
  chapter: { hash: string; data: string[]; dataSaver: string[] }
}

export default function Reader() {
  const { chapterId } = useParams<{ chapterId: string }>()
  const [pages, setPages] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [mangaId, setMangaId] = useState('')
  const [zoom, setZoom] = useState(100)
  const [quality, setQuality] = useState<'data' | 'dataSaver'>('data')

  useEffect(() => {
    if (!chapterId) return
    setLoading(true)

    Promise.all([
      axios.get(`${MD}/at-home/server/${chapterId}`),
      axios.get(`${MD}/chapter/${chapterId}?includes[]=manga`)
    ]).then(([serverRes, chapterRes]) => {
      const { baseUrl, chapter }: ChapterPages = serverRes.data
      const imgs = chapter[quality].map(
        (file) => `${baseUrl}/${quality}/${chapter.hash}/${file}`
      )
      setPages(imgs)

      const mangaRel = chapterRes.data.data.relationships.find(
        (r: { type: string }) => r.type === 'manga'
      )
      if (mangaRel) setMangaId(mangaRel.id)
    }).finally(() => setLoading(false))
  }, [chapterId, quality])

  return (
    <div className="min-h-screen bg-black">
      {/* Reader toolbar */}
      <div className="sticky top-0 z-50 bg-black/90 backdrop-blur-xl border-b border-white/5 px-4 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {mangaId && (
            <Link to={`/manga/${mangaId}`}
              className="flex items-center gap-1.5 text-text-muted hover:text-white transition-colors text-sm font-body">
              <ChevronLeft size={16} />
              Back
            </Link>
          )}
          <Link to="/" className="text-text-muted hover:text-white transition-colors">
            <Home size={16} />
          </Link>
        </div>

        <div className="flex items-center gap-3">
          <span className="font-mono text-xs text-text-muted">{pages.length} pages</span>
          <button
            onClick={() => setQuality(q => q === 'data' ? 'dataSaver' : 'data')}
            className={`font-mono text-xs px-2.5 py-1 rounded-md border transition-colors ${
              quality === 'dataSaver' ? 'border-accent/50 text-accent bg-accent/10' : 'border-white/10 text-text-muted'
            }`}>
            {quality === 'dataSaver' ? 'Data Saver' : 'HQ'}
          </button>
          <button onClick={() => setZoom(z => Math.max(50, z - 10))} className="text-text-muted hover:text-white">
            <ZoomOut size={16} />
          </button>
          <span className="font-mono text-xs text-text-muted w-12 text-center">{zoom}%</span>
          <button onClick={() => setZoom(z => Math.min(200, z + 10))} className="text-text-muted hover:text-white">
            <ZoomIn size={16} />
          </button>
        </div>
      </div>

      {/* Pages */}
      <div className="flex flex-col items-center py-4 gap-1">
        {loading
          ? Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="skeleton w-full max-w-2xl bg-gray-900 rounded" style={{ height: '600px' }} />
            ))
          : pages.map((src, i) => (
              <img
                key={i}
                src={src}
                alt={`Page ${i + 1}`}
                style={{ width: `${zoom}%`, maxWidth: '900px' }}
                className="block"
                loading="lazy"
              />
            ))
        }
      </div>

      {/* Bottom nav */}
      {!loading && (
        <div className="sticky bottom-0 bg-black/90 backdrop-blur-xl border-t border-white/5 py-3 px-4 flex items-center justify-center gap-4">
          <button className="flex items-center gap-1.5 text-sm text-text-muted hover:text-white font-body transition-colors">
            <ChevronLeft size={16} /> Previous Chapter
          </button>
          {mangaId && (
            <Link to={`/manga/${mangaId}`} className="flex items-center gap-1.5 text-sm text-primary font-body">
              <List size={14} /> Chapter List
            </Link>
          )}
          <button className="flex items-center gap-1.5 text-sm text-text-muted hover:text-white font-body transition-colors">
            Next Chapter <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  )
}
