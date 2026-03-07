import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Download, Trash2, BookOpen, ChevronRight, HardDrive } from 'lucide-react'
import { getDownloads, type DownloadRecord } from '@/components/DownloadChapterButton'

export default function Downloads() {
  const [downloads, setDownloads] = useState<DownloadRecord[]>([])

  useEffect(() => {
    setDownloads(getDownloads())
  }, [])

  const remove = (id: string) => {
    const updated = downloads.filter(d => d.id !== id)
    localStorage.setItem('mv_downloads', JSON.stringify(updated))
    setDownloads(updated)
  }

  const clearAll = () => {
    if (!confirm('Clear all download history?')) return
    localStorage.removeItem('mv_downloads')
    setDownloads([])
  }

  // Group by manga
  const grouped = downloads.reduce<Record<string, DownloadRecord[]>>((acc, d) => {
    const key = d.mangaTitle || d.mangaId || 'Unknown'
    if (!acc[key]) acc[key] = []
    acc[key].push(d)
    return acc
  }, {})

  return (
    <div className="max-w-4xl mx-auto px-5 pt-28 pb-16">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center">
            <Download size={18} className="text-blue-400" />
          </div>
          <div>
            <h1 className="font-display text-3xl text-white tracking-wide">DOWNLOADS</h1>
            <p className="text-text-muted text-xs font-body">{downloads.length} chapter{downloads.length !== 1 ? 's' : ''} downloaded</p>
          </div>
        </div>
        {downloads.length > 0 && (
          <button onClick={clearAll}
            className="flex items-center gap-2 px-4 py-2 glass border border-white/10 rounded-xl text-sm font-body text-text-muted hover:text-red-400 hover:border-red-400/30 transition-all">
            <Trash2 size={14} /> Clear History
          </button>
        )}
      </div>

      {/* Note */}
      <div className="glass rounded-2xl px-5 py-3.5 mb-6 border border-blue-500/20 flex items-start gap-3">
        <HardDrive size={16} className="text-blue-400 shrink-0 mt-0.5" />
        <p className="text-xs text-text-muted font-body leading-relaxed">
          Downloads are saved to your <span className="text-text">device's Downloads folder</span> as ZIP files.
          This page tracks your download history — the actual files are on your device.
        </p>
      </div>

      {downloads.length === 0 ? (
        <div className="text-center py-24 glass rounded-2xl border border-white/5">
          <Download size={48} className="text-text-muted mx-auto mb-4 opacity-20" />
          <p className="font-body text-text-muted mb-2">No downloads yet</p>
          <p className="text-sm text-text-muted/60 font-body mb-6">Hit the ⬇ button on any chapter to download it as a ZIP</p>
          <Link to="/browse" className="px-5 py-2.5 bg-primary text-white font-body text-sm rounded-xl hover:bg-primary/90 transition-all">
            Browse Manga
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {Object.entries(grouped).map(([title, chapters]) => {
            const first = chapters[0]
            return (
              <div key={title} className="glass rounded-2xl overflow-hidden border border-white/5">
                {/* Manga header row */}
                <div className="flex items-center gap-4 px-5 py-4 border-b border-white/5 bg-white/[0.02]">
                  {first.mangaCover ? (
                    <img src={first.mangaCover} alt={title}
                      className="w-10 h-14 object-cover rounded-lg flex-shrink-0"
                      onError={e => (e.currentTarget.style.display = 'none')} />
                  ) : (
                    <div className="w-10 h-14 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0">
                      <BookOpen size={16} className="text-text-muted" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-body text-text font-semibold line-clamp-1">{title}</p>
                    <p className="text-xs text-text-muted font-body mt-0.5">{chapters.length} chapter{chapters.length !== 1 ? 's' : ''} downloaded</p>
                  </div>
                  {first.mangaId && (
                    <Link to={`/manga/${first.mangaId}`}
                      className="flex items-center gap-1 text-xs text-text-muted hover:text-primary font-body transition-colors shrink-0">
                      View <ChevronRight size={12} />
                    </Link>
                  )}
                </div>

                {/* Chapter rows */}
                <div className="divide-y divide-white/5">
                  {chapters.map(d => (
                    <div key={d.id} className="flex items-center gap-3 px-5 py-3">
                      <Download size={13} className="text-text-muted/50 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-text font-body line-clamp-1">
                          Ch.{d.chapterNumber}
                          {d.chapterLabel.includes(' — ') && (
                            <span className="text-text-muted"> — {d.chapterLabel.split(' — ').slice(1).join(' — ')}</span>
                          )}
                        </p>
                        <p className="text-xs text-text-muted font-body mt-0.5">
                          {d.pageCount} pages · {new Date(d.downloadedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <button onClick={() => remove(d.id)}
                        className="p-1.5 text-text-muted hover:text-red-400 transition-colors shrink-0"
                        title="Remove from history">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}