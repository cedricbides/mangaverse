import { Router, Request, Response } from 'express'
import axios from 'axios'
import LocalManga from '../models/LocalManga'
import LocalChapter from '../models/LocalChapter'
import MangaDexManualChapter from '../models/MangaDexManualChapter'
import HiddenChapter from '../models/HiddenChapter'
import DeletedChapter from '../models/DeletedChapter'
import User, { IUser } from '../models/User'
import TrackedMangaDex from '../models/TrackedMangaDex'
import { requireAdmin } from '../middleware/auth'

// ─── Scrape chapter images from an external URL ────────────────────────────

const router = Router()
router.use(requireAdmin)

// Best-effort scraper — extracts img URLs from a chapter page's HTML.
// Won't work on JS-rendered or DRM-protected sites.
router.post('/scrape-chapter-url', async (req: Request, res: Response) => {
  const { url } = req.body
  if (!url) return res.status(400).json({ error: 'url required' })
  try {
    const { data: html } = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Referer': new URL(url).origin,
      },
      timeout: 15000,
    })
    const found = new Set<string>()
    let match: RegExpExecArray | null
    const imgRegex = /<img[^>]+(?:src|data-src|data-lazy-src|data-original)=["']([^"']+)["'][^>]*>/gi
    while ((match = imgRegex.exec(html)) !== null) {
      const src = match[1].trim()
      if (!src || src.startsWith('data:') || src.length < 10) continue
      const isImage = /\.(jpg|jpeg|png|webp|gif|avif)(\?|$)/i.test(src)
      const isCDN = /cdn|image|img|upload|chapter|page|read/i.test(src)
      if (isImage || isCDN) {
        try { found.add(new URL(src, url).href) } catch { found.add(src) }
      }
    }
    const jsonImgRegex = /"(?:src|url|image|page)"\s*:\s*"(https?:\/\/[^"]+\.(?:jpg|jpeg|png|webp|gif|avif)[^"]*)"/gi
    while ((match = jsonImgRegex.exec(html)) !== null) {
      try { found.add(new URL(match[1]).href) } catch {}
    }
    const pages = Array.from(found)
    res.json({
      pages,
      note: pages.length === 0
        ? 'No images found — this site likely uses JavaScript rendering or DRM. Paste image URLs manually.'
        : `Found ${pages.length} image(s). Review before saving — some may be ads or UI elements.`
    })
  } catch (err: any) {
    const status = err.response?.status
    res.status(502).json({
      error: status === 403 ? 'Site blocked the request (403). Paste image URLs manually.'
        : status === 404 ? 'Chapter URL not found (404).'
        : `Could not fetch URL: ${err.message}`,
      pages: []
    })
  }
})

// ─── LOCAL MANGA ─────────────────────────────────────────────────────────────
router.get('/manga', async (_req, res) => {
  const list = await LocalManga.find().sort({ createdAt: -1 })
  res.json(list)
})

