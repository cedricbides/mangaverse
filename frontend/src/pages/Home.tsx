import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { TrendingUp, Clock, ArrowRight, Flame } from 'lucide-react'
import axios from 'axios'
import type { Manga } from '@/types'
import { getCoverUrl, getMangaTitle, getMangaTags, getMangaDescription } from '@/utils/manga'
import MangaCard from '@/components/MangaCard'
import { GridSkeleton } from '@/components/Skeleton'
import { useAuth } from '@/context/AuthContext'
import { motion } from 'framer-motion'

const MD = 'https://api.mangadex.org'
const COVER_INCLUDES = 'includes[]=cover_art&includes[]=author'

async function fetchManga(params: string): Promise<Manga[]> {
  const res = await axios.get(`${MD}/manga?${params}&${COVER_INCLUDES}`)
  return res.data.data
}

export default function Home() {
  const [featured, setFeatured] = useState<Manga | null>(null)
  const [trending, setTrending] = useState<Manga[]>([])
  const [latest, setLatest] = useState<Manga[]>([])
  const [loadingTrending, setLoadingTrending] = useState(true)
  const [loadingLatest, setLoadingLatest] = useState(true)
  const { user } = useAuth()

  useEffect(() => {
    fetchManga('limit=13&order[followedCount]=desc&contentRating[]=safe&hasAvailableChapters=true')
      .then((data) => { setFeatured(data[0]); setTrending(data.slice(1, 13)) })
      .finally(() => setLoadingTrending(false))

    fetchManga('limit=12&order[latestUploadedChapter]=desc&contentRating[]=safe&hasAvailableChapters=true')
      .then(setLatest)
      .finally(() => setLoadingLatest(false))
  }, [])

  const featuredCover = featured ? getCoverUrl(featured, 512) : ''
  const featuredTitle = featured ? getMangaTitle(featured) : ''
  const featuredDesc = featured ? getMangaDescription(featured) : ''
  const featuredTags = featured ? getMangaTags(featured) : []

  return (
    <div>
      {/* HERO */}
      <section className="relative min-h-[90vh] flex items-end pb-16 overflow-hidden">
        {featured && (
          <>
            <div className="absolute inset-0 bg-cover bg-center scale-105"
              style={{ backgroundImage: `url(${featuredCover})`, filter: 'blur(40px) brightness(0.15)', transform: 'scale(1.1)' }} />
            <div className="absolute inset-0 bg-gradient-to-t from-[#09090f] via-[#09090f]/70 to-[#09090f]/30" />
          </>
        )}
        <div className="relative z-10 max-w-7xl mx-auto px-5 w-full">
          <div className="flex flex-col md:flex-row gap-8 items-end">
            {featured && (
              <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6 }} className="flex-shrink-0">
                <Link to={`/manga/${featured.id}`}>
                  <img src={featuredCover} alt={featuredTitle}
                    className="w-40 md:w-56 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.7)] hover:scale-105 transition-transform duration-300"
                    style={{ aspectRatio: '2/3', objectFit: 'cover' }} />
                </Link>
              </motion.div>
            )}
            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.15 }} className="flex-1">
              <div className="flex items-center gap-2 mb-3">
                <Flame size={14} className="text-primary" />
                <span className="font-mono text-xs text-primary tracking-widest uppercase">Featured Manga</span>
              </div>
              <h1 className="font-display text-5xl md:text-7xl text-white mb-3 leading-none tracking-wide">{featuredTitle}</h1>
              <div className="flex flex-wrap gap-2 mb-4">
                {featuredTags.map((t) => <span key={t} className="badge bg-white/10 text-text-muted border border-white/10">{t}</span>)}
              </div>
              <p className="font-body text-text-muted text-sm leading-relaxed max-w-xl mb-6 line-clamp-3">{featuredDesc}</p>
              <div className="flex gap-3 flex-wrap">
                {featured && (
                  <Link to={`/manga/${featured.id}`}
                    className="px-6 py-3 bg-primary hover:bg-primary/90 text-white font-body font-medium text-sm rounded-xl transition-all hover:shadow-[0_0_24px_rgba(232,57,77,0.5)]">
                    Read Now →
                  </Link>
                )}
                {!user && (
                  <Link to="/login"
                    className="px-6 py-3 glass border border-white/10 text-text font-body text-sm rounded-xl hover:border-primary/40 transition-all">
                    Sign in to Save
                  </Link>
                )}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* TRENDING */}
      <section className="max-w-7xl mx-auto px-5 py-12">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <TrendingUp size={18} className="text-primary" />
            <h2 className="font-display text-3xl tracking-wide text-white">TRENDING</h2>
          </div>
          <Link to="/trending" className="flex items-center gap-1 text-sm text-text-muted hover:text-primary transition-colors font-body">
            View all <ArrowRight size={14} />
          </Link>
        </div>
        {loadingTrending ? <GridSkeleton count={12} /> :
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {trending.map((m, i) => <MangaCard key={m.id} manga={m} index={i} />)}
          </div>}
      </section>

      {/* LATEST UPDATES */}
      <section className="max-w-7xl mx-auto px-5 py-12">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Clock size={18} className="text-accent" />
            <h2 className="font-display text-3xl tracking-wide text-white">LATEST UPDATES</h2>
          </div>
          <Link to="/browse?sort=latest" className="flex items-center gap-1 text-sm text-text-muted hover:text-accent transition-colors font-body">
            View all <ArrowRight size={14} />
          </Link>
        </div>
        {loadingLatest ? <GridSkeleton count={12} /> :
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {latest.map((m, i) => <MangaCard key={m.id} manga={m} index={i} />)}
          </div>}
      </section>
    </div>
  )
}
