const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const events = await prisma.event.findMany({ include: { evidence: true }, orderBy: { createdAt: 'desc' }, take: 5 });
  console.log(JSON.stringify(events, null, 2));
}
main();
