import { Link } from 'react-router-dom'
import { Heart, BookOpen } from 'lucide-react'
import { motion } from 'framer-motion'
import type { Manga } from '@/types'
import { getCoverUrl, getMangaTitle, getMangaTags, getStatusColor } from '@/utils/manga'
import { useAuth } from '@/context/AuthContext'

interface Props {
  manga: Manga
  index?: number
}

export default function MangaCard({ manga, index = 0 }: Props) {
  const { toggleFavorite, isFavorite } = useAuth()
  const title = getMangaTitle(manga)
  const tags = getMangaTags(manga)
  const cover = getCoverUrl(manga, 256)
  const fav = isFavorite(manga.id)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className="manga-card group relative"
    >
      <Link to={`/manga/${manga.id}`} className="block">
        <div className="relative overflow-hidden rounded-xl">
          <img
            src={cover}
            alt={title}
            className="manga-cover"
            loading="lazy"
            onError={(e) => {
              (e.target as HTMLImageElement).src = `https://placehold.co/256x384/111118/6b6b8a?text=${encodeURIComponent(title.slice(0, 12))}`
            }}
          />
          {/* Overlay on hover */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl flex flex-col justify-end p-3">
            <div className="flex flex-wrap gap-1 mb-2">
              {tags.slice(0, 2).map((tag) => (
                <span key={tag} className="badge bg-primary/20 text-primary border border-primary/30">{tag}</span>
              ))}
            </div>
            <div className="flex items-center gap-1 text-xs text-white/80 font-body">
              <BookOpen size={11} />
              <span>{manga.attributes.status}</span>
              <span
                className="w-1.5 h-1.5 rounded-full ml-1"
                style={{ background: getStatusColor(manga.attributes.status) }}
              />
            </div>
          </div>

          {/* Favorite button */}
          <button
            onClick={(e) => { e.preventDefault(); toggleFavorite(manga.id) }}
            className={`absolute top-2 right-2 p-1.5 rounded-lg transition-all duration-200 ${
              fav ? 'bg-primary text-white' : 'bg-black/50 text-white/60 opacity-0 group-hover:opacity-100'
            }`}
          >
            <Heart size={13} fill={fav ? 'currentColor' : 'none'} />
          </button>
        </div>

        <div className="mt-2.5 px-0.5">
          <p className="font-body text-sm text-text font-medium line-clamp-2 leading-snug">{title}</p>
          {manga.attributes.year && (
            <p className="font-mono text-xs text-text-muted mt-0.5">{manga.attributes.year}</p>
          )}
        </div>
      </Link>
    </motion.div>
  )
}
