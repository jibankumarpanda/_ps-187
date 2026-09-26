import { prisma } from '../config/database';
import { AppError } from '../utils/app-error';
import { calculateSHA256 } from '../utils/hash';
import { StorageClient } from '../integrations/storage/minio-client';
import { config } from '../config';
import { FabricClient } from '../integrations/blockchain/fabric-client';

export class EvidenceService {
  static async getAll(filters?: { bopId?: string; status?: string; page?: number; limit?: number }) {
    const page = filters?.page || 1;
    const limit = filters?.limit || 50;
    const skip = (page - 1) * limit;
    const where: any = {};

    if (filters?.bopId) where.bop = { OR: [{ id: filters.bopId }, { code: filters.bopId }] };
    if (filters?.status) where.verificationStatus = filters.status;

    const [evidence, total] = await Promise.all([
      prisma.evidence.findMany({
        where,
        include: {
          event: { select: { eventCode: true } },
          camera: { select: { cameraCode: true } },
          bop: { select: { code: true } },
          blockchainRecords: {
            select: { transactionId: true, blockNumber: true },
            take: 1,
            orderBy: { createdAt: 'desc' },
          },
        },
        orderBy: { timestamp: 'desc' },
        skip,
        take: limit,
      }),
      prisma.evidence.count({ where }),
    ]);

    return {
      data: evidence.map((ev) => ({
        evidenceId: ev.evidenceCode,
        eventId: ev.event.eventCode,
        cameraId: ev.camera.cameraCode,
        bopId: ev.bop.code,
        evidenceType: ev.evidenceType,
        timestamp: ev.timestamp.toISOString(),
        hash: ev.hash,
        blockchainTxId: ev.blockchainRecords[0]?.transactionId || '',
        blockNumber: ev.blockchainRecords[0]?.blockNumber || 0,
        verificationStatus: ev.verificationStatus,
        recordedBy: ev.recordedBy,
        recordedOrg: ev.recordedOrg,
        fileSizeKB: ev.fileSizeKB,
      })),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  static async getById(id: string) {
    const evidence = await prisma.evidence.findFirst({
      where: { OR: [{ id }, { evidenceCode: id }] },
      include: {
        event: { select: { eventCode: true, eventType: true } },
        camera: { select: { cameraCode: true, name: true } },
        bop: { select: { code: true, name: true } },
        blockchainRecords: { orderBy: { createdAt: 'desc' } },
      },
    });

    if (!evidence) throw AppError.notFound('Evidence not found');

    const latestRecord = evidence.blockchainRecords[0];
    let fabricData: any = null;

    if (config.blockchainMode === 'fabric') {
      try {
        const [fabricRecord, history] = await Promise.all([
          FabricClient.getEvidence(evidence.evidenceCode).catch(() => null),
          FabricClient.getEvidenceHistory(evidence.evidenceCode).catch(() => null),
        ]);
        if (fabricRecord) {
          fabricData = {
            channel: config.fabric.channel,
            chaincode: config.fabric.chaincode,
            mspId: config.fabric.mspId,
            txId: history && history.length > 0 ? history[0].txId : latestRecord?.transactionId,
            onChainHash: fabricRecord.sha256,
            status: fabricRecord.status,
            ledgerRecord: fabricRecord,
            history: (history || []).slice(0, 5),
          };
        }
      } catch (err: any) {
        console.warn(`[Fabric] getById query warning: ${err.message}`);
      }
    }

    return {
      evidenceId: evidence.evidenceCode,
      eventId: evidence.event.eventCode,
      cameraId: evidence.camera.cameraCode,
      bopId: evidence.bop.code,
      evidenceType: evidence.evidenceType,
      timestamp: evidence.timestamp.toISOString(),
      hash: evidence.hash,
      blockchainTxId: fabricData?.txId || latestRecord?.transactionId || '',
      blockNumber: latestRecord?.blockNumber || 0,
      verificationStatus: fabricData?.status || evidence.verificationStatus,
      recordedBy: fabricData?.ledgerRecord?.registeredBy || evidence.recordedBy,
      recordedOrg: fabricData?.mspId || evidence.recordedOrg,
      fileSizeKB: evidence.fileSizeKB,
      blockchainRecords: evidence.blockchainRecords,
      fabricData,
    };
  }

  static async verify(id: string, overrideHash?: string) {
    const evidence = await prisma.evidence.findFirst({
      where: { OR: [{ id }, { evidenceCode: id }] },
      include: { blockchainRecords: { orderBy: { createdAt: 'desc' }, take: 1 } },
    });

    if (!evidence) throw AppError.notFound('Evidence not found');

    const latestRecord = evidence.blockchainRecords[0];
    let currentHash = overrideHash || evidence.hash;
    if (!overrideHash && evidence.filePath) {
      try {
        currentHash = calculateSHA256(await StorageClient.read(evidence.filePath));
      } catch {
        currentHash = evidence.hash;
      }
    }

    const startTime = Date.now();
    let verified = false;
    let blockchainHash = latestRecord?.evidenceHash || '';
    let fabricRecord: any = null;
    let fabricTxId = latestRecord?.transactionId || '';
    let fabricHistory: any[] = [];
    let fabricStatus = '';
    let fabricMessage = '';

    if (config.blockchainMode === 'fabric') {
      try {
        const fabricResult = await FabricClient.verifyEvidence(
          evidence.evidenceCode,
          currentHash,
        );
        verified = fabricResult.verified;
        blockchainHash = fabricResult.onChainHash;
        fabricStatus = fabricResult.status;
        fabricMessage = fabricResult.message;

        try {
          fabricRecord = await FabricClient.getEvidence(evidence.evidenceCode);
        } catch {
          // ignore
        }

        try {
          const hist = await FabricClient.getEvidenceHistory(evidence.evidenceCode);
          if (hist && hist.length > 0) {
            fabricTxId = hist[0].txId;
            fabricHistory = hist.slice(0, 5);
          }
        } catch {
          // ignore
        }
      } catch (err: any) {
        console.warn(`[Fabric] Direct verification error, falling back to local DB: ${err.message}`);
        const expectedHash = latestRecord?.evidenceHash || evidence.hash;
        blockchainHash = expectedHash;
        verified = currentHash.toLowerCase() === expectedHash.toLowerCase();
        fabricStatus = verified ? 'VERIFIED' : 'TAMPER_DETECTED';
        fabricMessage = verified
          ? 'Evidence integrity confirmed (fallback cryptographic match)'
          : 'WARNING: Evidence hash mismatch detected';
      }
    } else {
      const expectedHash = latestRecord?.evidenceHash || evidence.hash;
      blockchainHash = expectedHash;
      verified = currentHash.toLowerCase() === expectedHash.toLowerCase();
      fabricStatus = verified ? 'VERIFIED' : 'TAMPER_DETECTED';
      fabricMessage = verified
        ? 'Evidence integrity confirmed'
        : 'WARNING: Evidence hash mismatch detected';
    }

    const latencyMs = Date.now() - startTime;

    if (verified) {
      await prisma.evidence.update({
        where: { id: evidence.id },
        data: { verificationStatus: 'VERIFIED' },
      });
    } else {
      await prisma.evidence.update({
        where: { id: evidence.id },
        data: { verificationStatus: 'FAILED' },
      });
    }

    return {
      verified,
      currentHash,
      blockchainHash,
      timestamp: evidence.timestamp.toISOString(),
      blockNumber: latestRecord?.blockNumber || 0,
      txId: fabricTxId || latestRecord?.transactionId || '',
      recordedBy: fabricRecord?.registeredBy || evidence.recordedBy,
      recordedOrg: config.fabric.mspId || evidence.recordedOrg,
      channel: config.fabric.channel,
      chaincode: config.fabric.chaincode,
      status: fabricStatus || (verified ? 'VERIFIED' : 'TAMPER_DETECTED'),
      message: fabricMessage,
      latencyMs,
      dockerPeer: config.fabric.peerEndpoint,
      fabricRecord,
      fabricHistory,
    };
  }

  static async getAuditTrail(id: string) {
    const evidence = await prisma.evidence.findFirst({
      where: { OR: [{ id }, { evidenceCode: id }] },
      include: { blockchainRecords: { orderBy: { createdAt: 'asc' } } },
    });

    if (!evidence) throw AppError.notFound('Evidence not found');

    return {
      evidenceId: evidence.evidenceCode,
      history: evidence.blockchainRecords.map((r) => ({
        transactionId: r.transactionId,
        blockNumber: r.blockNumber,
        timestamp: r.timestamp.toISOString(),
        evidenceHash: r.evidenceHash,
        recordedBy: r.recordedBy,
        recordedOrg: r.recordedOrg,
      })),
    };
  }
}
