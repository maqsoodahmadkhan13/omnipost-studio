import mongoose from 'mongoose';

const socialAccountSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true
    },
    platform: {
      type: String,
      enum: ['facebook', 'instagram', 'linkedin'],
      required: [true, 'Platform is required']
    },
    externalAccountId: {
      type: String,
      required: [true, 'External account ID is required']
    },
    accountName: {
      type: String,
      required: [true, 'Account name is required'],
      trim: true
    },
    username: {
      type: String,
      default: '',
      trim: true
    },
    accessToken: {
      type: String,
      required: [true, 'Access token is required'],
      select: false // Never return in default queries to frontend
    },
    refreshToken: {
      type: String,
      default: null,
      select: false // Never return in default queries to frontend
    },
    expiresAt: {
      type: Date,
      default: null
    },
    status: {
      type: String,
      enum: ['connected', 'expired', 'authentication_required', 'disconnected'],
      default: 'connected',
      index: true
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },
  {
    timestamps: true,
    toJSON: {
      transform: (doc, ret) => {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        delete ret.accessToken;
        delete ret.refreshToken;
        return ret;
      }
    }
  }
);

// Compound index to prevent duplicate connections of the same external account by the same user
socialAccountSchema.index({ userId: 1, platform: 1, externalAccountId: 1 }, { unique: true });

export const SocialAccount = mongoose.model('SocialAccount', socialAccountSchema);
