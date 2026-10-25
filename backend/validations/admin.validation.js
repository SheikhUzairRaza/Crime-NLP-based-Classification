import { z } from 'zod';

/**
 * Schema for validating query parameters in GET /api/v1/admin/reports
 */
export const getReportsQuerySchema = z.object({
  domain: z.enum(['Cyber', 'Physical']).optional(),
  severity: z.enum(['Critical', 'High', 'Medium', 'Low']).optional(),
  category: z.string().trim().optional(),
  status: z.enum(['Pending', 'Under Investigation', 'Resolved', 'Dismissed']).optional(),
  officer_id: z
    .preprocess((val) => {
      if (typeof val === 'string') {
        if (val.toLowerCase() === 'unassigned' || val.toLowerCase() === 'null') return 'unassigned';
        const parsed = parseInt(val, 10);
        return isNaN(parsed) ? val : parsed;
      }
      return val;
    }, z.union([z.number().int().positive(), z.literal('unassigned')]))
    .optional(),
  is_urgent: z
    .preprocess((val) => {
      if (typeof val === 'string') {
        if (val.toLowerCase() === 'true') return true;
        if (val.toLowerCase() === 'false') return false;
      }
      return val;
    }, z.boolean().optional()),
  page: z
    .preprocess((val) => (val !== undefined ? parseInt(String(val), 10) : 1), z.number().int().min(1))
    .default(1),
  limit: z
    .preprocess((val) => (val !== undefined ? parseInt(String(val), 10) : 20), z.number().int().min(1).max(100))
    .default(20)
});

/**
 * Schema for validating query parameters in GET /api/v1/admin/reports/my-tasks
 */
export const getMyTasksQuerySchema = z.object({
  domain: z.enum(['Cyber', 'Physical']).optional(),
  severity: z.enum(['Critical', 'High', 'Medium', 'Low']).optional(),
  category: z.string().trim().optional(),
  status: z.enum(['Pending', 'Under Investigation', 'Resolved', 'Dismissed']).optional(),
  is_urgent: z
    .preprocess((val) => {
      if (typeof val === 'string') {
        if (val.toLowerCase() === 'true') return true;
        if (val.toLowerCase() === 'false') return false;
      }
      return val;
    }, z.boolean().optional()),
  page: z
    .preprocess((val) => (val !== undefined ? parseInt(String(val), 10) : 1), z.number().int().min(1))
    .default(1),
  limit: z
    .preprocess((val) => (val !== undefined ? parseInt(String(val), 10) : 20), z.number().int().min(1).max(100))
    .default(20)
});

/**
 * Schema for validating route parameter :id
 */
export const reportIdParamSchema = z.object({
  id: z.preprocess(
    (val) => parseInt(String(val), 10),
    z.number().int().positive('Report ID must be a positive integer')
  )
});

/**
 * Schema for validating PATCH /api/v1/admin/reports/:id
 * Only status, officer_id, and officer_notes are allowed
 * Status must strictly be 'Under Investigation', 'Resolved', or 'Dismissed'
 */
export const updateReportSchema = z
  .object({
    status: z
      .enum(['Under Investigation', 'Resolved', 'Dismissed'], {
        errorMap: () => ({
          message: "Status must be one of: 'Under Investigation', 'Resolved', 'Dismissed'"
        })
      })
      .optional(),
    officer_id: z
      .preprocess(
        (val) => (val === null || val === undefined ? val : parseInt(String(val), 10)),
        z.number().int().positive('Officer ID must be a positive integer').nullable().optional()
      ),
    officer_notes: z.string().min(1, 'Officer notes cannot be empty').optional()
  })
  .refine(
    (data) => data.status !== undefined || data.officer_id !== undefined || data.officer_notes !== undefined,
    {
      message: 'At least one field (status, officer_id, or officer_notes) must be provided for update'
    }
  );

export default {
  getReportsQuerySchema,
  reportIdParamSchema,
  updateReportSchema
};
