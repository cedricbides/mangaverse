import passport from 'passport'
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
}
