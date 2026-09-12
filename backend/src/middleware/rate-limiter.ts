import rateLimit from 'express-rate-limit';
import { config } from '../config';

/**
 * General API rate limiter.
 */
export const generalLimiter = rateLimit({
  windowMs: config.rateLimitWindowMs,
  max: config.isProduction ? config.rateLimitMaxRequests : 50000,
  skip: (req) => {
    // Exempt internal ML worker progress reports and system health checks from rate limiting
    return req.path.includes('/progress') || req.path.includes('/health') || !config.isProduction;
  },
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMITED',
      message: 'Too many requests, please try again later',
    },
  },
});

/**
 * Strict rate limiter for auth endpoints.
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: config.authRateLimitMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMITED',
      message: 'Too many authentication attempts, please try again later',
    },
  },
});

/**
 * Camera control rate limiter.
 */
export const cameraControlLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMITED',
      message: 'Too many camera control requests',
    },
  },
});

/**
 * Evidence verification rate limiter.
 */
export const evidenceVerifyLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMITED',
      message: 'Too many verification requests',
    },
  },
});
