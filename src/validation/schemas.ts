import { z } from 'zod';

export const tokenRequestSchema = z.object({
  code: z.string().min(32).max(64),
  client_id: z.string().min(1),
  client_secret: z.string().min(32)
});

export const challengeRequestSchema = z.object({
  address: z.string().regex(/^[0-9a-zA-Z]{48}$/),
  client_id: z.string().min(1)
}); 