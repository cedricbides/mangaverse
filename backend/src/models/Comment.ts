import mongoose, { Schema, Document } from 'mongoose'

export interface IComment extends Document {
  chapterId: string        // chapter ID (any type)
  mangaId: string          // parent manga (for context)
  userId: string
  userName: string
  userAvatar: string
  body: string
  createdAt: Date
  updatedAt: Date
}

const CommentSchema = new Schema<IComment>(
  {
    chapterId:   { type: String, required: true, index: true },
    mangaId:     { type: String, required: true, index: true },
    userId:      { type: String, required: true },
    userName:    { type: String, required: true },
    userAvatar:  { type: String, default: '' },
    body:        { type: String, required: true, maxlength: 2000 },
  },
  { timestamps: true }
)

export default mongoose.model<IComment>('Comment', CommentSchema)