import { z } from 'zod';

export const ticketSchema = z.object({
  subject: z.string()
    .trim()
    .min(5, 'Subject must be at least 5 characters')
    .max(200, 'Subject must be less than 200 characters'),
  description: z.string()
    .trim()
    .min(10, 'Description must be at least 10 characters')
    .max(5000, 'Description must be less than 5000 characters'),
});

export const ratingSchema = z.object({
  rating: z.number().min(1).max(5),
  review: z.string()
    .trim()
    .max(2000, 'Review must be less than 2000 characters')
    .optional(),
});

export const productSchema = z.object({
  name: z.string().trim().min(3, 'Name must be at least 3 characters').max(100, 'Name must be less than 100 characters'),
  description: z.string().trim().max(1000, 'Description must be less than 1000 characters').optional(),
  price: z.number().positive('Price must be positive').max(999999, 'Price must be less than 999,999'),
  duration_days: z.number().int('Duration must be a whole number').positive('Duration must be positive').max(365, 'Duration must be less than 365 days'),
});

export const stockLogSchema = z.object({
  reason: z.string().trim().min(3, 'Reason must be at least 3 characters').max(500, 'Reason must be less than 500 characters'),
});
