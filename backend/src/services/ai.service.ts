import { EventType, ObjectType, Prisma, Severity } from '@prisma/client';
import { prisma } from '../config/database';
import { AppError } from '../utils/app-error';
import { ThreatService } from './threat.service';
import { WsEvents } from '../websocket/events';
import type { AiEventInput } from '../validators/ai.validators';
import { StorageClient } from '../integrations/storage/minio-client';
import { buildAnprMatchMetadata, normalizePlate, selectAnprWatchlistMatch, type WatchlistVehicle } from './anpr-watchlist';

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

const MIN_ANPR_MATCH_CONFIDENCE = 0.5;

function hasValidAnprMatchInput(input: { objectType: ObjectType; confidence: number; metadata: Record<string, unknown> }): boolean {
  const ocrConfidence = input.metadata.ocr_confidence;
  return input.objectType === 'PLATE'
    && Number.isFinite(input.confidence)
    && input.confidence >= MIN_ANPR_MATCH_CONFIDENCE
    && (ocrConfidence === undefined || (
      typeof ocrConfidence === 'number'
      && Number.isFinite(ocrConfidence)
      && ocrConfidence >= MIN_ANPR_MATCH_CONFIDENCE
    ));
}

function hasWatchlistMetadata(metadata: Record<string, unknown>): boolean {
  return Object.keys(metadata).some((key) => key === 'watchlist_match'
    || key === 'matched_plate'
    || key.startsWith('watchlist'));
}

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
    eventId: raw.eventId || raw.event_id,
    timestamp: raw.timestamp ? new Date(raw.timestamp) : new Date(),
    eventType: EVENT_TYPE_MAP[eventTypeRaw] || 'PERSON_DETECTED',
    objectType: OBJECT_TYPE_MAP[objectTypeRaw] || OBJECT_TYPE_MAP[objectTypeRaw.toUpperCase()] || 'PERSON',
    trackId: raw.trackId ?? raw.track_id,
    confidence: raw.confidence,
    bbox,
    zone,
    metadata: (raw.metadata ?? {}) as Record<string, unknown>,
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

function toEventPayload(event: any, cameraCode: string, bopCode: string) {
  return {
    eventId: event.eventCode,
    sourceEventId: event.id,
    cameraId: cameraCode,
    bopId: bopCode,
    timestamp: event.timestamp.toISOString(),
    eventType: event.eventType,
    objectType: event.objectType,
    trackId: event.trackId,
    confidence: event.confidence,
    zone: event.zone,
    severity: event.severity,
    threatScore: event.threatScore,
    status: event.status,
    metadata: event.metadata ?? undefined,
  };
}

function toAlertPayload(alert: any, eventCode: string, bopCode: string) {
  return {
    alertId: alert.alertCode,
    eventId: eventCode,
    cameraId: alert.cameraId,
    bopId: bopCode,
    timestamp: alert.timestamp.toISOString(),
    eventType: alert.eventType,
    severity: alert.severity,
    threatScore: alert.threatScore,
    status: alert.status,
    description: alert.description,
  };
}

function duplicateEventResult(event: any, alert: any, fallbackCameraCode: string, fallbackBopCode: string) {
  const cameraCode = event.camera?.cameraCode || fallbackCameraCode;
  const bopCode = event.bop?.code || fallbackBopCode;
  return {
    event: toEventPayload(event, cameraCode, bopCode),
    alert: alert ? toAlertPayload(alert, event.eventCode, bopCode) : undefined,
    threat: { score: event.threatScore, severity: event.severity, reasons: ['DUPLICATE_EVENT'] },
  };
}

function isUniqueConstraintError(error: unknown): boolean {
  return typeof error === 'object' && error !== null
    && 'code' in error && (error as { code?: unknown }).code === 'P2002';
}

