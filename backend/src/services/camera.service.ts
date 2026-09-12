import { prisma } from '../config/database';
import { config } from '../config';
import { AppError } from '../utils/app-error';
import { decryptCameraCredential, encryptCameraCredential } from '../utils/crypto';
import { AiClient, AiCameraConfig } from '../integrations/ai/ai-client';
import { WsEvents } from '../websocket/events';
import type { AiCameraStatusInput } from '../validators/ai.validators';

export class CameraService {
  private static getPreviewUrl(streamUrl: string | null): string | undefined {
    if (!streamUrl) return undefined;
    try {
      const url = new URL(streamUrl);
      if ((url.protocol === 'http:' || url.protocol === 'https:') && !url.username && !url.password) {
        return streamUrl;
      }
    } catch {
      return undefined;
    }
    return undefined;
  }

  private static buildAiConfig(camera: {
    cameraCode: string;
    streamUrl: string | null;
    rtspUsernameEncrypted: string | null;
    rtspPasswordEncrypted: string | null;
    bop: { code: string };
    zones: Array<{ name: string; zoneType: string; coordinates: unknown }>;
  }): AiCameraConfig {
    if (!camera.streamUrl) {
      throw AppError.badRequest('A stream URL is required before the camera can be started');
    }

    let stream: URL;
    try {
      stream = new URL(camera.streamUrl);
    } catch {
      throw AppError.badRequest('The configured stream URL is invalid');
    }

    if (stream.username || stream.password) {
      throw AppError.badRequest('Configure camera credentials separately from the stream URL');
    }

    if (camera.rtspUsernameEncrypted) {
      stream.username = decryptCameraCredential(camera.rtspUsernameEncrypted, config.encryptionKey);
    }
    if (camera.rtspPasswordEncrypted) {
      stream.password = decryptCameraCredential(camera.rtspPasswordEncrypted, config.encryptionKey);
    }

    return {
      cameraId: camera.cameraCode,
      bopId: camera.bop.code,
      streamUrl: stream.toString(),
      zones: camera.zones.map((zone) => ({
        name: zone.name,
        zoneType: zone.zoneType,
        coordinates: zone.coordinates,
      })),
    };
  }

  static async getAll(userBopId?: string | null) {
    const where: any = {};
    if (userBopId) {
      where.bop = { OR: [{ id: userBopId }, { code: userBopId }] };
    }

    const cameras = await prisma.camera.findMany({
      where,
      include: { bop: { select: { code: true, name: true } } },
      orderBy: { cameraCode: 'asc' },
    });

    return cameras.map((cam) => ({
      id: cam.cameraCode,
      name: cam.name,
      bopId: cam.bop.code,
      location: cam.location,
      status: cam.status,
      fps: cam.fps,
      resolution: cam.resolution,
      aiStatus: cam.aiStatus,
      lastSeen: cam.lastSeen?.toISOString() || null,
      latitude: cam.latitude,
      longitude: cam.longitude,
      previewUrl: this.getPreviewUrl(cam.streamUrl),
      // Never return RTSP credentials
    }));
  }

  static async getById(id: string) {
    const camera = await prisma.camera.findFirst({
      where: { OR: [{ id }, { cameraCode: id }] },
      include: {
        bop: { select: { code: true, name: true } },
        zones: true,
      },
    });

    if (!camera) throw AppError.notFound('Camera not found');

    return {
      id: camera.cameraCode,
      name: camera.name,
      bopId: camera.bop.code,
      location: camera.location,
      status: camera.status,
      fps: camera.fps,
      resolution: camera.resolution,
      aiStatus: camera.aiStatus,
      lastSeen: camera.lastSeen?.toISOString() || null,
      latitude: camera.latitude,
      longitude: camera.longitude,
      zones: camera.zones,
      previewUrl: this.getPreviewUrl(camera.streamUrl),
      // Never return RTSP credentials
    };
  }

