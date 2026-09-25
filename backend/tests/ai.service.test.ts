import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const tx = {
    event: { create: vi.fn() },
    detection: { create: vi.fn() },
    watchlistVehicle: { updateMany: vi.fn() },
    alert: { create: vi.fn() },
    evidence: { create: vi.fn() },
    camera: { update: vi.fn() },
  };
  const prisma = {
    camera: { findFirst: vi.fn() },
    event: { findUnique: vi.fn(), findFirst: vi.fn() },
    alert: { findFirst: vi.fn() },
    evidence: { findFirst: vi.fn() },
    watchlistVehicle: { findMany: vi.fn() },
    $transaction: vi.fn(),
  };
  return { prisma, tx };
});

vi.mock('../src/config/database', () => ({ prisma: mocks.prisma }));
vi.mock('../src/services/threat.service', () => ({
  ThreatService: { calculate: vi.fn(() => ({ score: 80, severity: 'HIGH', reasons: ['WATCHLIST_MATCH'] })) },
}));
vi.mock('../src/websocket/events', () => ({
  WsEvents: { newEvent: vi.fn(), newAlert: vi.fn(), evidenceCreated: vi.fn() },
}));
vi.mock('../src/integrations/storage/minio-client', () => ({
  StorageClient: { storeSnapshot: vi.fn(), remove: vi.fn() },
}));

import { AiService } from '../src/services/ai.service';

const timestamp = '2026-09-25T12:00:00.000Z';
const vehicle = {
  id: 'vehicle-uuid',
  vehicleId: 'WLV-001',
  numberPlate: 'AB12',
  status: 'ACTIVE',
  vehicleType: 'CAR',
  category: 'VIP',
  description: null,
  addedBy: 'operator',
};

function setTransactionResult() {
  const event = {
    id: 'event-uuid',
    eventCode: 'EVT-10001',
    timestamp: new Date(timestamp),
    eventType: 'ANPR_MATCH',
    objectType: 'PLATE',
    trackId: null,
    confidence: 0.91,
    zone: 'UNKNOWN',
    severity: 'HIGH',
    threatScore: 80,
    status: 'NEW',
    metadata: { plate: 'AB12', watchlist_match: true, watchlist_vehicle_id: 'WLV-001' },
  };
  const alert = {
    alertCode: 'ALT-10001',
    eventId: event.id,
    cameraId: 'camera-uuid',
    timestamp: new Date(timestamp),
    eventType: 'ANPR_MATCH',
    severity: 'HIGH',
    threatScore: 80,
    status: 'NEW',
    description: 'PLATE anpr match detected',
  };
  mocks.tx.event.create.mockResolvedValue(event);
  mocks.tx.detection.create.mockResolvedValue({});
  mocks.tx.watchlistVehicle.updateMany.mockResolvedValue({ count: 1 });
  mocks.tx.alert.create.mockResolvedValue(alert);
  mocks.tx.camera.update.mockResolvedValue({});
  mocks.prisma.$transaction.mockImplementation(async (callback) => callback(mocks.tx));
  return { event, alert };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.prisma.camera.findFirst.mockResolvedValue({
    id: 'camera-uuid',
    cameraCode: 'CAM-1',
    status: 'ONLINE',
    bop: { id: 'bop-uuid', code: 'BOP-1' },
  });
  mocks.prisma.event.findUnique.mockResolvedValue(null);
  mocks.prisma.event.findFirst.mockResolvedValue({ eventCode: 'EVT-10000' });
  mocks.prisma.alert.findFirst.mockResolvedValue({ alertCode: 'ALT-10000' });
  mocks.prisma.watchlistVehicle.findMany.mockResolvedValue([vehicle]);
});

