import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { addVideoJob } from '../queue/video.queue';
import { emitEvent } from '../websocket/socket';
import { EventService } from '../services/event.service';
import { BlockchainService } from '../services/blockchain.service';
import { calculateSHA256 } from '../utils/hash';
import fs from 'fs';
import path from 'path';
import { config } from '../config';

export const uploadVideo = async (req: Request, res: Response): Promise<void> => {
  try {
    const cameraId = String(req.params.cameraId);
    const file = req.file;

    if (!file) {
      res.status(400).json({ error: 'No video file provided' });
      return;
    }

    const camera = await prisma.camera.findFirst({
      where: { OR: [{ id: cameraId }, { cameraCode: cameraId }] }
    });

    if (!camera) {
      res.status(404).json({ error: 'Camera not found' });
      return;
    }

    // Create a new VideoAnalysis record
    const videoJob = await prisma.videoAnalysis.create({
      data: {
        cameraId: camera.id,
        filename: file.originalname,
        originalPath: file.path,
        status: 'QUEUED',
      }
    });

    // Add job to BullMQ
    await addVideoJob(videoJob.id, camera.id, file.path);

    res.status(201).json({
      success: true,
      data: {
        id: videoJob.id,
        status: videoJob.status,
        cameraId: camera.cameraCode,
      },
      id: videoJob.id,
      status: videoJob.status,
      cameraId: camera.cameraCode,
    });
  } catch (error) {
    console.error('Error uploading video:', error);
    res.status(500).json({ error: 'Failed to upload video' });
  }
};

