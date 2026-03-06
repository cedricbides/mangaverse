import { Router, Request, Response } from 'express'
import passport from 'passport'
import User, { IUser } from '../models/User'

const router = Router()

// ── Register ─────────────────────────────────────────────────────────────────
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { name, email, password } = req.body
    if (!name || !email || !password) return res.status(400).json({ error: 'All fields required' })
    const existing = await User.findOne({ email })
    if (existing) return res.status(400).json({ error: 'Email already registered' })
    const count = await User.countDocuments()
    const user = await User.create({ name, email, password, role: count === 0 ? 'admin' : 'user', avatar: '' })
    
    req.login(user, (err) => {
      if (err) return res.status(500).json({ error: 'Login failed' })
      res.json({ user: { id: user.id, name: user.name, email: user.email, avatar: user.avatar, role: user.role, favorites: user.favorites } })
    })
  } catch (err: any) {
    res.status(400).json({ error: err.message })
  }
})

// ── Login ─────────────────────────────────────────────────────────────────────
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' })
    const user = await User.findOne({ email }).select('+password')
    if (!user || !user.password) return res.status(401).json({ error: 'Invalid credentials' })
    const valid = await user.comparePassword(password)
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' })
    req.login(user, (err) => {
      if (err) return res.status(500).json({ error: 'Login failed' })
      res.json({ user: { id: user.id, name: user.name, email: user.email, avatar: user.avatar, role: user.role, favorites: user.favorites } })
    })
  } catch (err: any) {
    res.status(400).json({ error: err.message })
  }
})

// ── Current User ──────────────────────────────────────────────────────────────
router.get('/me', (req, res) => {
  if (!req.user) return res.json({ user: null })
  const u = req.user as IUser
  return res.json({
    user: { id: u.id, name: u.name, email: u.email, avatar: u.avatar, role: u.role, favorites: u.favorites }
  })
})

// ── Logout ────────────────────────────────────────────────────────────────────
router.get('/logout', (req, res) => {
  req.logout(() => res.json({ success: true }))
})

// ── Google OAuth ──────────────────────────────────────────────────────────────
// Step 1: Redirect user to Google
router.get('/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
)

// Step 2: Google redirects back here after login
router.get('/google/callback',
  passport.authenticate('google', { failureRedirect: '/login?error=google_failed' }),
  (_req, res) => {
    // Success — send user back to frontend
    res.redirect(process.env.CLIENT_URL || 'http://localhost:3000')
  }
)

export default router
