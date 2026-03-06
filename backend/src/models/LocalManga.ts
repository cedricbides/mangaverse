import mongoose, { Schema, Document } from 'mongoose'

export interface ILocalManga extends Document {
  title: string
  altTitle?: string
  coverUrl: string
  description: string
  genres: string[]
  status: 'ongoing' | 'completed' | 'hiatus' | 'cancelled'
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
    coverUrl: { type: String, required: true },
    description: { type: String, default: '' },
    genres: [{ type: String }],
    status: { type: String, enum: ['ongoing', 'completed', 'hiatus', 'cancelled'], default: 'ongoing' },
    author: { type: String },
    artist: { type: String },
    year: { type: Number },
    slug: { type: String, required: true, unique: true },
    featured: { type: Boolean, default: false },
    views: { type: Number, default: 0 },
  },
  { timestamps: true }
)

export default mongoose.model<ILocalManga>('LocalManga', LocalMangaSchema)
