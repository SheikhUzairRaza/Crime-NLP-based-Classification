import rateLimit from 'express-rate-limit';
import { ApiError } from '../utils/apiError.js';

/**
 * Rate Limiter for Crime Report Submission:
 * Limits client IP to 5 complaint submissions per hour.
 * Prevents spam flooding and denial of service on reporting infrastructure.
 */
export const reportCreationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 requests per hour per IP
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next) => {
    next(
      ApiError.tooManyRequests(
        'Too many reports submitted from this IP address. Maximum allowed is 5 reports per hour.'
      )
    );
  }
});

/**
 * Rate Limiter for Citizen Tracking Status:
 * Limits client IP to 30 lookups per 15 minutes.
 * Prevents automated enumeration of public tracking IDs.
 */
export const trackingLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // 30 requests per 15 minutes per IP
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next) => {
    next(
      ApiError.tooManyRequests(
        'Too many tracking requests from this IP address. Maximum allowed is 30 lookups per 15 minutes.'
      )
    );
  }
});

export default {
  reportCreationLimiter,
  trackingLimiter
};