describe('AiService ANPR persistence', () => {
  it('persists the event ID, metadata, and confirmed lastMatch transactionally', async () => {
    const { event } = setTransactionResult();

    const result = await AiService.ingestEvent({
      eventId: 'event-uuid',
      cameraId: 'CAM-1',
      timestamp,
      eventType: 'ANPR_MATCH',
      objectType: 'PLATE',
      confidence: 0.91,
      bbox: [1, 2, 8, 10],
      metadata: { plate: 'ab-12', watchlist_vehicle_id: 'WLV-001' },
    });

    const eventData = mocks.tx.event.create.mock.calls[0][0].data;
    expect(eventData.id).toBe('event-uuid');
    expect(eventData.metadata).toMatchObject({ plate: 'AB12', watchlist_match: true, watchlist_vehicle_id: 'WLV-001' });
    expect(mocks.tx.watchlistVehicle.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ id: 'vehicle-uuid', status: 'ACTIVE' }),
      data: { lastMatch: new Date(timestamp) },
    }));
    expect(result.event.eventId).toBe('EVT-10001');
    expect(result.event.sourceEventId).toBe('event-uuid');
    expect(event.id).toBe('event-uuid');
  });

  it('downgrades an unconfirmed ANPR event and does not update lastMatch', async () => {
    setTransactionResult();
    mocks.prisma.watchlistVehicle.findMany.mockResolvedValue([]);

    await AiService.ingestEvent({
      eventId: 'event-uuid',
      cameraId: 'CAM-1',
      timestamp,
      eventType: 'ANPR_MATCH',
      objectType: 'PLATE',
      confidence: 0.91,
      bbox: [1, 2, 8, 10],
      metadata: { plate: 'AB12', watchlist_vehicle_id: 'WLV-001' },
    });

    expect(mocks.tx.event.create.mock.calls[0][0].data.eventType).toBe('VEHICLE_DETECTED');
    expect(mocks.tx.event.create.mock.calls[0][0].data.metadata.watchlist_match).toBe(false);
    expect(mocks.tx.watchlistVehicle.updateMany).not.toHaveBeenCalled();
  });

  it('does not confirm low-confidence or non-ANPR events', async () => {
    setTransactionResult();

    await AiService.ingestEvent({
      eventId: 'event-low-confidence',
      cameraId: 'CAM-1',
      timestamp,
      eventType: 'ANPR_MATCH',
      objectType: 'PLATE',
      confidence: 0.49,
      metadata: { plate: 'AB12', ocr_confidence: 0.49 },
    });

    await AiService.ingestEvent({
      eventId: 'event-non-anpr',
      cameraId: 'CAM-1',
      timestamp,
      eventType: 'ANPR_MATCH',
      objectType: 'PERSON',
      confidence: 0.99,
      metadata: { watchlist_vehicle_id: 'WLV-001' },
    });

    expect(mocks.prisma.watchlistVehicle.findMany).not.toHaveBeenCalled();
    expect(mocks.tx.event.create.mock.calls[0][0].data.eventType).toBe('VEHICLE_DETECTED');
    expect(mocks.tx.event.create.mock.calls[1][0].data.eventType).toBe('VEHICLE_DETECTED');
    expect(mocks.tx.watchlistVehicle.updateMany).not.toHaveBeenCalled();
  });

  it('scrubs an untrusted watchlist claim from non-ANPR events', async () => {
    setTransactionResult();

    await AiService.ingestEvent({
      cameraId: 'CAM-1',
      timestamp,
      eventType: 'VEHICLE_DETECTED',
      objectType: 'VEHICLE',
      confidence: 0.99,
      metadata: { watchlist_match: true, watchlist_vehicle_id: 'WLV-001', watchlist_category: 'VIP' },
    });

    const eventData = mocks.tx.event.create.mock.calls[0][0].data;
    expect(eventData.metadata).toMatchObject({ watchlist_match: false });
    expect(eventData.metadata.watchlist_vehicle_id).toBeUndefined();
    expect(mocks.tx.watchlistVehicle.updateMany).not.toHaveBeenCalled();
  });

  it('returns the existing event for a repeated event ID', async () => {
    const existing = {
      id: 'event-uuid',
      eventCode: 'EVT-10001',
      timestamp: new Date(timestamp),
      eventType: 'ANPR_MATCH',
      objectType: 'PLATE',
      trackId: null,
      confidence: 0.91,
      zone: 'UNKNOWN',
      severity: 'HIGH',
      threatScore: 80,
      status: 'NEW',
      metadata: { plate: 'AB12' },
      alerts: [{
        alertCode: 'ALT-10001',
        eventId: 'event-uuid',
        cameraId: 'camera-uuid',
        timestamp: new Date(timestamp),
        eventType: 'ANPR_MATCH',
        severity: 'HIGH',
        threatScore: 80,
        status: 'NEW',
        description: 'match',
      }],
    };
    mocks.prisma.event.findUnique.mockResolvedValue(existing);

    const result = await AiService.ingestEvent({
      eventId: 'event-uuid',
      cameraId: 'CAM-1',
      timestamp,
      eventType: 'ANPR_MATCH',
      objectType: 'PLATE',
      confidence: 0.91,
      metadata: { plate: 'AB12' },
    });

    expect(result.event.eventId).toBe('EVT-10001');
    expect(mocks.prisma.$transaction).not.toHaveBeenCalled();
    expect(mocks.tx.watchlistVehicle.updateMany).not.toHaveBeenCalled();
  });

  it('rejects an invalid ANPR plate before persistence', async () => {
    await expect(AiService.ingestEvent({
      eventId: 'event-invalid',
      cameraId: 'CAM-1',
      timestamp,
      eventType: 'ANPR_MATCH',
      objectType: 'PLATE',
      confidence: 0.91,
      metadata: { plate: '---' },
    })).rejects.toThrow('Invalid ANPR plate');

    expect(mocks.prisma.$transaction).not.toHaveBeenCalled();
    expect(mocks.tx.watchlistVehicle.updateMany).not.toHaveBeenCalled();
  });
});
