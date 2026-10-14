import * as authService from '../services/auth.service.js';
import { ApiResponse } from '../utils/apiResponse.js';

/**
 * Controller: Handles POST /api/v1/auth/login
 */
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.validatedBody;
    const authResult = await authService.login(email, password);

    return ApiResponse.send(res, 200, authResult, 'Login successful');
  } catch (error) {
    next(error);
  }
};

/**
 * Controller: Handles POST /api/v1/auth/refresh-token
 */
export const refreshToken = async (req, res, next) => {
  try {
    const { refreshToken: token } = req.validatedBody;
    const result = await authService.refreshAccessToken(token);

    return ApiResponse.send(res, 200, result, 'Token refreshed successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Controller: Handles POST /api/v1/auth/logout
 */
export const logout = async (req, res, next) => {
  try {
    const refreshToken = req.body?.refreshToken;
    await authService.logout(refreshToken);

    return ApiResponse.send(res, 200, null, 'Logged out successfully');
  } catch (error) {
    next(error);
  }
};

export default {
  login,
  refreshToken,
  logout
};
