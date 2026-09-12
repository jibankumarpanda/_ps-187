import { Queue } from 'bullmq';
import Redis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

const connection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

export const videoQueue = new Queue('videoAnalysisQueue', { connection });

export const addVideoJob = async (videoId: string, cameraId: string, videoPath: string) => {
  try {
    const existingJob = await videoQueue.getJob(videoId);
    if (existingJob) {
      await existingJob.remove().catch(() => {});
    }
  } catch (err) {
    // Non-blocking cleanup
  }

  return await videoQueue.add(
    'processVideo',
    { videoId, cameraId, videoPath },
    {
      jobId: videoId,
      removeOnComplete: true,
      removeOnFail: false,
    }
  );
};
