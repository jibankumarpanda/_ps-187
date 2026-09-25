import { EventType, ObjectType, Severity } from '@prisma/client';
import { prisma } from '../config/database';
import { AppError } from '../utils/app-error';
import { ThreatService } from './threat.service';
import { WsEvents } from '../websocket/events';
import type { AiEventInput } from '../validators/ai.validators';
import { StorageClient } from '../integrations/storage/minio-client';

const EVENT_TYPE_MAP: Record<string, EventType> = {
  INTRUSION: 'INTRUSION',
  LOITERING: 'LOITERING',
  NIGHT_ACTIVITY: 'NIGHT_ACTIVITY',
  NIGHT_MOVEMENT: 'NIGHT_ACTIVITY',
  PERSON_DETECTED: 'PERSON_DETECTED',
  VEHICLE_DETECTED: 'VEHICLE_DETECTED',
  ANPR_MATCH: 'ANPR_MATCH',
  FACE_MATCH: 'FACE_MATCH',
  ABANDONED_OBJECT: 'ABANDONED_OBJECT',
  SUSPICIOUS_ACTIVITY: 'SUSPICIOUS_ACTIVITY',
  GATHERING: 'SUSPICIOUS_ACTIVITY',
  CROWD_GATHERING: 'SUSPICIOUS_ACTIVITY',
};

const OBJECT_TYPE_MAP: Record<string, ObjectType> = {
  PERSON: 'PERSON',
  person: 'PERSON',
  VEHICLE: 'VEHICLE',
  vehicle: 'VEHICLE',
  car: 'VEHICLE',
  bus: 'VEHICLE',
  truck: 'VEHICLE',
  motorbike: 'VEHICLE',
  bicycle: 'VEHICLE',
  FACE: 'FACE',
  face: 'FACE',
  PLATE: 'PLATE',
  plate: 'PLATE',
  OBJECT: 'OBJECT',
  object: 'OBJECT',
};

function normalizeInput(raw: AiEventInput) {
  const eventTypeRaw = (raw.eventType || raw.event_type || '').toUpperCase();
  const objectTypeRaw = raw.objectType || raw.object_type || 'PERSON';
  const bbox = raw.bbox || raw.bounding_box;
  const zone =
    raw.zone ||
    raw.zoneId ||
    raw.zone_id ||
    (raw.metadata?.zone as string | undefined) ||
    'UNKNOWN';

  return {
    cameraId: raw.cameraId || raw.camera_id!,
    bopId: raw.bopId || raw.bop_id,
    timestamp: raw.timestamp ? new Date(raw.timestamp) : new Date(),
    eventType: EVENT_TYPE_MAP[eventTypeRaw] || 'PERSON_DETECTED',
    objectType: OBJECT_TYPE_MAP[objectTypeRaw] || OBJECT_TYPE_MAP[objectTypeRaw.toUpperCase()] || 'PERSON',
    trackId: raw.trackId ?? raw.track_id,
    confidence: raw.confidence,
    bbox,
    zone,
    metadata: raw.metadata || {},
    evidence: raw.evidence,
  };
}

async function nextCode(prefix: 'EVT' | 'ALT' | 'EVD'): Promise<string> {
  if (prefix === 'EVT') {
    const latest = await prisma.event.findFirst({
      orderBy: { createdAt: 'desc' },
      select: { eventCode: true },
    });
    let num = 10001;
    if (latest?.eventCode) {
      const parsed = parseInt(latest.eventCode.replace('EVT-', ''), 10);
      if (!Number.isNaN(parsed)) num = parsed + 1;
    }
    return `EVT-${num}`;
  }

  if (prefix === 'EVD') {
    const latest = await prisma.evidence.findFirst({
      orderBy: { createdAt: 'desc' },
      select: { evidenceCode: true },
    });
    let num = 10001;
    if (latest?.evidenceCode) {
      const parsed = parseInt(latest.evidenceCode.replace('EVD-', ''), 10);
      if (!Number.isNaN(parsed)) num = parsed + 1;
    }
    return `EVD-${num}`;
  }

  const latest = await prisma.alert.findFirst({
    orderBy: { createdAt: 'desc' },
    select: { alertCode: true },
  });
  let num = 10001;
  if (latest?.alertCode) {
    const parsed = parseInt(latest.alertCode.replace('ALT-', ''), 10);
    if (!Number.isNaN(parsed)) num = parsed + 1;
  }
  return `ALT-${num}`;
}

function buildDescription(eventType: string, objectType: string, zone: string, cameraCode: string): string {
  const label = eventType.replace(/_/g, ' ').toLowerCase();
  return `${objectType} ${label} detected at ${zone} (${cameraCode}).`;
}

