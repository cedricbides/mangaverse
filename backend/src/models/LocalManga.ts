import mongoose, { Schema, Document } from 'mongoose'

export interface ILocalManga extends Document {
  title: string
  altTitle?: string
  coverUrl?: string
  description?: string
  genres: string[]
  status: string
  author?: string
  artist?: string
  year?: number
  slug: string
  featured: boolean
  views: number
  createdAt: Date
  updatedAt: Date
}

const LocalMangaSchema = new Schema<ILocalManga>(
  {
    title: { type: String, required: true },
    altTitle: { type: String },
    coverUrl: { type: String },
    description: { type: String },
    genres: [{ type: String }],
    status: { type: String, default: 'ongoing' },
    author: { type: String },
    artist: { type: String },
    year: { type: Number },
    slug: { type: String, required: true, unique: true },
    featured: { type: Boolean, default: false },
    views: { type: Number, default: 0 },
  },
  { timestamps: true }
)

LocalMangaSchema.index({ slug: 1 }, { unique: true })
LocalMangaSchema.index({ createdAt: -1 })

export default mongoose.model<ILocalManga>('LocalManga', LocalMangaSchema)