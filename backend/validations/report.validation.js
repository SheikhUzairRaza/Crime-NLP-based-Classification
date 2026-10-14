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

export default {
  createReportSchema
};
