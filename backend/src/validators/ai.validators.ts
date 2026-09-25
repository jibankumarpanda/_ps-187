import { z } from 'zod';

/** Standard IBVAP AI detection payload (camelCase or snake_case). */
export const aiEventSchema = z.object({
  cameraId: z.string().min(1).optional(),
  camera_id: z.string().min(1).optional(),
  bopId: z.string().min(1).optional(),
  bop_id: z.string().min(1).optional(),
  timestamp: z.string().optional(),
  eventId: z.string().min(1).optional(),
  event_id: z.string().min(1).optional(),
  eventType: z.string().min(1).optional(),
  event_type: z.string().min(1).optional(),
  objectType: z.string().min(1).optional(),
  object_type: z.string().min(1).optional(),
  trackId: z.number().int().optional(),
  track_id: z.number().int().optional(),
  confidence: z.number().min(0).max(1),
  bbox: z.array(z.number()).length(4).optional(),
  bounding_box: z.array(z.number()).length(4).optional(),
  zoneId: z.string().optional(),
  zone_id: z.string().optional(),
  zone: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
  evidence: z.object({
    contentBase64: z.string().min(1),
    mimeType: z.enum(['image/jpeg', 'image/png']).default('image/jpeg'),
  }).optional(),
}).refine(
  (data) => !!(data.cameraId || data.camera_id),
  { message: 'cameraId is required', path: ['cameraId'] },
).refine(
  (data) => !!(data.eventType || data.event_type),
  { message: 'eventType is required', path: ['eventType'] },
);

export type AiEventInput = z.infer<typeof aiEventSchema>;

export const aiCameraStatusSchema = z.object({
  cameraId: z.string().min(1),
  status: z.enum(['ONLINE', 'OFFLINE', 'DEGRADED']),
  aiStatus: z.enum(['ACTIVE', 'INACTIVE', 'ERROR']),
  fps: z.number().min(0).max(240).optional(),
  message: z.string().max(500).optional(),
});

export type AiCameraStatusInput = z.infer<typeof aiCameraStatusSchema>;
