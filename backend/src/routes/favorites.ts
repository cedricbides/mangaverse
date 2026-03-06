import { Router, Request, Response } from 'express'
import User, { IUser } from '../models/User'

const router = Router()

function requireAuth(req: Request, res: Response, next: () => void) {
  if (!req.user) return res.status(401).json({ error: 'Not authenticated' })
  next()
}

// Toggle favorite manga
router.post('/toggle', requireAuth, async (req: Request, res: Response) => {
  const { mangaId } = req.body
  if (!mangaId) return res.status(400).json({ error: 'mangaId required' })

  const user = await User.findById((req.user as IUser).id)
  if (!user) return res.status(404).json({ error: 'User not found' })

  const idx = user.favorites.indexOf(mangaId)
  if (idx > -1) {
    user.favorites.splice(idx, 1)
  } else {
    user.favorites.push(mangaId)
  }

  await user.save()
  return res.json({ favorites: user.favorites })
})

// Save reading progress
router.post('/progress', requireAuth, async (req: Request, res: Response) => {
  const { mangaId, chapterId, page } = req.body
  const user = await User.findById((req.user as IUser).id)
  if (!user) return res.status(404).json({ error: 'User not found' })

  const existing = user.readingHistory.find(h => h.mangaId === mangaId)
  if (existing) {
    existing.chapterId = chapterId
    existing.page = page
    existing.updatedAt = new Date()
  } else {
    user.readingHistory.push({ mangaId, chapterId, page, updatedAt: new Date() })
  }

  await user.save()
  return res.json({ success: true })
})

export default router
