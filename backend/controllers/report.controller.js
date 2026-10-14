import * as reportService from '../services/report.service.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { ApiError } from '../utils/apiError.js';

/**
 * Controller: Handles POST /api/reports
 * Follows strict MVCS pattern - Orchestrates input and delegates DB logic to service
 */
export const createReport = async (req, res, next) => {
  try {
    const reportData = req.validatedBody;
    const newReport = await reportService.createReport(reportData);

    const responsePayload = {
      tracking_id: newReport.tracking_id,
      status: newReport.status,
      predicted_category: newReport.predicted_category,
      domain: newReport.domain,
      severity: newReport.severity,
      is_urgent: newReport.is_urgent,
      safety_advisory: newReport.safety_advisory,
      confidence_score: newReport.confidence_score,
      classified_at: newReport.classified_at,
      created_at: newReport.created_at
    };

    return ApiResponse.send(
      res,
      201,
      responsePayload,
      'Crime incident report submitted successfully'
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Controller: Handles GET /api/reports/track/:trackingId
 */
export const trackReport = async (req, res, next) => {
  try {
    const { trackingId } = req.params;
    const report = await reportService.getReportByTrackingId(trackingId);

    if (!report) {
      throw ApiError.notFound(`Report not found with tracking ID: ${trackingId}`);
    }

    return ApiResponse.send(
      res,
      200,
      report.toPublicJSON(),
      'Report tracking details retrieved successfully'
    );
  } catch (error) {
    next(error);
  }
};

export default {
  createReport,
  trackReport
};
