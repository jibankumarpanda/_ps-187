const http = require('http');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const job = await prisma.videoAnalysis.findFirst({ orderBy: { createdAt: 'desc' } });
  if (!job) return console.log('No job found');

  const data = JSON.stringify({
    videoId: job.id,
    progress: 50,
    events: [
      {
        type: "INTRUSION_DETECTED",
        objectType: "PERSON",
        severity: "CRITICAL",
        evidenceFrame: "base64encodedfakeframe",
        confidence: 0.9,
        trackId: 1
      }
    ]
  });

  const req = http.request(`http://localhost:4000/api/videos/${job.id}/progress`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(data)
    }
  }, (res) => {
    console.log('Status:', res.statusCode);
    res.on('data', (d) => process.stdout.write(d));
  });

  req.on('error', (e) => {
    console.error(e);
  });

  req.write(data);
  req.end();
}
main();
