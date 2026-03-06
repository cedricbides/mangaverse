import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Heart, BookOpen, Star, Calendar, Tag } from 'lucide-react'
import axios from 'axios'
import type { Manga, Chapter } from '@/types'
import { getCoverUrl, getMangaTitle, getMangaDescription, getMangaTags, getStatusColor, formatChapter } from '@/utils/manga'
import { useAuth } from '@/context/AuthContext'

const MD = 'https://api.mangadex.org'

export default function MangaDetail() {
  const { id } = useParams<{ id: string }>()
  const [manga, setManga] = useState<Manga | null>(null)
  const [chapters, setChapters] = useState<Chapter[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'chapters' | 'info'>('chapters')
  const { toggleFavorite, isFavorite } = useAuth()

  useEffect(() => {
    if (!id) return
    setLoading(true)
    Promise.all([
      axios.get(`${MD}/manga/${id}?includes[]=cover_art&includes[]=author&includes[]=artist`),
      axios.get(`${MD}/manga/${id}/feed?limit=96&translatedLanguage[]=en&order[chapter]=desc&includeEmptyPages=0`)
    ]).then(([mangaRes, chaptersRes]) => {
      setManga(mangaRes.data.data)
      setChapters(chaptersRes.data.data)
    }).finally(() => setLoading(false))
  }, [id])

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
  const tags = manga.attributes.tags.map(t => t.attributes.name.en)
  const cover = getCoverUrl(manga, 512)
  const fav = isFavorite(manga.id)
  const status = manga.attributes.status
  const authors = manga.relationships.filter(r => r.type === 'author').map(r => (r.attributes as { name?: string })?.name).filter(Boolean)

  return (
    <div>
      {/* Blurred header background */}
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

            {/* Tags */}
            <div className="flex flex-wrap gap-2 mb-5">
              {tags.slice(0, 8).map((t) => (
                <Link key={t} to={`/browse?genre=${t}`}
                  className="tag badge bg-white/5 border border-white/10 text-text-muted hover:text-primary">
                  {t}
                </Link>
              ))}
            </div>

            {/* Actions */}
            <div className="flex gap-3 flex-wrap">
              {chapters[0] && (
                <Link to={`/read/${chapters[chapters.length - 1]?.id}`}
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
            { icon: BookOpen, label: `${chapters.length} Chapters` },
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

        {/* Tabs */}
        <div className="flex gap-4 border-b border-white/5 mb-6">
          {(['chapters', 'info'] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`pb-3 font-body text-sm capitalize transition-colors border-b-2 -mb-px ${
                tab === t ? 'border-primary text-primary' : 'border-transparent text-text-muted hover:text-text'
              }`}>
              {t}
            </button>
          ))}
        </div>

        {/* Chapter list */}
        {tab === 'chapters' && (
          <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
            {chapters.length === 0 && (
              <p className="text-text-muted font-body text-sm text-center py-12">No English chapters available.</p>
            )}
            {chapters.map((ch) => (
              <Link key={ch.id} to={`/read/${ch.id}`}
                className="flex items-center justify-between glass-hover glass px-4 py-3 rounded-xl group">
                <div>
                  <p className="font-body text-sm text-text group-hover:text-primary transition-colors">{formatChapter(ch)}</p>
                  <p className="font-mono text-xs text-text-muted mt-0.5">
                    {new Date(ch.attributes.publishAt).toLocaleDateString()}
                  </p>
                </div>
                <BookOpen size={14} className="text-text-muted group-hover:text-primary transition-colors" />
              </Link>
            ))}
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