export class AiService {
  static async ingestEvent(raw: AiEventInput) {
    let input = normalizeInput(raw);

    let camera = await prisma.camera.findFirst({
      where: {
        OR: [
          { cameraCode: input.cameraId },
          { id: input.cameraId },
          { cameraCode: { contains: input.cameraId.replace(/[_-]/g, ''), mode: 'insensitive' } },
          { cameraCode: { contains: input.cameraId, mode: 'insensitive' } },
          { cameraCode: input.cameraId.replace('_', '-') },
          { cameraCode: `BOP12-${input.cameraId.replace('_', '')}` },
        ],
      },
      include: { bop: { select: { id: true, code: true } } },
    });

    if (!camera) {
      const defaultBop = (await prisma.bop.findFirst({ where: { code: 'BOP-12' } })) || (await prisma.bop.findFirst());
      if (defaultBop) {
        camera = await prisma.camera.upsert({
          where: { cameraCode: input.cameraId },
          update: { status: 'ONLINE', aiStatus: 'ACTIVE' },
          create: {
            cameraCode: input.cameraId,
            name: `Surveillance Unit ${input.cameraId}`,
            location: 'Perimeter Sector',
            bopId: defaultBop.id,
            status: 'ONLINE',
            aiStatus: 'ACTIVE',
            fps: 25,
            latitude: 28.6139,
            longitude: 77.209,
          },
          include: { bop: { select: { id: true, code: true } } },
        });
      } else {
        throw AppError.notFound(`Camera not found: ${input.cameraId}`);
      }
    }

    const bopCode = camera.bop.code;
    if (input.bopId && input.bopId !== camera.bop.code && input.bopId !== 'UNKNOWN') {
      // Log warning or adapt instead of rejecting
    }

    if (input.objectType === 'PLATE' && !normalizePlate(input.metadata.plate)) {
      throw AppError.badRequest('Invalid ANPR plate');
    }

    if (input.eventId) {
      const existing = await prisma.event.findUnique({
        where: { id: input.eventId },
        include: {
          alerts: { take: 1, orderBy: { createdAt: 'asc' } },
          camera: { select: { cameraCode: true } },
          bop: { select: { code: true } },
        },
      });
      if (existing) {
        return duplicateEventResult(existing, existing.alerts[0], camera.cameraCode, bopCode);
      }
    }

    let watchlistMatch: WatchlistVehicle | null = null;
    if (input.eventType === 'ANPR_MATCH') {
      if (hasValidAnprMatchInput(input)) {
        let vehicles: WatchlistVehicle[] = [];
        try {
          vehicles = await prisma.watchlistVehicle.findMany({
            where: { status: 'ACTIVE' },
            select: {
              id: true,
              vehicleId: true,
              numberPlate: true,
              status: true,
              vehicleType: true,
              category: true,
              description: true,
              addedBy: true,
            },
          });
        } catch {
          vehicles = [];
        }
        watchlistMatch = selectAnprWatchlistMatch(input.metadata, vehicles);
      }
      input = {
        ...input,
        eventType: watchlistMatch ? 'ANPR_MATCH' : 'VEHICLE_DETECTED',
        metadata: buildAnprMatchMetadata(input.metadata, watchlistMatch),
      };
    } else if (hasWatchlistMetadata(input.metadata)) {
      input = {
        ...input,
        metadata: buildAnprMatchMetadata(input.metadata, null),
      };
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
    if (input.evidence && input.evidence.contentBase64) {
      const content = Buffer.from(input.evidence.contentBase64, 'base64');
      if (content.length > 0 && content.length <= 10 * 1024 * 1024) {
        const evidenceCode = await nextCode('EVD');
        const stored = await StorageClient.storeSnapshot(evidenceCode, content, input.evidence.mimeType || 'image/jpeg');
        storedEvidence = { evidenceCode, ...stored };
      }
    }

    let result: { event: { id: string; eventCode: string; timestamp: Date; eventType: EventType; objectType: ObjectType; trackId: number | null; confidence: number; zone: string; severity: Severity; threatScore: number; status: string }; alert: { alertCode: string; timestamp: Date; eventType: string; severity: Severity; threatScore: number; status: any; description: string }; evidence?: { evidenceCode: string; evidenceType: string; hash: string; timestamp: Date; verificationStatus: string } };
    try {
      result = await prisma.$transaction(async (tx: any) => {
        const event = await tx.event.create({
          data: {
            ...(input.eventId ? { id: input.eventId } : {}),
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
            metadata: input.metadata as Prisma.InputJsonValue,
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

        if (watchlistMatch) {
          await tx.watchlistVehicle.updateMany({
            where: {
              id: watchlistMatch.id,
              status: 'ACTIVE',
              OR: [
                { lastMatch: null },
                { lastMatch: { lt: input.timestamp } },
              ],
            },
            data: { lastMatch: input.timestamp },
          });
        }

        const customDesc = (input.metadata as any)?.description || (raw as any)?.description;
        const description = customDesc || buildDescription(input.eventType, input.objectType, input.zone, camera.cameraCode);
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
      if (input.eventId && isUniqueConstraintError(error)) {
        const existing = await prisma.event.findUnique({
          where: { id: input.eventId },
          include: {
            alerts: { take: 1, orderBy: { createdAt: 'asc' } },
            camera: { select: { cameraCode: true } },
            bop: { select: { code: true } },
          },
        });
        if (existing) {
          return duplicateEventResult(existing, existing.alerts[0], camera.cameraCode, bopCode);
        }
      }
      throw error;
    }

    const eventPayload = {
      ...toEventPayload(result.event, camera.cameraCode, bopCode),
      evidenceId: result.evidence?.evidenceCode,
    };

    const alertPayload = toAlertPayload(result.alert, result.event.eventCode, bopCode);

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
