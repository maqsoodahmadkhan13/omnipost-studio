import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { config } from './config/env.js';
import { connectDB } from './config/db.js';
import { logger } from './utils/logger.js';
import { errorHandler } from './middleware/errorHandler.js';
import authRoutes from './routes/authRoutes.js';
import postRoutes from './routes/postRoutes.js';
import mediaRoutes from './routes/mediaRoutes.js';
import socialRoutes from './routes/socialRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';

const app = express();

// Security and utility middleware
app.use(helmet());
app.use(
  cors({
    origin: config.FRONTEND_URL,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/media', mediaRoutes);
app.use('/api/social-accounts', socialRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Health Check route
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'OmniPost Studio API is operational',
    timestamp: new Date().toISOString(),
    env: config.NODE_ENV
  });
});

// Fallback 404 handler
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
    code: 'ROUTE_NOT_FOUND'
  });
});

// Global Centralized Error Handler
app.use(errorHandler);

// Start server function
const startServer = async () => {
  try {
    // Attempt DB connection
    await connectDB().catch((err) => {
      logger.warn(`Initial MongoDB connection failed (server will still start): ${err.message}`);
    });

    const server = app.listen(config.PORT, () => {
      logger.info(`OmniPost Studio Server running on port ${config.PORT} [${config.NODE_ENV}]`);
    });

    return server;
  } catch (error) {
    logger.error(`Fatal Server Start Error: ${error.message}`);
    process.exit(1);
  }
};

// Auto start if executed directly
if (process.env.NODE_ENV !== 'test') {
  startServer();
}

export default app;
