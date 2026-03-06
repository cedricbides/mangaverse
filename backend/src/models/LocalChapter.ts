import mongoose, { Schema, Document } from 'mongoose'

export interface ILocalChapter extends Document {
  mangaId: mongoose.Types.ObjectId
  chapterNumber: string
  title?: string
  volume?: string
  pages: string[]   // array of image URLs
  language: string
  createdAt: Date
}

const LocalChapterSchema = new Schema<ILocalChapter>(
  {
    mangaId: { type: Schema.Types.ObjectId, ref: 'LocalManga', required: true },
    chapterNumber: { type: String, required: true },
    title: { type: String },
    volume: { type: String },
    pages: [{ type: String }],
    language: { type: String, default: 'en' },
  },
  { timestamps: true }
)

LocalChapterSchema.index({ mangaId: 1, chapterNumber: 1 }, { unique: true })

export default mongoose.model<ILocalChapter>('LocalChapter', LocalChapterSchema)
