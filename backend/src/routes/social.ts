import { Router, Request, Response } from 'express'
import User, { IUser, ReadingStatus } from '../models/User'
import Review from '../models/Review'
import Comment from '../models/Comment'

const router = Router()

function requireAuth(req: Request, res: Response, next: () => void) {
  if (!req.user) return res.status(401).json({ error: 'Not authenticated' })
  next()
}

// ─── READING LIST ─────────────────────────────────────────────────────────────

// GET reading list status for a manga
router.get('/reading-list/:mangaId', requireAuth, async (req: Request, res: Response) => {
  const user = await User.findById((req.user as IUser).id)
  if (!user) return res.status(404).json({ error: 'User not found' })
  const entry = user.readingList?.find(r => r.mangaId === req.params.mangaId)
  res.json({ status: entry?.status || null })
})

// POST set reading list status (or remove if status is null)
router.post('/reading-list', requireAuth, async (req: Request, res: Response) => {
  const { mangaId, status } = req.body
  if (!mangaId) return res.status(400).json({ error: 'mangaId required' })

  const user = await User.findById((req.user as IUser).id)
  if (!user) return res.status(404).json({ error: 'User not found' })

  if (!user.readingList) user.readingList = []
  const idx = user.readingList.findIndex(r => r.mangaId === mangaId)

  if (!status) {
    // Remove from list
    if (idx > -1) user.readingList.splice(idx, 1)
  } else {
    if (idx > -1) {
      user.readingList[idx].status = status as ReadingStatus
      user.readingList[idx].updatedAt = new Date()
    } else {
      user.readingList.push({ mangaId, status: status as ReadingStatus, updatedAt: new Date() })
    }
  }

  await user.save()
  res.json({ status: status || null, readingList: user.readingList })
})

// GET full reading list for profile page
router.get('/reading-list', requireAuth, async (req: Request, res: Response) => {
  const user = await User.findById((req.user as IUser).id)
  if (!user) return res.status(404).json({ error: 'User not found' })
  res.json({ readingList: user.readingList || [] })
})

// ─── REVIEWS & RATINGS ───────────────────────────────────────────────────────

// GET reviews for a manga
router.get('/reviews/:mangaId', async (req: Request, res: Response) => {
  try {
    const reviews = await Review.find({ mangaId: req.params.mangaId })
      .sort({ createdAt: -1 })
      .limit(50)
    const avg = reviews.length
      ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
      : null
    res.json({ reviews, avg, count: reviews.length })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// GET current user's review for a manga
router.get('/reviews/:mangaId/mine', requireAuth, async (req: Request, res: Response) => {
  const userId = (req.user as IUser).id
  const review = await Review.findOne({ mangaId: req.params.mangaId, userId })
  res.json({ review: review || null })
})

// POST create or update review
router.post('/reviews/:mangaId', requireAuth, async (req: Request, res: Response) => {
  try {
    const { rating, body } = req.body
    if (!rating || rating < 1 || rating > 10) return res.status(400).json({ error: 'Rating must be 1-10' })
    const user = req.user as IUser
    const review = await Review.findOneAndUpdate(
      { mangaId: req.params.mangaId, userId: user.id },
      {
        userId: user.id,
        userName: user.name,
        userAvatar: user.avatar || '',
        rating: Number(rating),
        body: body?.trim() || '',
      },
      { upsert: true, new: true }
    )
    res.json({ review })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// DELETE review
router.delete('/reviews/:mangaId', requireAuth, async (req: Request, res: Response) => {
  const userId = (req.user as IUser).id
  await Review.findOneAndDelete({ mangaId: req.params.mangaId, userId })
  res.json({ success: true })
})

// ─── COMMENTS ────────────────────────────────────────────────────────────────

// GET comments for a chapter
router.get('/comments/:chapterId', async (req: Request, res: Response) => {
  try {
    const comments = await Comment.find({ chapterId: req.params.chapterId })
      .sort({ createdAt: -1 })
      .limit(100)
    res.json({ comments })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// POST add comment
router.post('/comments/:chapterId', requireAuth, async (req: Request, res: Response) => {
  try {
    const { body, mangaId } = req.body
    if (!body?.trim()) return res.status(400).json({ error: 'Comment cannot be empty' })
    if (body.length > 2000) return res.status(400).json({ error: 'Comment too long' })
    const user = req.user as IUser
    const comment = await Comment.create({
      chapterId: req.params.chapterId,
      mangaId: mangaId || '',
      userId: user.id,
      userName: user.name,
      userAvatar: user.avatar || '',
      body: body.trim(),
    })
    res.status(201).json({ comment })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// DELETE comment (own comment or admin)
router.delete('/comments/:commentId', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = req.user as IUser
    const comment = await Comment.findById(req.params.commentId)
    if (!comment) return res.status(404).json({ error: 'Not found' })
    if (comment.userId !== user.id && user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' })
    }
    await comment.deleteOne()
    res.json({ success: true })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

export default router