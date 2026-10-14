import jwt from 'jsonwebtoken';
import { ApiError } from '../utils/apiError.js';

/**
 * Authentication Middleware:
 * Reads Authorization header: 'Bearer <token>'
 * Verifies with JWT_SECRET, stores decoded user in req.user
 * Returns standardized 401 if token is missing, invalid, or expired
 */
export const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(ApiError.unauthorized('Authentication token missing or invalid'));
  }

  const token = authHeader.split(' ')[1];

  try {
    const jwtSecret = process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET || 'super_secret_access_jwt_key_crime_system_2026';
    const decoded = jwt.verify(token, jwtSecret);
    req.user = decoded; // { id, role, iat, exp }
    next();
  } catch (error) {
    return next(ApiError.unauthorized('Invalid or expired authentication token'));
  }
};

export default authMiddleware;
