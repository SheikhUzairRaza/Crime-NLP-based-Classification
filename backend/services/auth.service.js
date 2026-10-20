import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { sequelize, Officer, RefreshToken } from '../models/index.js';
import { ApiError } from '../utils/apiError.js';

// Configuration
const ACCESS_SECRET = () => process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET || 'super_secret_access_jwt_key_crime_system_2026';
const REFRESH_SECRET = () => process.env.JWT_REFRESH_SECRET || 'super_secret_refresh_jwt_key_crime_system_2026';
const ACCESS_EXPIRY = () => process.env.ACCESS_TOKEN_EXPIRY || '15m';
const REFRESH_EXPIRY = () => process.env.REFRESH_TOKEN_EXPIRY || '7d';

/**
 * Generates an Access Token and a Refresh Token pair,
 * and records the refresh token in the database with is_revoked: false.
 * Supports passing an active transaction for atomic operations.
 *
 * @param {Officer} officer
 * @param {object} [options]
 * @param {import('sequelize').Transaction} [options.transaction]
 * @returns {Promise<{accessToken: string, refreshToken: string, expiresIn: string}>}
 */
export const generateTokenPair = async (officer, options = {}) => {
  const payload = { id: officer.id, role: officer.role };

  // 1. Generate Access Token (short-lived)
  const accessToken = jwt.sign(payload, ACCESS_SECRET(), {
    expiresIn: ACCESS_EXPIRY()
  });

  // 2. Generate Refresh Token (long-lived)
  const refreshToken = jwt.sign(payload, REFRESH_SECRET(), {
    expiresIn: REFRESH_EXPIRY()
  });

  // 3. Persist Refresh Token in Database (is_revoked: false)
  await RefreshToken.create(
    {
      officer_id: officer.id,
      token: refreshToken,
      is_revoked: false
    },
    { transaction: options.transaction }
  );

  return {
    accessToken,
    refreshToken,
    expiresIn: ACCESS_EXPIRY()
  };
};

/**
 * Authenticates an officer/admin
 * Returns exact same 'Invalid credentials' error for wrong email or wrong password
 * @param {string} email
 * @param {string} password
 * @returns {Promise<{officer: object, accessToken: string, refreshToken: string, expiresIn: string}>}
 */
export const login = async (email, password) => {
  // 1. Email se officer dhoondo
  const officer = await Officer.findOne({ where: { email } });

  // Ghalat email par wahi message ("Invalid credentials")
  if (!officer) {
    throw ApiError.unauthorized('Invalid credentials');
  }

  // 2. bcrypt.compare (asli password kabhi nahi)
  const isMatch = await bcrypt.compare(password, officer.password_hash);

  // Ghalat password par bhi ek hi message ("Invalid credentials")
  if (!isMatch) {
    throw ApiError.unauthorized('Invalid credentials');
  }

  // 3. Generate access & refresh token pair and record in DB
  const tokenPair = await generateTokenPair(officer);

  return {
    officer: {
      id: officer.id,
      name: officer.name,
      email: officer.email,
      role: officer.role
    },
    ...tokenPair
  };
};

/**
 * Validates a refresh token, safely revokes it, and issues a fresh token pair.
 *
 * Concurrency Safety & Replay Protection:
 * - Uses a Managed Database Transaction with Pessimistic Row Locking (`t.LOCK.UPDATE`).
 * - If multiple requests arrive concurrently with the same refresh token, only the first
 *   transaction acquires the lock, revokes the token, and issues new tokens.
 * - Any subsequent or replayed requests will read `is_revoked: true` and are rejected with 401.
 *
 * @param {string} incomingRefreshToken
 * @returns {Promise<{officer: object, accessToken: string, refreshToken: string, expiresIn: string}>}
 */
export const refreshAccessToken = async (incomingRefreshToken) => {
  if (!incomingRefreshToken) {
    throw ApiError.badRequest('Refresh token is required');
  }

  // 1. Verify Refresh Token cryptographic signature and expiration
  let decoded;
  try {
    decoded = jwt.verify(incomingRefreshToken, REFRESH_SECRET());
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw ApiError.unauthorized('Refresh token has expired');
    }
    throw ApiError.unauthorized('Invalid refresh token');
  }

  // 2. Handle refresh atomically inside a database transaction with row locking
  return await sequelize.transaction(async (t) => {
    // 1. Look for an active, unrevoked token record with exclusive row lock
    const tokenRecord = await RefreshToken.findOne({
      where: { token: incomingRefreshToken, is_revoked: false },
      order: [['id', 'DESC']],
      lock: t.LOCK.UPDATE,
      transaction: t
    });

    // If no active record exists, check if it was previously revoked
    if (!tokenRecord) {
      const revokedRecord = await RefreshToken.findOne({
        where: { token: incomingRefreshToken, is_revoked: true },
        order: [['id', 'DESC']],
        transaction: t
      });

      if (revokedRecord) {
        throw ApiError.unauthorized('Refresh token has already been used or revoked');
      }

      throw ApiError.unauthorized('Refresh token is invalid');
    }

    // 2. Revoke the active refresh token by setting is_revoked: true
    await tokenRecord.update({ is_revoked: true }, { transaction: t });

    // Find the associated officer
    const officer = await Officer.findByPk(tokenRecord.officer_id, { transaction: t });
    if (!officer) {
      throw ApiError.unauthorized('Associated officer not found');
    }

    // 3. Generate new access token and refresh token, saving in DB with is_revoked: false
    const tokenPair = await generateTokenPair(officer, { transaction: t });

    return {
      officer: {
        id: officer.id,
        name: officer.name,
        email: officer.email,
        role: officer.role
      },
      ...tokenPair
    };
  });
};

/**
 * Revokes a refresh token on logout
 * @param {string} refreshToken
 * @returns {Promise<boolean>}
 */
export const logout = async (refreshToken) => {
  if (refreshToken) {
    await RefreshToken.update(
      { is_revoked: true },
      { where: { token: refreshToken } }
    );
  }
  return true;
};

export default {
  login,
  generateTokenPair,
  refreshAccessToken,
  logout
};
