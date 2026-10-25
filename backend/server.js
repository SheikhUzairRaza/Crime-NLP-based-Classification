import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './docs/swagger.js';
import { sequelize } from './models/index.js';
import reportRoutes from './routes/report.routes.js';
import authRoutes from './routes/auth.routes.js';
import adminRoutes from './routes/admin.routes.js';
import { authMiddleware } from './middlewares/auth.middleware.js';
import { errorHandler } from './middlewares/error.middleware.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware 
app.use(cors());
app.use(express.json());

// Serve static frontend testing UI
app.use(express.static(path.join(__dirname, 'public')));

// -----------------------------------------------------------------------------
// Interactive Swagger UI & OpenAPI Documentation
// -----------------------------------------------------------------------------
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.get('/api-docs.json', (req, res) => res.json(swaggerSpec));

// -----------------------------------------------------------------------------
// Health Check Endpoint
// -----------------------------------------------------------------------------
app.get('/api/v1/health', (req, res) => {
  return res.status(200).json({ status: 'ok', version: 'v1' });
});

// -----------------------------------------------------------------------------
// Admin & Public API Routes
// -----------------------------------------------------------------------------
app.use('/api/v1/reports', reportRoutes);
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/admin', authMiddleware, adminRoutes);

// Support /api/admin alias for triage routes
app.use('/api/admin', authMiddleware, adminRoutes);

// -----------------------------------------------------------------------------
// Centralized Error Handling Middleware (must be after routes)
// -----------------------------------------------------------------------------
app.use(errorHandler);

// Start Server
app.listen(PORT, async () => {
  console.log(`Backend server is running on http://localhost:${PORT}`);
  console.log(`Health check URL: http://localhost:${PORT}/api/v1/health`);
  console.log(`Swagger UI Docs: http://localhost:${PORT}/api-docs`);

  try {
    await sequelize.authenticate();
    console.log('Database connection verified successfully.');
  } catch (error) {
    console.warn('Database connection pending:', error.message);
  }
});

export default app;