export class AiService {
  static async ingestEvent(raw: AiEventInput) {
    const input = normalizeInput(raw);

    const camera = await prisma.camera.findFirst({
      where: { cameraCode: input.cameraId },
      include: { bop: { select: { id: true, code: true } } },
    });
    if (!camera) {
      throw AppError.notFound(`Camera not found: ${input.cameraId}`);
    }

    const bopCode = camera.bop.code;
    if (input.bopId && input.bopId !== camera.bop.code) {
      throw AppError.badRequest(`Camera ${input.cameraId} does not belong to BOP ${input.bopId}`);
    }

    const hour = input.timestamp.getHours();
    const isNightActivity = hour >= 22 || hour < 6;
    const isRestrictedZone = input.zone.toLowerCase().includes('restrict') || input.eventType === 'INTRUSION';
    const isLoitering = input.eventType === 'LOITERING';

    const threat = ThreatService.calculate({
      confidence: input.confidence,
      eventType: input.eventType,
      isRestrictedZone,
      isNightActivity,
      isLoitering,
      isWatchlistMatch: input.eventType === 'FACE_MATCH' || input.eventType === 'ANPR_MATCH',
      cameraRisk: camera.status === 'ONLINE' ? 0.5 : 0.8,
      bopRisk: 0.5,
    });

    const eventCode = await nextCode('EVT');
    const alertCode = await nextCode('ALT');
    const severity = threat.severity as Severity;

    let storedEvidence: { evidenceCode: string; filePath: string; hash: string; fileSizeKB: number } | undefined;
    if (severity === 'CRITICAL' && input.evidence) {
      const content = Buffer.from(input.evidence.contentBase64, 'base64');
      if (!content.length || content.length > 7 * 1024 * 1024) {
        throw AppError.badRequest('Evidence snapshot is empty or exceeds the 7 MB limit');
      }
      const evidenceCode = await nextCode('EVD');
      const stored = await StorageClient.storeSnapshot(evidenceCode, content, input.evidence.mimeType);
      storedEvidence = { evidenceCode, ...stored };
    }

    let result: { event: { id: string; eventCode: string; timestamp: Date; eventType: EventType; objectType: ObjectType; trackId: number | null; confidence: number; zone: string; severity: Severity; threatScore: number; status: string }; alert: { alertCode: string; timestamp: Date; eventType: string; severity: Severity; threatScore: number; status: any; description: string }; evidence?: { evidenceCode: string; evidenceType: string; hash: string; timestamp: Date; verificationStatus: string } };
    try {
      result = await prisma.$transaction(async (tx) => {
        const event = await tx.event.create({
          data: {
            eventCode,
            eventType: input.eventType,
            objectType: input.objectType,
            cameraId: camera.id,
            bopId: camera.bop.id,
            trackId: input.trackId,
            confidence: input.confidence,
            zone: input.zone,
            severity,
            threatScore: threat.score,
            timestamp: input.timestamp,
          },
        });

        if (input.bbox) {
          await tx.detection.create({
            data: {
              eventId: event.id,
              cameraId: camera.id,
              objectType: input.objectType,
              trackId: input.trackId ?? 0,
              confidence: input.confidence,
              bboxX: input.bbox[0],
              bboxY: input.bbox[1],
              bboxW: input.bbox[2] - input.bbox[0],
              bboxH: input.bbox[3] - input.bbox[1],
              label: input.objectType,
              timestamp: input.timestamp,
            },
          });
        }

        const description = buildDescription(input.eventType, input.objectType, input.zone, camera.cameraCode);
        const alert = await tx.alert.create({
          data: {
            alertCode,
            eventId: event.id,
            cameraId: camera.id,
            bopId: camera.bop.id,
            eventType: input.eventType,
            severity,
            threatScore: threat.score,
            description,
            timestamp: input.timestamp,
          },
        });

        const evidence = storedEvidence ? await tx.evidence.create({
          data: {
            evidenceCode: storedEvidence.evidenceCode,
            evidenceType: 'SNAPSHOT',
            hash: storedEvidence.hash,
            filePath: storedEvidence.filePath,
            fileSizeKB: storedEvidence.fileSizeKB,
            recordedBy: 'AI_SERVICE',
            recordedOrg: 'IBVAP',
            timestamp: input.timestamp,
            eventId: event.id,
            cameraId: camera.id,
            bopId: camera.bop.id,
          },
        }) : undefined;

        await tx.camera.update({
          where: { id: camera.id },
          data: { lastSeen: new Date(), aiStatus: 'ACTIVE' },
        });

        return { event, alert, evidence };
      });
    } catch (error) {
      if (storedEvidence) await StorageClient.remove(storedEvidence.filePath).catch(() => undefined);
      throw error;
    }

    const eventPayload = {
      eventId: result.event.eventCode,
      cameraId: camera.cameraCode,
      bopId: bopCode,
      timestamp: result.event.timestamp.toISOString(),
      eventType: result.event.eventType,
      objectType: result.event.objectType,
      trackId: result.event.trackId,
      confidence: result.event.confidence,
      zone: result.event.zone,
      severity: result.event.severity,
      threatScore: result.event.threatScore,
      status: result.event.status,
      evidenceId: result.evidence?.evidenceCode,
    };

    const alertPayload = {
      alertId: result.alert.alertCode,
      eventId: result.event.eventCode,
      cameraId: camera.cameraCode,
      bopId: bopCode,
      timestamp: result.alert.timestamp.toISOString(),
      eventType: result.alert.eventType,
      severity: result.alert.severity,
      threatScore: result.alert.threatScore,
      status: result.alert.status,
      description: result.alert.description,
    };

    WsEvents.newEvent(bopCode, eventPayload);
    WsEvents.newAlert(bopCode, alertPayload);
    if (result.evidence) {
      WsEvents.evidenceCreated(bopCode, {
        evidenceId: result.evidence.evidenceCode,
        eventId: result.event.eventCode,
        cameraId: camera.cameraCode,
        bopId: bopCode,
        evidenceType: result.evidence.evidenceType,
        hash: result.evidence.hash,
        verificationStatus: result.evidence.verificationStatus,
        timestamp: result.evidence.timestamp.toISOString(),
      });
    }

    return {
      event: eventPayload,
      alert: alertPayload,
      threat: { score: threat.score, severity: threat.severity, reasons: threat.reasons },
    };
  }
}
