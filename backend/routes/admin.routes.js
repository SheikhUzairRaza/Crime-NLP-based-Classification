import { Router } from 'express';
import {
  getAdminReports,
  getAdminReportById,
  updateAdminReport
} from '../controllers/admin.controller.js';
import { validate } from '../middlewares/validate.middleware.js';
import {
  getReportsQuerySchema,
  reportIdParamSchema,
  updateReportSchema
} from '../validations/admin.validation.js';

const router = Router();

// 5a. GET /api/v1/admin/reports (with query filters and pagination)
router.get(
  '/reports',
  validate(getReportsQuerySchema, 'query'),
  getAdminReports
);

// 5b. GET /api/v1/admin/reports/:id (full record or 404)
router.get(
  '/reports/:id',
  validate(reportIdParamSchema, 'params'),
  getAdminReportById
);

// 5c. PATCH /api/v1/admin/reports/:id (update status, assign officer, append notes)
router.patch(
  '/reports/:id',
  validate(reportIdParamSchema, 'params'),
  validate(updateReportSchema, 'body'),
  updateAdminReport
);

export default router;
