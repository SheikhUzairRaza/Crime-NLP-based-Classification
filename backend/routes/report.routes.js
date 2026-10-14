import { Router } from 'express';
import { createReport, trackReport } from '../controllers/report.controller.js';
import { validate } from '../middlewares/validate.middleware.js';
import { createReportSchema } from '../validations/report.validation.js';

const router = Router();

// POST /api/reports - Validate input via middleware, then execute controller
router.post('/', validate(createReportSchema), createReport);

// GET /api/reports/track/:trackingId - Citizen public tracking
router.get('/track/:trackingId', trackReport);

export default router;
