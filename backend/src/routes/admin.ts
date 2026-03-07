import { Router, Request, Response } from 'express'
import LocalManga from '../models/LocalManga'
import LocalChapter from '../models/LocalChapter'
import MangaDexManualChapter from '../models/MangaDexManualChapter'
import User, { IUser } from '../models/User'
import { requireAdmin } from '../middleware/auth'

const router = Router()
router.use(requireAdmin)

// ─── LOCAL MANGA ─────────────────────────────────────────────────────────────

router.get('/manga', async (_req, res) => {
  const list = await LocalManga.find().sort({ createdAt: -1 })
  res.json(list)
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

// GET all manual chapters for a MangaDex manga
router.get('/mangadex/:mangaDexId/chapters', async (req: Request, res: Response) => {
  try {
    const chapters = await MangaDexManualChapter.find({ mangaDexId: req.params.mangaDexId })
      .sort({ chapterNumber: 1 })
    res.json(chapters)
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// POST add a manual chapter to a MangaDex manga
router.post('/mangadex/:mangaDexId/chapters', async (req: Request, res: Response) => {
  try {
    const { chapterNumber, title, volume, pages, language } = req.body
    const user = req.user as IUser | undefined
    const chapter = await MangaDexManualChapter.create({
      mangaDexId: req.params.mangaDexId,
      chapterNumber,
      title,
      volume,
      pages: pages || [],
      language: language || 'en',
      uploadedBy: user?.id || 'admin',
      source: 'manual',
    })
    res.status(201).json(chapter)
  } catch (err: any) {
    res.status(400).json({ error: err.message })
  }
})

// PUT update a manual chapter
router.put('/mangadex/chapters/:chapterId', async (req: Request, res: Response) => {
  try {
    const chapter = await MangaDexManualChapter.findByIdAndUpdate(
      req.params.chapterId,
      req.body,
      { new: true }
    )
    if (!chapter) return res.status(404).json({ error: 'Not found' })
    res.json(chapter)
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// DELETE a manual chapter
router.delete('/mangadex/chapters/:chapterId', async (req: Request, res: Response) => {
  try {
    await MangaDexManualChapter.findByIdAndDelete(req.params.chapterId)
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

router.get('/stats', async (_req, res) => {
  const [userCount, mangaCount, chapterCount] = await Promise.all([
    User.countDocuments(),
    LocalManga.countDocuments(),
    LocalChapter.countDocuments(),
  ])
  res.json({ userCount, mangaCount, chapterCount })
})

export default router
// ─── ANALYTICS ───────────────────────────────────────────────────────────────

router.get('/analytics', async (_req, res) => {
  try {
    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

    const [allManga, allUsers, recentUsers, allChapters] = await Promise.all([
      LocalManga.find().select('title views genres status createdAt coverUrl').sort({ views: -1 }),
      User.find().select('createdAt readingHistory favorites').sort({ createdAt: 1 }),
      User.find({ createdAt: { $gte: thirtyDaysAgo } }).select('createdAt'),
      LocalChapter.find().select('mangaId createdAt'),
    ])

    // Top manga by views
    const topManga = allManga.slice(0, 8).map(m => ({
      title: m.title.length > 20 ? m.title.slice(0, 18) + '…' : m.title,
      fullTitle: m.title,
      views: m.views,
      coverUrl: m.coverUrl,
    }))

    // Genre distribution
    const genreMap: Record<string, number> = {}
    allManga.forEach(m => m.genres.forEach(g => { genreMap[g] = (genreMap[g] || 0) + 1 }))
    const genreData = Object.entries(genreMap).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name, value]) => ({ name, value }))

    // Status breakdown
    const statusMap: Record<string, number> = {}
    allManga.forEach(m => { statusMap[m.status] = (statusMap[m.status] || 0) + 1 })
    const statusData = Object.entries(statusMap).map(([name, value]) => ({ name, value }))

    // User growth last 30 days
    const userGrowth: Record<string, number> = {}
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
      userGrowth[d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })] = 0
    }
    recentUsers.forEach(u => {
      const key = new Date(u.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      if (userGrowth[key] !== undefined) userGrowth[key]++
    })
    const userGrowthData = Object.entries(userGrowth).map(([date, count]) => ({ date, count }))

    // Reading activity last 30 days
    const activityMap: Record<string, number> = {}
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
      activityMap[d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })] = 0
    }
    allUsers.forEach(u => {
      u.readingHistory.forEach((h: any) => {
        if (h.updatedAt && new Date(h.updatedAt) >= thirtyDaysAgo) {
          const key = new Date(h.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
          if (activityMap[key] !== undefined) activityMap[key]++
        }
      })
    })
    const activityData = Object.entries(activityMap).map(([date, reads]) => ({ date, reads }))

    const totalViews = allManga.reduce((s, m) => s + (m.views || 0), 0)
    const newUsersThisWeek = allUsers.filter(u => new Date(u.createdAt) >= sevenDaysAgo).length
    const totalFavorites = allUsers.reduce((s, u) => s + (u.favorites?.length || 0), 0)
    const avgChaptersPerManga = allManga.length ? (allChapters.length / allManga.length).toFixed(1) : '0'

    res.json({
      topManga, genreData, statusData, userGrowthData, activityData,
      summary: { totalViews, newUsersThisWeek, totalFavorites, avgChaptersPerManga,
        publishedCount: statusMap['ongoing'] || 0, completedCount: statusMap['completed'] || 0 }
    })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})