export const updateProgress = async (req: Request, res: Response): Promise<void> => {
  try {
    const videoId = String(req.params.videoId);
    const {
      progress,
      frame,
      totalFrames,
      status,
      fps,
      duration,
      processedFrames,
      vehiclesDetected,
      personsDetected,
      intrusionCount,
      loiteringCount,
      events
    } = req.body;

    const existingJob = await prisma.videoAnalysis.findUnique({
      where: { id: videoId }
    });

    if (!existingJob) {
      res.status(404).json({ error: 'Video analysis job not found' });
      return;
    }

    const updateData: any = {
      progress: progress !== undefined ? progress : existingJob.progress,
      status: status || existingJob.status,
      processedFrames: processedFrames || frame || existingJob.processedFrames,
      totalFrames: totalFrames !== undefined ? totalFrames : existingJob.totalFrames,
      fps: fps !== undefined ? fps : existingJob.fps,
      duration: duration !== undefined ? duration : existingJob.duration,
    };

    if (vehiclesDetected !== undefined) updateData.vehiclesDetected = vehiclesDetected;
    if (personsDetected !== undefined) updateData.personsDetected = personsDetected;
    if (intrusionCount !== undefined) updateData.intrusionCount = intrusionCount;
    if (loiteringCount !== undefined) updateData.loiteringCount = loiteringCount;

    if (status === 'COMPLETED') {
      updateData.completedAt = new Date();
    } else if (status === 'PROCESSING' && !existingJob.startedAt) {
      updateData.startedAt = new Date();
    }

    const videoJob = await prisma.videoAnalysis.update({
      where: { id: videoId },
      data: updateData
    });

    const camera = await prisma.camera.findUnique({
      where: { id: videoJob.cameraId },
      include: { bop: { select: { code: true } } },
    });

    const bopCode = camera?.bop.code;

    // If batch events provided, save them and emit video:event to frontend
    if (Array.isArray(events) && events.length > 0) {
      for (const ev of events) {
        // Emit socket event for real-time frontend pill/stat updates
        emitEvent('video:event', {
          videoId,
          type: ev.type || 'VEHICLE_DETECTED',
          objectType: ev.objectType || 'VEHICLE',
          subType: ev.subType,
          confidence: ev.confidence,
          trackId: ev.trackId,
          bbox: ev.bbox,
          frame: ev.frame,
        }, bopCode);

        // Optionally record to VideoEvent table
        try {
          await prisma.videoEvent.create({
            data: {
              videoId: videoJob.id,
              type: ev.type || 'VEHICLE_DETECTED',
              severity: ev.severity || 'INFO',
              timestamp: (ev.frame && videoJob.fps) ? ev.frame / videoJob.fps : 0,
              frameNumber: ev.frame || null,
              confidence: ev.confidence || null,
              trackId: ev.trackId ? String(ev.trackId) : null,
              description: `${ev.subType || ev.objectType || 'Object'} detected in video at frame ${ev.frame}`,
              metadata: ev.bbox ? { bbox: ev.bbox } : undefined,
            }
          });
        } catch (dbErr) {
          // Non-blocking event logging
        }

        // --- AI Rule Engine: Handle High-Severity Threats (Intrusion/Loitering) ---
        if (ev.severity === 'CRITICAL' || ev.severity === 'WARNING') {
          try {
            // 1. Create System Event
            const systemEvent = await EventService.create({
              eventCode: `EVT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
              eventType: ev.type === 'INTRUSION_DETECTED' ? 'INTRUSION' : (ev.type === 'LOITERING_DETECTED' ? 'LOITERING' : 'SUSPICIOUS_ACTIVITY'),
              objectType: ev.objectType || 'PERSON',
              cameraCode: camera?.cameraCode || 'UNKNOWN',
              bopCode: bopCode || 'UNKNOWN',
              trackId: ev.trackId,
              confidence: ev.confidence || 0.8,
              zone: 'DEFAULT_ZONE',
              severity: ev.severity,
              threatScore: ev.threatScore || 80,
            });

            // 2. Save Evidence Frame (if provided)
            if (ev.evidenceFrame) {
              const evidenceBuffer = Buffer.from(ev.evidenceFrame, 'base64');
              const evidenceHash = calculateSHA256(evidenceBuffer);
              
              const evidenceDir = path.resolve(config.localStoragePath || './uploads', 'evidence');
              fs.mkdirSync(evidenceDir, { recursive: true });
              const fileName = `evd-${Date.now()}.jpg`;
              const filePath = path.join(evidenceDir, fileName);
              
              fs.writeFileSync(filePath, evidenceBuffer);

              // 3. Create Evidence Record
              const evidenceCode = `EVD-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
              const evidence = await prisma.evidence.create({
                data: {
                  evidenceCode,
                  evidenceType: 'FRAME',
                  hash: evidenceHash,
                  filePath,
                  fileSizeKB: Math.round(evidenceBuffer.length / 1024),
                  recordedBy: 'AI_SYSTEM',
                  recordedOrg: 'IBVAP',
                  verificationStatus: 'PENDING',
                  timestamp: new Date(),
                  event: { connect: { eventCode: systemEvent.eventId } },
                  camera: { connect: { id: camera!.id } },
                  bop: { connect: { id: camera!.bopId } }
                }
              });

              // 4. Register to Blockchain
              try {
                await BlockchainService.registerEvidence(evidence.id);
              } catch (bcErr) {
                console.error('Blockchain registration failed for evidence:', evidence.id, bcErr);
              }
            }
            
            // 5. Create Alert
            await prisma.alert.create({
              data: {
                alertCode: `ALT-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
                eventType: ev.type,
                severity: ev.severity,
                threatScore: ev.threatScore || 80,
                status: 'NEW',
                description: `High severity ${ev.type} detected on camera ${camera?.name}`,
                timestamp: new Date(),
                event: { connect: { eventCode: systemEvent.eventId } },
                camera: { connect: { id: camera!.id } },
                bop: { connect: { id: camera!.bopId } }
              }
            });

          } catch (err) {
            console.error('Failed to create system event/evidence for video threat:', err);
          }
        }
      }
    }

    // Emit socket progress event to frontend
    emitEvent('video:progress', {
      videoId,
      progress: videoJob.progress,
      frame: videoJob.processedFrames,
      totalFrames: videoJob.totalFrames,
      status: videoJob.status,
      vehiclesDetected: videoJob.vehiclesDetected,
      personsDetected: videoJob.personsDetected,
      intrusionCount: videoJob.intrusionCount,
      loiteringCount: videoJob.loiteringCount
    }, bopCode);

    res.json({ success: true, data: videoJob });
  } catch (error) {
    console.error('Error updating video progress:', error);
    res.status(500).json({ error: 'Failed to update progress' });
  }
};

export const getVideoJobByCamera = async (req: Request, res: Response): Promise<void> => {
  try {
    const cameraId = String(req.params.cameraId);
    const camera = await prisma.camera.findFirst({
      where: { OR: [{ id: cameraId }, { cameraCode: cameraId }] }
    });

    if (!camera) {
      res.status(404).json({ error: 'Camera not found' });
      return;
    }

    const latestJob = await prisma.videoAnalysis.findFirst({
      where: { cameraId: camera.id },
      orderBy: { createdAt: 'desc' },
      include: {
        events: {
          take: 50,
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    res.json({ success: true, data: latestJob });
  } catch (error) {
    console.error('Error fetching video job by camera:', error);
    res.status(500).json({ error: 'Failed to fetch video job' });
  }
};

export const getVideoJobById = async (req: Request, res: Response): Promise<void> => {
  try {
    const videoId = String(req.params.videoId);
    const job = await prisma.videoAnalysis.findUnique({
      where: { id: videoId },
      include: {
        events: {
          take: 100,
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!job) {
      res.status(404).json({ error: 'Video job not found' });
      return;
    }

    res.json({ success: true, data: job });
  } catch (error) {
    console.error('Error fetching video job:', error);
    res.status(500).json({ error: 'Failed to fetch video job' });
  }
};

export const retryVideoJob = async (req: Request, res: Response): Promise<void> => {
  try {
    const videoId = String(req.params.videoId);
    const job = await prisma.videoAnalysis.findUnique({ where: { id: videoId } });
    if (!job) {
      res.status(404).json({ error: 'Video job not found' });
      return;
    }

    await prisma.videoAnalysis.update({
      where: { id: videoId },
      data: {
        status: 'QUEUED',
        progress: 0,
        processedFrames: 0,
        personsDetected: 0,
        vehiclesDetected: 0,
        intrusionCount: 0,
        loiteringCount: 0,
        error: null
      }
    });

    await addVideoJob(job.id, job.cameraId, job.originalPath);

    const camera = await prisma.camera.findUnique({
      where: { id: job.cameraId },
      include: { bop: { select: { code: true } } },
    });

    emitEvent('video:progress', {
      videoId: job.id,
      progress: 0,
      frame: 0,
      totalFrames: job.totalFrames || 0,
      status: 'QUEUED',
      vehiclesDetected: 0,
      personsDetected: 0,
      intrusionCount: 0,
      loiteringCount: 0
    }, camera?.bop.code);

    res.json({ success: true, message: 'Video analysis job re-queued successfully' });
  } catch (error) {
    console.error('Error retrying video job:', error);
    res.status(500).json({ error: 'Failed to retry job' });
  }
};

