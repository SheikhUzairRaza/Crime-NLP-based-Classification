import { Router } from 'express';
import { createReport, trackReport } from '../controllers/report.controller.js';
import { validate, validateParams } from '../middlewares/validate.middleware.js';
import { createReportSchema, trackReportParamsSchema } from '../validations/report.validation.js';
import { reportCreationLimiter, trackingLimiter } from '../middlewares/rateLimiter.middleware.js';

const router = Router();

// POST /api/v1/reports - Rate limited to 5/hour per IP, validated with Zod
router.post(
  '/',
  reportCreationLimiter,
  validate(createReportSchema),
  createReport
);

// GET /api/v1/reports/track/:trackingId - Rate limited to 30/15min per IP, validated with Zod
router.get(
  '/track/:trackingId',
  trackingLimiter,
  validateParams(trackReportParamsSchema),
  trackReport
);

export default router;
