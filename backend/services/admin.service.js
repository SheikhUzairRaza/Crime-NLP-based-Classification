import { sequelize, Report, Officer } from '../models/index.js';
import { ApiError } from '../utils/apiError.js';
import { mlClient } from './ml.client.js';

/**
 * 5a. GET /api/v1/admin/reports
 * Retrieves paginated crime reports with dynamic filtering and severity/urgency triage sorting
 * 
 * @param {object} query - Validated query parameters
 * @returns {Promise<{total: number, page: number, limit: number, pages: number, reports: Report[]}>}
 */
export const getTriageReports = async (query = {}) => {
  const {
    domain,
    severity,
    category,
    status,
    officer_id,
    is_urgent,
    page = 1,
    limit = 20
  } = query;

  // Build dynamic where clause - only apply filters present in query
  const whereClause = {};

  if (domain) {
    whereClause.domain = domain;
  }

  if (severity) {
    whereClause.severity = severity;
  }

  if (category) {
    // Client may pass URL-encoded category name (e.g. "Robbery & Armed Snatching")
    whereClause.predicted_category = category;
  }

  if (status) {
    whereClause.status = status;
  }

  if (officer_id !== undefined) {
    if (officer_id === 'unassigned' || officer_id === null) {
      whereClause.officer_id = null;
    } else {
      whereClause.officer_id = officer_id;
    }
  }

  if (is_urgent !== undefined) {
    whereClause.is_urgent = is_urgent;
  }

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.max(1, parseInt(limit, 10) || 20);
  const offset = (pageNum - 1) * limitNum;

  // Triage sorting:
  // 1. is_urgent DESC (urgent incidents first)
  // 2. CASE severity: Critical (1), High (2), Medium (3), NULL unclassified (4), Other (5)
  // 3. created_at DESC (newest first)
  const severitySortLiteral = sequelize.literal(
    `CASE 
       WHEN \`Report\`.\`severity\` = 'Critical' THEN 1 
       WHEN \`Report\`.\`severity\` = 'High' THEN 2 
       WHEN \`Report\`.\`severity\` = 'Medium' THEN 3 
       WHEN \`Report\`.\`severity\` IS NULL THEN 4 
       ELSE 5 
     END`
  );

  const { count, rows } = await Report.findAndCountAll({
    where: whereClause,
    limit: limitNum,
    offset,
    order: [
      ['is_urgent', 'DESC'],
      [severitySortLiteral, 'ASC'],
      ['created_at', 'DESC']
    ],
    include: [
      {
        model: Officer,
        as: 'officer',
        attributes: ['id', 'name', 'email', 'role']
      }
    ]
  });

  const totalPages = Math.ceil(count / limitNum) || (count === 0 ? 0 : 1);

  return {
    total: count,
    page: pageNum,
    limit: limitNum,
    pages: totalPages,
    reports: rows
  };
};

/**
 * Retrieves reports specifically assigned to the authenticated officer
 * 
 * @param {number} officerId - ID of logged-in officer
 * @param {object} query - Validated query parameters
 * @returns {Promise<{total: number, page: number, limit: number, pages: number, reports: Report[]}>}
 */
export const getMyAssignedTasks = async (officerId, query = {}) => {
  return await getTriageReports({
    ...query,
    officer_id: officerId
  });
};

/**
 * 5b. GET /api/v1/admin/reports/:id
 * Retrieves full report details along with assigned officer info
 * 
 * @param {number|string} id - Report ID
 * @returns {Promise<Report>}
 */
export const getReportById = async (id) => {
  const report = await Report.findByPk(id, {
    include: [
      {
        model: Officer,
        as: 'officer',
        attributes: ['id', 'name', 'email', 'role']
      }
    ]
  });

  if (!report) {
    throw ApiError.notFound('Report not found');
  }

  return report;
};

/**
 * 5c. PATCH /api/v1/admin/reports/:id
 * Updates report status, assigned officer, and appends officer investigation notes
 * 
 * @param {number|string} id - Report ID
 * @param {object} updateData - Body containing status, officer_id, officer_notes
 * @param {object} currentUser - Authenticated user payload from req.user
 * @returns {Promise<Report>}
 */
