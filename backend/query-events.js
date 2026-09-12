const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const ev = await prisma.event.findFirst({ orderBy: { createdAt: 'desc' }, include: { evidence: true } });
  console.log(ev);
}
main().catch(console.error).finally(() => process.exit(0));
