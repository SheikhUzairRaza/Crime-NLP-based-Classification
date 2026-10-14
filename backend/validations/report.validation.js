import { z } from 'zod';

export const createReportSchema = z.object({
  citizen_name: z
    .string({ required_error: 'Citizen name is required' })
    .trim()
    .min(1, 'Citizen name cannot be empty'),

  contact_number: z
    .string({ required_error: 'Contact number is required' })
    .trim()
    .min(1, 'Contact number cannot be empty'),

  incident_location: z
    .string({ required_error: 'Incident location is required' })
    .trim()
    .min(1, 'Incident location cannot be empty'),

  incident_date: z
    .string({ required_error: 'Incident date is required' })
    .refine((val) => !isNaN(Date.parse(val)), {
      message: 'Must be a valid ISO date string'
    })
    .refine((val) => new Date(val) <= new Date(), {
      message: 'Incident date cannot be in the future'
    }),

  description: z
    .string({ required_error: 'Complaint description is required' })
    .trim()
    .min(20, 'Complaint description must be at least 20 characters long')
});

export const trackReportParamsSchema = z.object({
  trackingId: z
    .string({ required_error: 'Tracking ID is required' })
    .trim()
    .min(5, 'Tracking ID cannot be empty')
    .regex(/^CRIME-\d{4}-[A-F0-9]{10}$/i, 'Tracking ID must follow format CRIME-YYYY-XXXXXXXXXX (e.g. CRIME-2026-A83B4C91D2)')
});

export default {
  createReportSchema,
  trackReportParamsSchema
};
