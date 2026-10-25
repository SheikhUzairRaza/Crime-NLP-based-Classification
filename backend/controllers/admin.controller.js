import * as adminService from '../services/admin.service.js';
import { ApiResponse } from '../utils/apiResponse.js';

/**
 * Controller: Handles 5a. GET /api/v1/admin/reports
 * Supports query filters (domain, severity, category, status, is_urgent)
 * and pagination (?page=1&limit=20) with triage sorting
 */
export const getAdminReports = async (req, res, next) => {
  try {
    const query = req.validatedQuery || req.query;
    const result = await adminService.getTriageReports(query);

    return ApiResponse.send(
      res,
      200,
      result,
      'Admin reports retrieved successfully'
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Controller: Handles GET /api/v1/admin/reports/my-tasks
 * Retrieves reports specifically assigned to the currently authenticated officer
 */
export const getMyTasks = async (req, res, next) => {
  try {
    const officerId = req.user?.id;
    const query = req.validatedQuery || req.query;
    const result = await adminService.getMyAssignedTasks(officerId, query);

    return ApiResponse.send(
      res,
      200,
      result,
      'Officer assigned tasks retrieved successfully'
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Controller: Handles 5b. GET /api/v1/admin/reports/:id
 * Returns full report record with assigned officer details (or 404)
 */
export const getAdminReportById = async (req, res, next) => {
  try {
    const reportId = req.validatedParams?.id || req.params.id;
    const report = await adminService.getReportById(reportId);

    return ApiResponse.send(
      res,
      200,
      report,
      'Report retrieved successfully'
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Controller: Handles 5c. PATCH /api/v1/admin/reports/:id
 * Updates status, assigned officer_id, and appends officer_notes
 */
export const updateAdminReport = async (req, res, next) => {
  try {
    const reportId = req.validatedParams?.id || req.params.id;
    const updateData = req.validatedBody || req.body;
    const updatedReport = await adminService.updateReport(reportId, updateData, req.user);

    return ApiResponse.send(
      res,
      200,
      updatedReport,
      'Report updated successfully'
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Controller: Handles Phase 6. GET /api/v1/admin/stats
 * Aggregates crime incident stats via direct SQL GROUP BY
 */
export const getAdminStats = async (req, res, next) => {
  try {
    const stats = await adminService.getStats();

    return ApiResponse.send(
      res,
      200,
      stats,
      'Admin statistics retrieved successfully'
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Controller: Handles Phase 7. POST /api/v1/admin/reports/:id/reclassify
 * Triggers re-classification of report via ML microservice
 */
export const reclassifyAdminReport = async (req, res, next) => {
  try {
    const reportId = req.validatedParams?.id || req.params.id;
    const reclassifiedReport = await adminService.reclassifyReport(reportId);

    return ApiResponse.send(
      res,
      200,
      reclassifiedReport,
      'Report reclassified successfully'
    );
  } catch (error) {
    next(error);
  }
};

export default {
  getAdminReports,
  getMyTasks,
  getAdminReportById,
  updateAdminReport,
  getAdminStats,
  reclassifyAdminReport
};
