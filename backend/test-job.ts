import { prisma } from './src/config/database';
import { addVideoJob } from './src/queue/video.queue';

async function main() {
  const camera = await prisma.camera.findFirst();
  if (!camera) return console.log('No camera');

  const files = [
    '1789154816440-312725242-South.mp4',
    '1789155702481-988459470-North.mp4'
  ];
  
  for (const filename of files) {
    const job = await prisma.videoAnalysis.create({
      data: {
        cameraId: camera.id,
        filename: filename,
        originalPath: `/Applications/Development/_ps-187/backend/storage/videos/original/${filename}`,
        status: 'QUEUED',
        progress: 0,
      }
    });
    
    await addVideoJob(job.id, camera.id, job.originalPath);
    
    console.log(`Queued job ${job.id} for ${filename}`);
  }
}
main().catch(console.error).finally(() => process.exit(0));
