import { prisma } from '../config/database';
import { AppError } from '../utils/app-error';

export class EventService {
  static async getAll(filters?: {
    cameraId?: string;
    bopId?: string;
    eventType?: string;
    severity?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }) {
    const page = filters?.page || 1;
    const limit = filters?.limit || 50;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (filters?.cameraId) {
      where.camera = { cameraCode: filters.cameraId };
    }
    if (filters?.bopId) {
      where.bop = { OR: [{ id: filters.bopId }, { code: filters.bopId }] };
    }
    if (filters?.eventType) {
      where.eventType = filters.eventType;
    }
    if (filters?.severity) {
      where.severity = filters.severity;
    }
    if (filters?.startDate || filters?.endDate) {
      where.timestamp = {};
      if (filters.startDate) where.timestamp.gte = new Date(filters.startDate);
      if (filters.endDate) where.timestamp.lte = new Date(filters.endDate);
    }

    const [events, total] = await Promise.all([
      prisma.event.findMany({
        where,
        include: {
          camera: { select: { cameraCode: true, name: true } },
          bop: { select: { code: true, name: true } },
          evidence: { select: { evidenceCode: true }, take: 1 },
        },
        orderBy: { timestamp: 'desc' },
        skip,
        take: limit,
      }),
      prisma.event.count({ where }),
    ]);

    return {
      data: events.map((evt: any) => ({
        eventId: evt.eventCode,
        cameraId: evt.camera.cameraCode,
        bopId: evt.bop.code,
        timestamp: evt.timestamp.toISOString(),
        eventType: evt.eventType,
        objectType: evt.objectType,
        trackId: evt.trackId,
        confidence: evt.confidence,
        zone: evt.zone,
        severity: evt.severity,
        threatScore: evt.threatScore,
        evidenceId: evt.evidence?.[0]?.evidenceCode || '',
        status: evt.status,
        direction: evt.direction,
      })),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  static async getById(id: string) {
    const event = await prisma.event.findFirst({
      where: { OR: [{ id }, { eventCode: id }] },
      include: {
        camera: { select: { cameraCode: true, name: true } },
        bop: { select: { code: true, name: true } },
        evidence: { select: { evidenceCode: true, evidenceType: true, verificationStatus: true } },
        alerts: { select: { alertCode: true, status: true, severity: true } },
      },
    });

    if (!event) throw AppError.notFound('Event not found');

    return {
      eventId: event.eventCode,
      cameraId: event.camera.cameraCode,
      bopId: event.bop.code,
      timestamp: event.timestamp.toISOString(),
      eventType: event.eventType,
      objectType: event.objectType,
      trackId: event.trackId,
      confidence: event.confidence,
      zone: event.zone,
      severity: event.severity,
      threatScore: event.threatScore,
      evidenceId: event.evidence?.[0]?.evidenceCode || '',
      status: event.status,
      direction: event.direction,
      evidence: event.evidence,
      alerts: event.alerts,
    };
  }

  static async create(data: {
    eventCode: string;
    eventType: string;
    objectType: string;
    cameraCode: string;
    bopCode: string;
    trackId?: number;
    confidence: number;
    zone: string;
    severity: string;
    threatScore: number;
    direction?: string;
  }) {
    const camera = await prisma.camera.findFirst({ where: { cameraCode: data.cameraCode } });
    if (!camera) throw AppError.notFound('Camera not found');

    const bop = await prisma.bop.findFirst({ where: { code: data.bopCode } });
    if (!bop) throw AppError.notFound('BOP not found');

    const event = await prisma.event.create({
      data: {
        eventCode: data.eventCode,
        eventType: data.eventType as any,
        objectType: data.objectType as any,
        cameraId: camera.id,
        bopId: bop.id,
        trackId: data.trackId,
        confidence: data.confidence,
        zone: data.zone,
        severity: data.severity as any,
        threatScore: data.threatScore,
        direction: data.direction,
        timestamp: new Date(),
      },
      include: {
        camera: { select: { cameraCode: true } },
        bop: { select: { code: true } },
      },
    });

    return {
      eventId: event.eventCode,
      cameraId: event.camera.cameraCode,
      bopId: event.bop.code,
      timestamp: event.timestamp.toISOString(),
      eventType: event.eventType,
      severity: event.severity,
      threatScore: event.threatScore,
    };
  }
}
