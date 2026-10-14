import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import { sequelize } from './models/index.js';
import reportRoutes from './routes/report.routes.js';
import { errorHandler } from './middlewares/error.middleware.js';
import { ApiResponse } from './utils/apiResponse.js';

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// -----------------------------------------------------------------------------
// Health Check Endpoint
// -----------------------------------------------------------------------------
app.get('/api/health', (req, res) => {
  return res.status(200).json({ status: 'ok' });
});

// -----------------------------------------------------------------------------
// API Routes
// -----------------------------------------------------------------------------
app.use('/api/reports', reportRoutes);

// -----------------------------------------------------------------------------
// Centralized Error Handling Middleware (must be after routes)
// -----------------------------------------------------------------------------
app.use(errorHandler);

// Start Server
app.listen(PORT, async () => {
  console.log(`[+] Backend server is running on http://localhost:${PORT}`);
  console.log(`[+] Health check URL: http://localhost:${PORT}/api/health`);

  try {
    await sequelize.authenticate();
    console.log('[+] Database connection verified successfully.');
  } catch (error) {
    console.warn('[-] Database connection pending:', error.message);
  }
});

export default app;
