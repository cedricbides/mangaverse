import mongoose, { Schema, Document } from 'mongoose'
import bcrypt from 'bcryptjs'

export interface IUser extends Document {
  googleId?: string
  name: string
  email: string
  avatar: string
  password?: string
  role: 'user' | 'admin'
  favorites: string[]
  readingHistory: Array<{
    mangaId: string
    chapterId: string
    page: number
    updatedAt: Date
    isLocal?: boolean
  }>
  createdAt: Date
  comparePassword(candidate: string): Promise<boolean>
}

const UserSchema = new Schema<IUser>(
  {
    googleId: { type: String, sparse: true },
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    avatar: { type: String, default: '' },
    password: { type: String, select: false },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    favorites: [{ type: String }],
    readingHistory: [{
      mangaId: String,
      chapterId: String,
      page: { type: Number, default: 0 },
      isLocal: { type: Boolean, default: false },
      updatedAt: { type: Date, default: Date.now },
    }],
  },
  { timestamps: true }
)

UserSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) return next()
  const bcrypt = require('bcryptjs')
  this.password = await bcrypt.hash(this.password, 12)
  next()
})

UserSchema.methods.comparePassword = async function (candidate: string) {
  if (!this.password) return false
  const bcrypt = require('bcryptjs')
  return bcrypt.compare(candidate, this.password)
}

export default mongoose.model<IUser>('User', UserSchema)