  static async create(data: {
    cameraCode: string;
    name: string;
    location: string;
    bopCode: string;
    latitude: number;
    longitude: number;
    resolution?: string;
    streamUrl?: string;
    rtspUsername?: string;
    rtspPassword?: string;
    sourceType?: 'RTSP' | 'VIDEO';
  }) {
    // Resolve BOP
    const bop = await prisma.bop.findFirst({ where: { OR: [{ code: data.bopCode }, { id: data.bopCode }] } });
    if (!bop) throw AppError.notFound('BOP not found');

    // Encrypt RTSP credentials if provided
    let rtspUsernameEncrypted: string | null = null;
    let rtspPasswordEncrypted: string | null = null;

    if (data.rtspUsername) {
      rtspUsernameEncrypted = encryptCameraCredential(data.rtspUsername, config.encryptionKey);
    }
    if (data.rtspPassword) {
      rtspPasswordEncrypted = encryptCameraCredential(data.rtspPassword, config.encryptionKey);
    }

    const camera = await prisma.camera.create({
      data: {
        cameraCode: data.cameraCode,
        name: data.name,
        location: data.location,
        bopId: bop.id,
        latitude: data.latitude,
        longitude: data.longitude,
        resolution: data.resolution || '1920x1080',
        streamUrl: data.streamUrl,
        rtspUsernameEncrypted,
        rtspPasswordEncrypted,
        sourceType: data.sourceType || 'RTSP',
      },
      include: { bop: { select: { code: true } } },
    });

    return {
      id: camera.cameraCode,
      name: camera.name,
      bopId: camera.bop.code,
      location: camera.location,
      status: camera.status,
      fps: camera.fps,
      resolution: camera.resolution,
      aiStatus: camera.aiStatus,
      latitude: camera.latitude,
      longitude: camera.longitude,
    };
  }

  static async update(id: string, data: Partial<{
    name: string;
    location: string;
    resolution: string;
    latitude: number;
    longitude: number;
    streamUrl: string;
    rtspUsername: string;
    rtspPassword: string;
  }>) {
    const camera = await prisma.camera.findFirst({ where: { OR: [{ id }, { cameraCode: id }] } });
    if (!camera) throw AppError.notFound('Camera not found');

    const updateData: any = { ...data };
    delete updateData.rtspUsername;
    delete updateData.rtspPassword;

    if (data.rtspUsername) {
      updateData.rtspUsernameEncrypted = encryptCameraCredential(data.rtspUsername, config.encryptionKey);
    }
    if (data.rtspPassword) {
      updateData.rtspPasswordEncrypted = encryptCameraCredential(data.rtspPassword, config.encryptionKey);
    }

    const updated = await prisma.camera.update({ where: { id: camera.id }, data: updateData });
    return {
      id: updated.cameraCode,
      name: updated.name,
      status: updated.status,
      fps: updated.fps,
      aiStatus: updated.aiStatus,
      lastSeen: updated.lastSeen?.toISOString() || null,
    };
  }

  static async delete(id: string) {
    const camera = await prisma.camera.findFirst({ where: { OR: [{ id }, { cameraCode: id }] } });
    if (!camera) throw AppError.notFound('Camera not found');
    if (camera.status !== 'OFFLINE') {
      await AiClient.stopCamera(camera.cameraCode);
    }
    await prisma.camera.delete({ where: { id: camera.id } });
    return { message: 'Camera deleted' };
  }

  static async testConnection(id: string) {
    const camera = await prisma.camera.findFirst({
      where: { OR: [{ id }, { cameraCode: id }] },
      include: { bop: { select: { code: true } }, zones: true },
    });
    if (!camera) throw AppError.notFound('Camera not found');
    const result = await AiClient.testCamera(this.buildAiConfig(camera));
    return {
      connected: result.connected ?? result.accepted,
      latency: result.latency ?? null,
      message: result.message || 'Connection test completed',
    };
  }

  static async start(id: string) {
    const camera = await prisma.camera.findFirst({
      where: { OR: [{ id }, { cameraCode: id }] },
      include: { bop: { select: { code: true } }, zones: true },
    });
    if (!camera) throw AppError.notFound('Camera not found');

    const provisional = await prisma.camera.update({
      where: { id: camera.id },
      data: { status: 'DEGRADED', aiStatus: 'ACTIVE', fps: 0, lastSeen: new Date() },
    });

    try {
      const result = await AiClient.startCamera(this.buildAiConfig(camera));
      const status = result.status === 'ONLINE' ? 'ONLINE' : provisional.status;
      const updated = status === provisional.status
        ? provisional
        : await prisma.camera.update({
          where: { id: camera.id },
          data: { status, aiStatus: 'ACTIVE', lastSeen: new Date() },
        });

      const payload = {
        id: updated.cameraCode,
        status: updated.status,
        aiStatus: updated.aiStatus,
        fps: updated.fps,
        lastSeen: updated.lastSeen?.toISOString() || null,
        message: result.message || 'AI stream start accepted',
      };
      WsEvents.cameraStatusChanged(camera.bop.code, payload);
      return payload;
    } catch (error) {
      const failed = await prisma.camera.update({
        where: { id: camera.id },
        data: { status: 'OFFLINE', aiStatus: 'ERROR', fps: 0 },
      });
      WsEvents.cameraStatusChanged(camera.bop.code, {
        id: failed.cameraCode,
        status: failed.status,
        aiStatus: failed.aiStatus,
        fps: failed.fps,
        lastSeen: failed.lastSeen?.toISOString() || null,
      });
      throw error;
    }
  }

