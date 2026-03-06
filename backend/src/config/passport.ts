import passport from 'passport'
import { Strategy as GoogleStrategy, Profile, VerifyCallback } from 'passport-google-oauth20'
import User from '../models/User'

export function configurePassport() {
  passport.serializeUser((user: Express.User, done) => {
    done(null, (user as { id: string }).id)
  })

  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await User.findById(id)
      done(null, user)
    } catch (err) {
      done(err)
    }
  })

  // ── Google Strategy ──────────────────────────────
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    console.warn('⚠️  Google OAuth skipped — GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET not set in .env')
    return
  }

  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: '/api/auth/google/callback',
  },
  (_accessToken: string, _refreshToken: string, profile: Profile, done: VerifyCallback) => {
    (async () => {
      // Check if user already exists by googleId
      let user = await User.findOne({ googleId: profile.id })

      if (!user) {
        // Check if email is already registered — link accounts
        const email = profile.emails?.[0]?.value
        user = await User.findOne({ email })

        if (user) {
          // Link Google to existing email account
          user.googleId = profile.id
          if (!user.avatar) user.avatar = profile.photos?.[0]?.value || ''
          await user.save()
        } else {
          // Brand new user via Google
          const count = await User.countDocuments()
          user = await User.create({
            googleId: profile.id,
            name: profile.displayName,
            email: profile.emails?.[0]?.value || '',
            avatar: profile.photos?.[0]?.value || '',
            role: count === 0 ? 'admin' : 'user',
          })
        }
      }

      return user
    })()
      .then(user => done(null, user))
      .catch(err => done(err))
  }))
}
