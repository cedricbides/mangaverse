import { Router, Request, Response } from 'express'
import LocalManga from '../models/LocalManga'
import LocalChapter from '../models/LocalChapter'
import MangaDexManualChapter from '../models/MangaDexManualChapter'

const router = Router()

// Get all local manga (public)
router.get('/', async (_req: Request, res: Response) => {
  const list = await LocalManga.find().sort({ updatedAt: -1 })
  res.json(list)
})

// Get single chapter by ID — must be before /:slug
router.get('/chapter/:chapterId', async (req: Request, res: Response) => {
  const chapter = await LocalChapter.findById(req.params.chapterId).populate('mangaId')
  if (!chapter) return res.status(404).json({ error: 'Not found' })
  res.json(chapter)
})

// Get single MangaDex manual chapter by ID — must be before /:slug
router.get('/manual-chapter/:chapterId', async (req: Request, res: Response) => {
  const chapter = await MangaDexManualChapter.findById(req.params.chapterId)
  if (!chapter) return res.status(404).json({ error: 'Not found' })
  res.json(chapter)
})

// Get single manga by slug or ID
router.get('/:slug', async (req: Request, res: Response) => {
  const manga = await LocalManga.findOne({ slug: req.params.slug })
  if (!manga) {
    const byId = await LocalManga.findById(req.params.slug).catch(() => null)
    if (!byId) return res.status(404).json({ error: 'Not found' })
    return res.json(byId)
  }
  manga.views += 1
  await manga.save()
  res.json(manga)
})

// Get chapters for a manga
router.get('/:id/chapters', async (req: Request, res: Response) => {
  const chapters = await LocalChapter.find({ mangaId: req.params.id }).sort({ chapterNumber: 1 })
  res.json(chapters)
})

export default router