import mongoose, { Schema, Document } from 'mongoose'

export interface IMangaDexManualChapter extends Document {
  mangaDexId: string       // MangaDex manga ID this chapter belongs to
  chapterNumber: string
  title?: string
  volume?: string
  pages: string[]          // array of image URLs
  language: string
  uploadedBy: string       // admin user id
  source: 'manual'
  createdAt: Date
  updatedAt: Date
}

const MangaDexManualChapterSchema = new Schema(
  {
    mangaDexId:    { type: String, required: true, index: true },
    chapterNumber: { type: String, required: true },
    title:         { type: String },
    volume:        { type: String },
    pages:         [{ type: String }],
    language:      { type: String, default: 'en' },
    uploadedBy:    { type: String },
    source:        { type: String, default: 'manual' },
  },
  { timestamps: true }
)

export default mongoose.model<IMangaDexManualChapter>(
  'MangaDexManualChapter',
  MangaDexManualChapterSchema
)