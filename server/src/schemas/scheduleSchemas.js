import { z } from 'zod';

export const scheduleSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid Post ID')
  }),
  body: z.object({
    scheduledAt: z.string({ required_error: 'scheduledAt is required' })
      .datetime({ offset: true })
      .or(z.string().datetime()),
    timezone: z.string().optional()
  }).refine((data) => {
    const scheduledDate = new Date(data.scheduledAt);
    return scheduledDate.getTime() > Date.now();
  }, {
    message: 'Scheduled date and time must be in the future',
    path: ['scheduledAt']
  })
});

export const cancelScheduleSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid Post ID')
  })
});
