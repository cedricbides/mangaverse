import mongoose, { Schema, Document } from 'mongoose'

export interface ITrackedMangaDex extends Document {
  mangaDexId: string
  title: string
  coverUrl: string
  status: string
  author: string
  year?: number
  pinnedAt: Date
}

const TrackedMangaDexSchema = new Schema<ITrackedMangaDex>(
  {
    mangaDexId: { type: String, required: true, unique: true },
    title:      { type: String, required: true },
    coverUrl:   { type: String, default: '' },
    status:     { type: String, default: 'ongoing' },
    author:     { type: String, default: '' },
    year:       { type: Number },
    pinnedAt:   { type: Date, default: Date.now },
  },
  { timestamps: true }
)

export default mongoose.model<ITrackedMangaDex>('TrackedMangaDex', TrackedMangaDexSchema)