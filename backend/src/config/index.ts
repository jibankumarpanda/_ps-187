import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const config = {
  port: parseInt(process.env.PORT || '4000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',

  // Database
  databaseUrl: process.env.DATABASE_URL || '',

  // JWT
  jwtSecret: process.env.JWT_SECRET || 'dev-jwt-secret-change-in-production-32chars',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret-change-in-prod-32ch',
  jwtAccessExpiry: process.env.JWT_ACCESS_EXPIRY || '15m',
  jwtRefreshExpiry: process.env.JWT_REFRESH_EXPIRY || '7d',

  // Encryption
  encryptionKey: process.env.ENCRYPTION_KEY || 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2',

  // Redis
  redisUrl: process.env.REDIS_URL || '',

  // AI
  aiMode: (process.env.AI_MODE || 'mock') as 'mock' | 'service',
  aiServiceUrl: process.env.AI_SERVICE_URL || 'http://localhost:8000',
  aiServiceTimeout: parseInt(process.env.AI_SERVICE_TIMEOUT || '5000', 10),
  aiApiKey: process.env.AI_API_KEY || 'ibvap-ai-dev-key-change-in-production',

  // Storage
  storageMode: (process.env.STORAGE_MODE || 'local') as 'minio' | 'local',
  minio: {
    endpoint: process.env.MINIO_ENDPOINT || 'localhost',
    port: parseInt(process.env.MINIO_PORT || '9000', 10),
    accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
    secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
    bucket: process.env.MINIO_BUCKET || 'ibvap-evidence',
    useSSL: process.env.MINIO_USE_SSL === 'true',
  },
  localStoragePath: process.env.LOCAL_STORAGE_PATH || './storage',

  // Blockchain
  blockchainMode: (process.env.BLOCKCHAIN_MODE || 'mock') as 'mock' | 'fabric',
  fabric: {
    channel: process.env.FABRIC_CHANNEL || 'evidence-channel',
    chaincode: process.env.FABRIC_CHAINCODE || 'ibvap-evidence-cc',
    mspId: process.env.FABRIC_MSP_ID || 'Org1MSP',
    peerEndpoint: process.env.FABRIC_PEER_ENDPOINT || 'localhost:7051',
    peerHostAlias: process.env.FABRIC_PEER_HOST_ALIAS || 'peer0.org1.example.com',
    tlsCertPath: process.env.FABRIC_TLS_CERT_PATH || '',
    certPath: process.env.FABRIC_CERT_PATH || '',
    keyPath: process.env.FABRIC_KEY_PATH || '',
  },

  // CORS
  corsOrigin: (process.env.CORS_ORIGIN || 'http://localhost:3000').split(',').map((o) => o.trim()),

  // Rate Limiting
  rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
  rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '10000', 10),
  authRateLimitMax: parseInt(process.env.AUTH_RATE_LIMIT_MAX || '100', 10),
};