// Returns manga list with per-manga chapter counts (published + draft)
router.get('/manga-with-counts', async (_req, res) => {
  try {
    const manga = await LocalManga.find().sort({ createdAt: -1 }).lean()
    const counts = await LocalChapter.aggregate([
      { $group: {
        _id: '$mangaId',
        total: { $sum: 1 },
        published: { $sum: { $cond: [{ $ne: ['$draft', true] }, 1, 0] } },
        drafts: { $sum: { $cond: ['$draft', 1, 0] } },
        lastUpdated: { $max: '$createdAt' },
      }}
    ])
    const countMap = new Map(counts.map(c => [c._id.toString(), c]))
    const result = manga.map(m => ({
      ...m,
      chapterCounts: countMap.get(m._id.toString()) || { total: 0, published: 0, drafts: 0, lastUpdated: null }
    }))
    res.json(result)
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})


router.post('/manga', async (req: Request, res: Response) => {
  try {
    const { title, altTitle, coverUrl, description, genres, status, author, artist, year, featured } = req.body
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + Date.now()
    const manga = await LocalManga.create({ title, altTitle, coverUrl, description, genres, status, author, artist, year, slug, featured: !!featured })
    res.status(201).json(manga)
  } catch (err: any) {
    res.status(400).json({ error: err.message })
  }
})

router.put('/manga/:id', async (req: Request, res: Response) => {
  const manga = await LocalManga.findByIdAndUpdate(req.params.id, req.body, { new: true })
  if (!manga) return res.status(404).json({ error: 'Not found' })
  res.json(manga)
})

router.delete('/manga/:id', async (req: Request, res: Response) => {
  await LocalChapter.deleteMany({ mangaId: req.params.id })
  await LocalManga.findByIdAndDelete(req.params.id)
  res.json({ success: true })
})

// ─── LOCAL CHAPTERS ──────────────────────────────────────────────────────────

router.get('/manga/:id/chapters', async (req: Request, res: Response) => {
  const chapters = await LocalChapter.find({ mangaId: req.params.id }).sort({ chapterNumber: 1 })
  res.json(chapters)
})

router.post('/manga/:id/chapters', async (req: Request, res: Response) => {
  try {
    const { chapterNumber, title, volume, pages, language } = req.body
    const chapter = await LocalChapter.create({ mangaId: req.params.id, chapterNumber, title, volume, pages, language })
    res.status(201).json(chapter)
  } catch (err: any) {
    res.status(400).json({ error: err.message })
  }
})

router.put('/chapters/:chapterId', async (req: Request, res: Response) => {
  const chapter = await LocalChapter.findByIdAndUpdate(req.params.chapterId, req.body, { new: true })
  if (!chapter) return res.status(404).json({ error: 'Not found' })
  res.json(chapter)
})

router.delete('/chapters/:chapterId', async (req: Request, res: Response) => {
  await LocalChapter.findByIdAndDelete(req.params.chapterId)
  res.json({ success: true })
})

// ─── MANGADEX MANUAL CHAPTERS (admin-only) ───────────────────────────────────

router.get('/mangadex/manual-chapter/:chapterId', async (req: Request, res: Response) => {
  try {
    const chapter = await MangaDexManualChapter.findById(req.params.chapterId)
    if (!chapter) return res.status(404).json({ error: 'Not found' })
    res.json(chapter)
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

router.get('/mangadex/:mangaDexId/chapters', async (req: Request, res: Response) => {
  try {
    const chapters = await MangaDexManualChapter.find({ mangaDexId: req.params.mangaDexId })
      .sort({ chapterNumber: 1 })
    res.json(chapters)
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

router.post('/mangadex/:mangaDexId/chapters', async (req: Request, res: Response) => {
  try {
    const { chapterNumber, title, volume, pages, language, mdxChapterId, externalUrl } = req.body
    const user = req.user as IUser | undefined
    const chapter = await MangaDexManualChapter.create({
      mangaDexId: req.params.mangaDexId,
      mdxChapterId: mdxChapterId || null,
      chapterNumber,
      title,
      volume,
      pages: pages || [],
      language: language || 'en',
      uploadedBy: user?.id || 'admin',
      source: mdxChapterId ? 'mangadex' : 'manual',
      externalUrl: externalUrl || undefined,
    })
    res.status(201).json(chapter)
  } catch (err: any) {
    res.status(400).json({ error: err.message })
  }
})

router.put('/mangadex/chapters/:chapterId', async (req: Request, res: Response) => {
  try {
    const chapter = await MangaDexManualChapter.findByIdAndUpdate(req.params.chapterId, req.body, { new: true })
    if (!chapter) return res.status(404).json({ error: 'Not found' })
    res.json(chapter)
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// Patch just the external URL on a chapter
router.patch('/chapters/:chapterId/external-url', async (req: Request, res: Response) => {
  try {
    const { externalUrl } = req.body
    const chapter = await MangaDexManualChapter.findByIdAndUpdate(
      req.params.chapterId,
      externalUrl ? { externalUrl } : { $unset: { externalUrl: '' } },
      { new: true }
    )
    if (!chapter) return res.status(404).json({ error: 'Not found' })
    res.json(chapter)
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

router.delete('/mangadex/chapters/:chapterId', async (req: Request, res: Response) => {
  try {
    await MangaDexManualChapter.findByIdAndDelete(req.params.chapterId)
    res.json({ success: true })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

router.post('/mangadex/chapters/bulk-delete', async (req: Request, res: Response) => {
  try {
    const { ids } = req.body
    if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ error: 'ids required' })
    await MangaDexManualChapter.deleteMany({ _id: { $in: ids } })
    res.json({ success: true, deleted: ids.length })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

router.post('/mangadex/chapters/bulk-publish', async (req: Request, res: Response) => {
  try {
    const { ids, published } = req.body
    if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ error: 'ids required' })
    await MangaDexManualChapter.updateMany({ _id: { $in: ids } }, { published: !!published })
    res.json({ success: true, updated: ids.length })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// ─── MANGADEX HIDDEN (API) CHAPTERS ─────────────────────────────────────────

router.get('/mangadex/:mangaDexId/hidden-chapters', async (req: Request, res: Response) => {
  try {
    const [hidden, deleted] = await Promise.all([
      HiddenChapter.find({ mangaDexId: req.params.mangaDexId }),
      DeletedChapter.find({ mangaDexId: req.params.mangaDexId }),
    ])
    res.json({
      hidden: hidden.map((h) => h.chapterId),
      deleted: deleted.map((d) => d.chapterId),
    })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

router.post('/mangadex/:mangaDexId/hidden-chapters', async (req: Request, res: Response) => {
  try {
    const { chapterId, chapterNumber, chapterTitle, mangaTitle } = req.body
    if (!chapterId) return res.status(400).json({ error: 'chapterId required' })
    const user = req.user as IUser | undefined
    await HiddenChapter.findOneAndUpdate(
      { mangaDexId: req.params.mangaDexId, chapterId },
      { hiddenBy: user?.id || 'admin', chapterNumber, chapterTitle, mangaTitle },
      { upsert: true, new: true }
    )
    res.json({ success: true })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

router.delete('/mangadex/:mangaDexId/hidden-chapters/:chapterId', async (req: Request, res: Response) => {
  try {
    await HiddenChapter.findOneAndDelete({
      mangaDexId: req.params.mangaDexId,
      chapterId: req.params.chapterId,
    })
    res.json({ success: true })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

router.post('/mangadex/:mangaDexId/deleted-chapters', async (req: Request, res: Response) => {
  try {
    const { chapterId, chapterNumber, chapterTitle, mangaTitle } = req.body
    if (!chapterId) return res.status(400).json({ error: 'chapterId required' })
    const user = req.user as IUser | undefined
    await HiddenChapter.findOneAndDelete({ mangaDexId: req.params.mangaDexId, chapterId })
    await DeletedChapter.findOneAndUpdate(
      { mangaDexId: req.params.mangaDexId, chapterId },
      { deletedBy: user?.id || 'admin', chapterNumber, chapterTitle, mangaTitle },
      { upsert: true, new: true }
    )
    res.json({ success: true })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// ─── USERS ───────────────────────────────────────────────────────────────────

router.get('/users', async (_req, res) => {
  const users = await User.find().select('-password').sort({ createdAt: -1 }).limit(100)
  res.json(users)
})

router.put('/users/:id/role', async (req: Request, res: Response) => {
  const { role } = req.body
  if (!['user', 'admin'].includes(role)) return res.status(400).json({ error: 'Invalid role' })
  const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true }).select('-password')
  res.json(user)
})

// ─── STATS ───────────────────────────────────────────────────────────────────

// ─── TRACKED MANGADEX MANGA ───────────────────────────────────────────────────

// GET all tracked MDX manga (pinned + any with manual chapters), merged with chapter counts
router.get('/mangadex-manga', async (_req, res) => {
  try {
    // axios imported statically

    // 1. Get all pinned manga
    const pinned = await TrackedMangaDex.find().lean()
    const pinnedIds = new Set(pinned.map(p => p.mangaDexId))

    // 2. Get IDs that have manual chapters but aren't pinned
    const chapterGroups = await MangaDexManualChapter.aggregate([
      { $group: {
        _id: '$mangaDexId',
        total: { $sum: 1 },
        published: { $sum: { $cond: ['$published', 1, 0] } },
        drafts: { $sum: { $cond: [{ $eq: ['$published', false] }, 1, 0] } },
        lastUpdated: { $max: '$updatedAt' },
      }}
    ])
    const countMap = new Map(chapterGroups.map(c => [c._id, c]))

    // 3. IDs we need metadata for (not pinned, discovered via chapters)
    const unTrackedIds = chapterGroups.map(c => c._id).filter(id => !pinnedIds.has(id))

    // 4. Fetch metadata for untracked ones (cap 20)
    const fetchMeta = async (id: string) => {
      try {
        const r = await axios.get(
          `https://api.mangadex.org/manga/${id}?includes[]=cover_art&includes[]=author`,
          { headers: { 'User-Agent': 'MangaVerse/1.0' }, timeout: 6000 }
        )
        const m = r.data.data
        const coverRel = m.relationships.find((r: any) => r.type === 'cover_art')
        const authorRel = m.relationships.find((r: any) => r.type === 'author')
        const fileName = coverRel?.attributes?.fileName
        return {
          mangaDexId: id,
          title: m.attributes.title?.en || Object.values(m.attributes.title || {})[0] || id,
          coverUrl: fileName ? `https://uploads.mangadex.org/covers/${id}/${fileName}.256.jpg` : '',
          status: m.attributes.status || 'ongoing',
          author: authorRel?.attributes?.name || '',
          year: m.attributes.year,
          pinned: false,
        }
      } catch {
        return { mangaDexId: id, title: id, coverUrl: '', status: 'unknown', author: '', pinned: false }
      }
    }

    const BATCH = 20
    const untrackedMeta: any[] = []
    for (let i = 0; i < Math.min(unTrackedIds.length, BATCH); i++) {
      untrackedMeta.push(await fetchMeta(unTrackedIds[i]))
    }

    // 5. Merge pinned + untracked into final list
    const result = [
      ...pinned.map(p => ({
        mangaDexId: p.mangaDexId,
        title: p.title,
        coverUrl: p.coverUrl,
        status: p.status,
        author: p.author,
        year: p.year,
        pinned: true,
        chapterCounts: countMap.get(p.mangaDexId) || { total: 0, published: 0, drafts: 0, lastUpdated: null },
      })),
      ...untrackedMeta.map(m => ({
        ...m,
        chapterCounts: countMap.get(m.mangaDexId) || { total: 0, published: 0, drafts: 0, lastUpdated: null },
      })),
    ]

    res.json(result)
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// POST pin a MangaDex manga to admin (saves metadata locally)
router.post('/mangadex-manga/pin', async (req: Request, res: Response) => {
  try {
    const { mangaDexId, title, coverUrl, status, author, year } = req.body
    if (!mangaDexId) return res.status(400).json({ error: 'mangaDexId required' })
    const doc = await TrackedMangaDex.findOneAndUpdate(
      { mangaDexId },
      { mangaDexId, title, coverUrl, status, author, year, pinnedAt: new Date() },
      { upsert: true, new: true }
    )
    res.json(doc)
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// DELETE unpin a MangaDex manga from admin
router.delete('/mangadex-manga/pin/:mangaDexId', async (req: Request, res: Response) => {
  try {
    await TrackedMangaDex.findOneAndDelete({ mangaDexId: req.params.mangaDexId })
    res.json({ success: true })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// GET search MangaDex for a manga by title (proxied, returns lightweight results)
router.get('/mangadex-manga/search', async (req: Request, res: Response) => {
  try {
    const { q } = req.query
    if (!q) return res.status(400).json({ error: 'query required' })
    // axios imported statically
    const r = await axios.get(
      `https://api.mangadex.org/manga?title=${encodeURIComponent(String(q))}&limit=10&includes[]=cover_art&includes[]=author`,
      { headers: { 'User-Agent': 'MangaVerse/1.0' }, timeout: 8000 }
    )
    const results = (r.data.data || []).map((m: any) => {
      const coverRel = m.relationships.find((r: any) => r.type === 'cover_art')
      const authorRel = m.relationships.find((r: any) => r.type === 'author')
      const fileName = coverRel?.attributes?.fileName
      return {
        mangaDexId: m.id,
        title: m.attributes.title?.en || Object.values(m.attributes.title || {})[0] || m.id,
        coverUrl: fileName ? `https://uploads.mangadex.org/covers/${m.id}/${fileName}.256.jpg` : '',
        status: m.attributes.status || 'ongoing',
        author: authorRel?.attributes?.name || '',
        year: m.attributes.year,
      }
    })
    res.json(results)
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})


router.get('/stats', async (_req, res) => {
  const [
    userCount,
    mangaCount,
    localChapterCount,
    mdxPublished,
    mdxDraft,
    mdxManual,
    mdxApi,
  ] = await Promise.all([
    User.countDocuments(),
    LocalManga.countDocuments(),
    LocalChapter.countDocuments(),
    MangaDexManualChapter.countDocuments({ published: true }),
    MangaDexManualChapter.countDocuments({ published: false }),
    MangaDexManualChapter.countDocuments({ source: 'manual' }),
    MangaDexManualChapter.countDocuments({ source: 'mangadex' }),
  ])
  res.json({
    userCount,
    mangaCount,
    chapterCount: localChapterCount,
    mdxPublished,
    mdxDraft,
    mdxManual,
    mdxApi,
    totalChapters: localChapterCount + mdxPublished + mdxDraft,
  })
})

export default router