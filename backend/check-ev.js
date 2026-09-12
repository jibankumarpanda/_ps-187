const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const c = await prisma.evidence.count();
  const ev = await prisma.evidence.findFirst({ orderBy: { createdAt: 'desc' } });
  console.log('Evidence count:', c);
  console.log(ev);
}
main().catch(console.error).finally(() => process.exit(0));
