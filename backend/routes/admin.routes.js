import { Router } from 'express';
import {
  getAdminReports,
  getMyTasks,
  getAdminReportById,
  updateAdminReport,
  getAdminStats,
  reclassifyAdminReport
} from '../controllers/admin.controller.js';
import { validate } from '../middlewares/validate.middleware.js';
import {
  getReportsQuerySchema,
  getMyTasksQuerySchema,
  reportIdParamSchema,
  updateReportSchema
} from '../validations/admin.validation.js';

const router = Router();

// 5a. GET /api/v1/admin/reports (with query filters, officer_id filter, and pagination)
router.get(
  '/reports',
  validate(getReportsQuerySchema, 'query'),
  getAdminReports
);

// Officer Assigned Tasks: GET /api/v1/admin/reports/my-tasks
router.get(
  '/reports/my-tasks',
  validate(getMyTasksQuerySchema, 'query'),
  getMyTasks
);

// Phase 6: GET /api/v1/admin/stats (analytics and aggregation)
router.get(
  '/stats',
  getAdminStats
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

// Phase 7: POST /api/v1/admin/reports/:id/reclassify (trigger ML reclassification)
router.post(
  '/reports/:id/reclassify',
  validate(reportIdParamSchema, 'params'),
  reclassifyAdminReport
);

export default router;
