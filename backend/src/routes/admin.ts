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