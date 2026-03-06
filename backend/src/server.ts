import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import session from 'express-session'
import MongoStore from 'connect-mongo'
import passport from 'passport'
import mongoose from 'mongoose'
import dotenv from 'dotenv'
import rateLimit from 'express-rate-limit'
import { configurePassport } from './config/passport'
import authRoutes from './routes/auth'
import favRoutes from './routes/favorites'
import adminRoutes from './routes/admin'
import localMangaRoutes from './routes/localManga'
import mangadexRoutes from './routes/mangadex'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 5000
const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/mangaverse'

// ─── Security ────────────────────────────────────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false }))
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true,
}))
app.use(express.json({ limit: '10mb' }))

// ─── Rate Limiters ────────────────────────────────────────────────────────────
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  message: { error: 'Too many accounts created from this IP, try again in 1 hour' }
})

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many login attempts, try again in 15 minutes' }
})

app.use('/api/auth/register', registerLimiter)
app.use('/api/auth/login', loginLimiter)

// ─── Session ─────────────────────────────────────────────────────────────────
app.use(session({
  secret: process.env.SESSION_SECRET || 'dev_secret_change_me',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: MONGO_URI }),
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 7 * 24 * 60 * 60 * 1000,
  },
}))

// ─── Passport ────────────────────────────────────────────────────────────────
configurePassport()
app.use(passport.initialize())
app.use(passport.session())

// ─── Routes ──────────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => res.json({ status: 'ok' }))
app.use('/auth', authRoutes)
app.use('/api/auth', authRoutes)
app.use('/api/favorites', favRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/local-manga', localMangaRoutes)
app.use('/api/mangadex', mangadexRoutes)

// ─── DB + Start ──────────────────────────────────────────────────────────────
mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('✅ MongoDB connected')
    app.listen(PORT, () => {
      console.log(`🚀 Server: http://localhost:${PORT}`)
    })
  })
  .catch((err) => {
    console.error('❌ MongoDB failed:', err)
    process.exit(1)
  })

export default app