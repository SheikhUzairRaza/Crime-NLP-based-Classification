import { Router } from 'express';
import { login, refreshToken, logout } from '../controllers/auth.controller.js';
import { validate } from '../middlewares/validate.middleware.js';
import { loginSchema, refreshTokenSchema } from '../validations/auth.validation.js';

const router = Router();

// POST /api/v1/auth/login
router.post('/login', validate(loginSchema), login);

// POST /api/v1/auth/refresh-token
router.post('/refresh-token', validate(refreshTokenSchema), refreshToken);

// POST /api/v1/auth/logout
router.post('/logout', logout);

export default router;
