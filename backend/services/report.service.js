import { Report } from '../models/Report.js';
import { Officer } from '../models/Officer.js';
import { mlClient } from './ml.client.js';

/**
 * Creates a new crime report with ML classification and database persistence
 * @param {object} reportData - Validated citizen input data
 * @returns {Promise<Report>} Created Sequelize Report instance
 */
export const createReport = async (reportData) => {
  // 1. ML classification via FastAPI
  const mlData = await mlClient.classify(reportData.description);

  // 2. Generate standard tracking ID (CRIME-YYYY-XXXXXXXXXX)
  const trackingId = Report.generateTrackingId();

  // 3. Database persistence
  const newReport = await Report.create({
    tracking_id: trackingId,
    citizen_name: reportData.citizen_name,
    contact_number: reportData.contact_number,
    incident_location: reportData.incident_location,
    incident_date: new Date(reportData.incident_date),
    description: reportData.description,
    predicted_category: mlData?.predicted_category || null,
    domain: mlData?.domain || null,
    confidence_score: mlData?.confidence_score || null,
    severity: mlData?.severity || null,
    is_urgent: mlData?.is_urgent || false,
    safety_advisory: mlData?.safety_advisory || null,
    top_candidates: mlData?.top_candidates || null,
    classified_at: mlData?.classified_at || null,
    status: 'Pending'
  });

  return newReport;
};

/**
 * Retrieves a report by tracking ID with assigned officer details
 * @param {string} trackingId
 * @returns {Promise<Report|null>}
 */
export const getReportByTrackingId = async (trackingId) => {
  return Report.findOne({
    where: { tracking_id: trackingId },
    include: [
      {
        model: Officer,
        as: 'officer',
        attributes: ['id', 'name', 'email', 'role']
      }
    ]
  });
};

/**
 * Retrieves reports with filtering
 * @param {object} filters
 * @returns {Promise<{rows: Report[], count: number}>}
 */
export const getReports = async (filters = {}) => {
  const whereClause = {};

  if (filters.domain) whereClause.domain = filters.domain;
  if (filters.severity) whereClause.severity = filters.severity;
  if (filters.status) whereClause.status = filters.status;
  if (typeof filters.is_urgent === 'boolean') whereClause.is_urgent = filters.is_urgent;

  return Report.findAndCountAll({
    where: whereClause,
    order: [
      ['is_urgent', 'DESC'],
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
};

export default {
  createReport,
  getReportByTrackingId,
  getReports
};
