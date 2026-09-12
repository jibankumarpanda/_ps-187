const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const camera = await prisma.camera.findFirst({ include: { bop: true } });
  const systemEvent = await prisma.event.findFirst({ orderBy: { createdAt: 'desc' } });

  try {
    const evidenceCode = `EVD-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    const evidence = await prisma.evidence.create({
      data: {
        evidenceCode,
        evidenceType: 'FRAME',
        hash: 'testhash',
        filePath: '/tmp/test',
        fileSizeKB: 10,
        recordedBy: 'AI_SYSTEM',
        recordedOrg: 'IBVAP',
        verificationStatus: 'PENDING',
        timestamp: new Date(),
        event: { connect: { eventCode: systemEvent.eventCode } },
        camera: { connect: { id: camera.id } },
        bop: { connect: { id: camera.bop.id } }
      }
    });
    console.log("Success:", evidence.id);
  } catch (err) {
    console.error("Prisma Error:", err);
  }
}
main().finally(() => process.exit(0));
