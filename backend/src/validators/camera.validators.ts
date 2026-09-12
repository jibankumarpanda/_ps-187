import { z } from 'zod';

const streamUrlSchema = z.string().url().refine((value) => {
  const url = new URL(value);
  return ['rtsp:', 'rtsps:', 'http:', 'https:'].includes(url.protocol) && !url.username && !url.password;
}, 'Use an RTSP, RTSPS, HTTP, or HTTPS URL without embedded credentials');

const zoneSchema = z.object({
  name: z.string().min(2).max(100),
  zoneType: z.string().min(2).max(50).default('RESTRICTED'),
  coordinates: z.array(z.tuple([
    z.number().min(0).max(100),
    z.number().min(0).max(100),
  ])).min(3).max(32),
});

export const createCameraSchema = z.object({
  cameraCode: z.string().min(3),
  name: z.string().min(2),
  location: z.string().min(2),
  bopCode: z.string().min(2),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  resolution: z.string().optional(),
  streamUrl: streamUrlSchema.optional(),
  rtspUsername: z.string().optional(),
  rtspPassword: z.string().optional(),
  sourceType: z.enum(['RTSP', 'VIDEO']).optional(),
});

export const updateCameraSchema = z.object({
  name: z.string().min(2).optional(),
  location: z.string().min(2).optional(),
  resolution: z.string().optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  streamUrl: streamUrlSchema.optional(),
  rtspUsername: z.string().optional(),
  rtspPassword: z.string().optional(),
});

export const replaceCameraZonesSchema = z.object({
  zones: z.array(zoneSchema).min(1).max(10),
});