export const updateReport = async (id, updateData = {}, currentUser = {}) => {
  const report = await Report.findByPk(id);

  if (!report) {
    throw ApiError.notFound('Report not found');
  }

  // Allowed status values for triage updates: Under Investigation, Resolved, Dismissed
  const allowedStatuses = ['Under Investigation', 'Resolved', 'Dismissed'];

  // 1. Validate status if provided
  if (updateData.status !== undefined) {
    if (!allowedStatuses.includes(updateData.status)) {
      throw ApiError.badRequest(
        `Invalid status. Status must be one of: ${allowedStatuses.join(', ')}`
      );
    }
    report.status = updateData.status;
  }

  // 2. Validate officer_id if provided
  if (updateData.officer_id !== undefined) {
    if (updateData.officer_id !== null) {
      const assignedOfficer = await Officer.findByPk(updateData.officer_id);
      if (!assignedOfficer) {
        throw ApiError.badRequest('Officer not found');
      }
      report.officer_id = updateData.officer_id;
    } else {
      report.officer_id = null;
    }
  }

  // 3. Append officer investigation notes (never replace)
  if (updateData.officer_notes && typeof updateData.officer_notes === 'string') {
    const trimmedNote = updateData.officer_notes.trim();
    if (trimmedNote) {
      // Resolve officer name from req.user or DB
      let officerName = currentUser?.name;
      if (!officerName && currentUser?.id) {
        const actingOfficer = await Officer.findByPk(currentUser.id);
        officerName = actingOfficer?.name;
      }
      officerName = officerName || 'Officer';

      const line = `[${new Date().toISOString()}] ${officerName}: ${trimmedNote}`;
      report.officer_notes = report.officer_notes
        ? `${report.officer_notes}\n${line}`
        : line;
    }
  }

  await report.save();

  // Reload report with associated officer
  await report.reload({
    include: [
      {
        model: Officer,
        as: 'officer',
        attributes: ['id', 'name', 'email', 'role']
      }
    ]
  });

  return report;
};

/**
 * Phase 6: GET /api/v1/admin/stats
 * Aggregates crime triage analytics using database GROUP BY queries without loading rows into memory
 * 
 * @returns {Promise<{total: number, by_domain: object, by_severity: object, top_categories: Array<{category: string, count: number}>}>}
 */
export const getStats = async () => {
  // 1. Total reports count
  const total = await Report.count();

  // 2. Counts grouped by domain: Report.count({ group: ['domain'] })
  const domainCounts = await Report.count({ group: ['domain'] });

  // 3. Counts grouped by severity: Report.count({ group: ['severity'] })
  const severityCounts = await Report.count({ group: ['severity'] });

  // 4. Top 5 categories ordered by count DESC
  const topCategoriesRows = await Report.findAll({
    attributes: [
      ['predicted_category', 'category'],
      [sequelize.fn('COUNT', sequelize.col('id')), 'count']
    ],
    group: ['predicted_category'],
    order: [[sequelize.literal('count'), 'DESC']],
    limit: 5,
    raw: true
  });

  // Format by_domain map
  const by_domain = {};
  domainCounts.forEach((item) => {
    by_domain[item.domain || 'Unclassified'] = parseInt(item.count, 10);
  });

  // Format by_severity map
  const by_severity = {};
  severityCounts.forEach((item) => {
    by_severity[item.severity || 'Unclassified'] = parseInt(item.count, 10);
  });

  // Format top_categories list
  const top_categories = topCategoriesRows.map((item) => ({
    category: item.category || 'Unclassified',
    count: parseInt(item.count, 10)
  }));

  return {
    total,
    by_domain,
    by_severity,
    top_categories
  };
};

/**
 * Phase 7: POST /api/v1/admin/reports/:id/reclassify
 * Re-runs ML classification for a report (especially unclassified ones) and updates ML attributes
 * 
 * @param {number|string} id - Report ID
 * @returns {Promise<Report>}
 */
export const reclassifyReport = async (id) => {
  const report = await Report.findByPk(id);

  if (!report) {
    throw ApiError.notFound('Report not found');
  }

  // Call ML microservice
  const mlData = await mlClient.classify(report.description);

  if (!mlData || !mlData.predicted_category) {
    throw ApiError.internal('ML classification service failed to return category prediction');
  }

  // Update ML triage fields
  report.predicted_category = mlData.predicted_category;
  report.domain = mlData.domain || null;
  report.confidence_score = mlData.confidence_score || null;
  report.severity = mlData.severity || null;
  report.is_urgent = mlData.is_urgent || false;
  report.safety_advisory = mlData.safety_advisory || null;
  report.top_candidates = mlData.top_candidates || null;
  report.classified_at = new Date();

  await report.save();

  await report.reload({
    include: [
      {
        model: Officer,
        as: 'officer',
        attributes: ['id', 'name', 'email', 'role']
      }
    ]
  });

  return report;
};

export default {
  getTriageReports,
  getReportById,
  updateReport,
  getStats,
  reclassifyReport
};
