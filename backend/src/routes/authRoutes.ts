import { Router } from 'express';
import { register, login, refreshToken, logout } from '../controllers/authController';
import { validateBody } from '../middleware';
import { registerSchema, loginSchema, refreshTokenSchema } from '../schemas/authSchemas';

const router = Router();

// POST /auth/register - Register a new user
router.post('/register', validateBody(registerSchema), register);

// POST /auth/login - Login user
router.post('/login', validateBody(loginSchema), login);

// POST /auth/refresh - Refresh access token
router.post('/refresh', validateBody(refreshTokenSchema), refreshToken);

// POST /auth/logout - Logout user
router.post('/logout', validateBody(refreshTokenSchema), logout);

export default router;