  static async stop(id: string) {
    const camera = await prisma.camera.findFirst({
      where: { OR: [{ id }, { cameraCode: id }] },
      include: { bop: { select: { code: true } } },
    });
    if (!camera) throw AppError.notFound('Camera not found');

    const result = await AiClient.stopCamera(camera.cameraCode);
    const updated = await prisma.camera.update({
      where: { id: camera.id },
      data: { status: 'OFFLINE', aiStatus: 'INACTIVE', fps: 0 },
    });

    const payload = {
      id: updated.cameraCode,
      status: updated.status,
      aiStatus: updated.aiStatus,
      fps: updated.fps,
      lastSeen: updated.lastSeen?.toISOString() || null,
      message: result.message || 'Camera stopped',
    };
    WsEvents.cameraStatusChanged(camera.bop.code, payload);
    return payload;
  }

  static async reportAiStatus(data: AiCameraStatusInput) {
    const camera = await prisma.camera.findFirst({
      where: { cameraCode: data.cameraId },
      include: { bop: { select: { code: true } } },
    });
    if (!camera) throw AppError.notFound(`Camera not found: ${data.cameraId}`);

    const fps = data.fps === undefined ? camera.fps : Math.round(data.fps);
    const changed = camera.status !== data.status || camera.aiStatus !== data.aiStatus || camera.fps !== fps;
    const updated = await prisma.camera.update({
      where: { id: camera.id },
      data: {
        status: data.status,
        aiStatus: data.aiStatus,
        fps,
        lastSeen: data.status === 'OFFLINE' ? camera.lastSeen : new Date(),
      },
    });

    const payload = {
      id: updated.cameraCode,
      status: updated.status,
      aiStatus: updated.aiStatus,
      fps: updated.fps,
      lastSeen: updated.lastSeen?.toISOString() || null,
      message: data.message,
    };
    if (changed) WsEvents.cameraStatusChanged(camera.bop.code, payload);
    return payload;
  }

  static async replaceZones(id: string, zones: Array<{ name: string; zoneType: string; coordinates: [number, number][] }>) {
    const camera = await prisma.camera.findFirst({ where: { OR: [{ id }, { cameraCode: id }] } });
    if (!camera) throw AppError.notFound('Camera not found');

    const updatedZones = await prisma.$transaction(async (tx) => {
      await tx.cameraZone.deleteMany({ where: { cameraId: camera.id } });
      await tx.cameraZone.createMany({
        data: zones.map((zone) => ({
          cameraId: camera.id,
          name: zone.name,
          zoneType: zone.zoneType,
          coordinates: zone.coordinates,
        })),
      });
      return tx.cameraZone.findMany({ where: { cameraId: camera.id }, orderBy: { createdAt: 'asc' } });
    });

    return { cameraId: camera.cameraCode, zones: updatedZones };
  }

  static async getHealth(id: string) {
    const camera = await prisma.camera.findFirst({ where: { OR: [{ id }, { cameraCode: id }] } });
    if (!camera) throw AppError.notFound('Camera not found');

    return {
      id: camera.cameraCode,
      status: camera.status,
      fps: camera.fps,
      aiStatus: camera.aiStatus,
      lastSeen: camera.lastSeen?.toISOString() || null,
      uptime: camera.status === 'ONLINE' ? '99.7%' : '0%',
      networkLatency: camera.status === 'ONLINE' ? `${Math.floor(Math.random() * 30) + 5}ms` : 'N/A',
    };
  }

  // Helper to get BOP ID for a camera (used in authorization)
  static async getCameraBopId(cameraId: string): Promise<string | null> {
    const camera = await prisma.camera.findFirst({
      where: { OR: [{ id: cameraId }, { cameraCode: cameraId }] },
      include: { bop: { select: { id: true, code: true } } },
    });
    return camera?.bop.id || null;
  }
}
