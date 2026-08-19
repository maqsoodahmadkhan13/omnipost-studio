import mongoose from 'mongoose';

const mediaSchema = new mongoose.Schema(
  {
    url: {
      type: String,
      required: [true, 'Media URL is required']
    },
    fileId: {
      type: String,
      required: [true, 'ImageKit fileId is required']
    },
    fileName: {
      type: String,
      required: [true, 'File name is required']
    },
    type: {
      type: String,
      enum: ['image', 'video'],
      default: 'image'
    }
  },
  { _id: false }
);

const postSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true
    },
    content: {
      type: String,
      default: '',
      trim: true,
      maxlength: [5000, 'Content cannot exceed 5000 characters']
    },
    media: {
      type: [mediaSchema],
      default: []
    },
    platforms: {
      type: [String],
      enum: ['facebook', 'instagram', 'linkedin'],
      default: []
    },
    status: {
      type: String,
      enum: [
        'draft',
        'scheduled',
        'publishing',
        'published',
        'partially_published',
        'failed',
        'cancelled'
      ],
      default: 'draft',
      index: true
    },
    scheduledAt: {
      type: Date,
      default: null,
      index: true
    },
    timezone: {
      type: String,
      default: 'UTC'
    }
  },
  {
    timestamps: true,
    toJSON: {
      transform: (doc, ret) => {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        return ret;
      }
    }
  }
);

export const Post = mongoose.model('Post', postSchema);
