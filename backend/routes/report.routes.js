import { Router } from 'express';
import { createReport, trackReport } from '../controllers/report.controller.js';
import { validate, validateParams } from '../middlewares/validate.middleware.js';
import { createReportSchema, trackReportParamsSchema } from '../validations/report.validation.js';

const router = Router();

// POST /api/reports - Validate body via Zod middleware, then execute controller
router.post('/', validate(createReportSchema), createReport);

// GET /api/reports/track/:trackingId - Validate params via Zod middleware, then execute controller
router.get('/track/:trackingId', validateParams(trackReportParamsSchema), trackReport);

export default router;
