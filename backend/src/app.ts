import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import swaggerUi from 'swagger-ui-express';
import { config } from './config';
import { swaggerSpec } from './config/swagger';
import { errorHandler } from './middleware/error-handler';
import { generalLimiter } from './middleware/rate-limiter';

// Routes
import authRoutes from './routes/auth.routes';
import bopRoutes from './routes/bop.routes';
import cameraRoutes from './routes/camera.routes';
import eventRoutes from './routes/event.routes';
import alertRoutes from './routes/alert.routes';
import evidenceRoutes from './routes/evidence.routes';
import blockchainRoutes from './routes/blockchain.routes';
import watchlistRoutes from './routes/watchlist.routes';
import analyticsRoutes from './routes/analytics.routes';
import systemRoutes from './routes/system.routes';
import aiRoutes from './routes/ai.routes';
import videoRoutes from './routes/video.routes';

const app = express();

// Security middleware
app.use(helmet());
app.use(cors({ origin: config.corsOrigin, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());

// Logging
if (!config.isProduction) {
  app.use(morgan('dev'));
}

// Swagger UI
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// General rate limiting
app.use('/api', generalLimiter);

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/bops', bopRoutes);
app.use('/api/cameras', cameraRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/evidence', evidenceRoutes);
app.use('/api/blockchain', blockchainRoutes);
app.use('/api/watchlist', watchlistRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/system', systemRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/videos', videoRoutes);

// Error Handler
app.use(errorHandler);

export default app;
