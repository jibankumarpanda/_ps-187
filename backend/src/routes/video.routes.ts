import { Router } from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import {
  uploadVideo,
  updateProgress,
  getVideoJobByCamera,
  getVideoJobById,
  retryVideoJob
} from '../controllers/video.controller';
import { config } from '../config';
import { authenticate } from '../middleware/auth.middleware';
import { requireBopAccess, requirePermission } from '../middleware/rbac.middleware';
import { CameraService } from '../services/camera.service';

const router = Router();
const videoUploadDir = path.resolve(config.localStoragePath, 'videos', 'original');

fs.mkdirSync(videoUploadDir, { recursive: true });

// Configure multer for video upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, videoUploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});
const upload = multer({ storage });

// Video upload
router.post(
  '/:cameraId/upload',
  authenticate(),
  requirePermission('camera:create'),
  requireBopAccess((req) => CameraService.getCameraBopId(String(req.params.cameraId))),
  upload.single('video'),
  uploadVideo,
);

// Progress webhook called by ML worker
router.post('/:videoId/progress', updateProgress);

// Get latest video analysis for a camera
router.get(
  '/camera/:cameraId',
  authenticate(),
  requirePermission('camera:read'),
  requireBopAccess((req) => CameraService.getCameraBopId(String(req.params.cameraId))),
  getVideoJobByCamera
);

// Get video analysis by job ID
router.get(
  '/:videoId',
  authenticate(),
  getVideoJobById
);

// Retry / re-queue video analysis
router.post(
  '/:videoId/retry',
  authenticate(),
  requirePermission('camera:control'),
  retryVideoJob
);

export default router;

