import * as reportService from '../services/report.service.js';
import { ApiResponse } from '../utils/apiResponse.js';

/**
 * Controller: Handles GET /api/admin/reports
 * Protected endpoint returning all reports with filtering support
 */
export const getAdminReports = async (req, res, next) => {
  try {
    const filters = {
      domain: req.query.domain,
      severity: req.query.severity,
      status: req.query.status,
      is_urgent: req.query.is_urgent !== undefined ? req.query.is_urgent === 'true' : undefined
    };

    const reportsData = await reportService.getReports(filters);

    return ApiResponse.send(
      res,
      200,
      reportsData,
      'Admin reports retrieved successfully'
    );
  } catch (error) {
    next(error);
  }
};

export default {
  getAdminReports
};
