import { z } from 'zod';

export const createPostSchema = z.object({
  body: z.object({
    content: z.string().max(5000, 'Content cannot exceed 5000 characters').optional().default(''),
    media: z.array(
      z.object({
        url: z.string().url('Invalid media URL'),
        fileId: z.string().min(1, 'File ID is required'),
        fileName: z.string().min(1, 'File name is required'),
        type: z.enum(['image', 'video']).default('image')
      })
    ).optional().default([]),
    platforms: z.array(z.enum(['facebook', 'instagram', 'linkedin'])).optional().default([]),
    status: z.enum(['draft', 'scheduled', 'publishing', 'published', 'partially_published', 'failed', 'cancelled']).optional().default('draft'),
    scheduledAt: z.string().datetime({ offset: true }).or(z.string().datetime()).nullable().optional(),
    timezone: z.string().optional().default('UTC')
  }).refine((data) => {
    // If not a draft, requires either text content or media, and at least one platform
    if (data.status !== 'draft') {
      const hasContent = data.content && data.content.trim().length > 0;
      const hasMedia = data.media && data.media.length > 0;
      if (!hasContent && !hasMedia) {
        return false;
      }
      if (!data.platforms || data.platforms.length === 0) {
        return false;
      }
    }
    return true;
  }, {
    message: 'Non-draft posts must have at least one selected platform and either text content or media'
  })
});

export const updatePostSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid Post ID')
  }),
  body: z.object({
    content: z.string().max(5000, 'Content cannot exceed 5000 characters').optional(),
    media: z.array(
      z.object({
        url: z.string().url('Invalid media URL'),
        fileId: z.string().min(1, 'File ID is required'),
        fileName: z.string().min(1, 'File name is required'),
        type: z.enum(['image', 'video']).default('image')
      })
    ).optional(),
    platforms: z.array(z.enum(['facebook', 'instagram', 'linkedin'])).optional(),
    status: z.enum(['draft', 'scheduled', 'publishing', 'published', 'partially_published', 'failed', 'cancelled']).optional(),
    scheduledAt: z.string().datetime({ offset: true }).or(z.string().datetime()).nullable().optional(),
    timezone: z.string().optional()
  })
});

export const getPostSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid Post ID')
  })
});
