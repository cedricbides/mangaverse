import mongoose, { Schema, Document } from 'mongoose'

export interface IMangaDexManualChapter extends Document {
  mangaDexId: string
  mdxChapterId?: string
  chapterNumber: string
  title?: string
  volume?: string
  pages: string[]
  language: string
  uploadedBy: string
  source: 'manual' | 'mangadex'
  published: boolean      // true = visible to all users, false = admin only
  externalUrl?: string    // optional external URL shown as a link button on chapter
  createdAt: Date
  updatedAt: Date
}

const MangaDexManualChapterSchema = new Schema(
  {
    mangaDexId:    { type: String, required: true, index: true },
    mdxChapterId:  { type: String, index: true },
    chapterNumber: { type: String, required: true },
    title:         { type: String },
    volume:        { type: String },
    pages:         [{ type: String }],
    language:      { type: String, default: 'en' },
    uploadedBy:    { type: String },
    source:        { type: String, default: 'manual' },
    published:     { type: Boolean, default: false },  // draft by default
    externalUrl:   { type: String },                    // optional external read link
  },
  { timestamps: true }
)

export default mongoose.model<IMangaDexManualChapter>(
  'MangaDexManualChapter',
  MangaDexManualChapterSchema
)