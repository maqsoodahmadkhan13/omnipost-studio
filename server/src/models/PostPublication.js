import mongoose from 'mongoose';

const postPublicationSchema = new mongoose.Schema(
  {
    postId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Post',
      required: [true, 'Post ID is required'],
      index: true
    },
    socialAccountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SocialAccount',
      default: null,
      index: true
    },
    platform: {
      type: String,
      enum: ['facebook', 'instagram', 'linkedin'],
      required: [true, 'Platform is required']
    },
    status: {
      type: String,
      enum: ['pending', 'publishing', 'published', 'failed', 'cancelled'],
      default: 'pending',
      index: true
    },
    externalPostId: {
      type: String,
      default: null
    },
    errorCode: {
      type: String,
      default: null
    },
    errorMessage: {
      type: String,
      default: null
    },
    retryCount: {
      type: Number,
      default: 0
    },
    lastAttemptAt: {
      type: Date,
      default: null
    },
    publishedAt: {
      type: Date,
      default: null
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

// Compound index to quickly query publications by post and platform
postPublicationSchema.index({ postId: 1, platform: 1 });

export const PostPublication = mongoose.model('PostPublication', postPublicationSchema);
