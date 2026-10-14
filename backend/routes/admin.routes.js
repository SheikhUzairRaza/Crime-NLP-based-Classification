import { Router } from 'express';
import { getAdminReports } from '../controllers/admin.controller.js';

const router = Router();

// GET /api/admin/reports
router.get('/reports', getAdminReports);

export default router;
