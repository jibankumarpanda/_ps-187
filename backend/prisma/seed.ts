import { PrismaClient, UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // --- BOPs ---
  const bops = await Promise.all([
    prisma.bop.upsert({
      where: { code: 'BOP-12' },
      update: {},
      create: { code: 'BOP-12', name: 'Western Sector BOP 12', location: 'Sector 12, West Zone', latitude: 28.6139, longitude: 77.209, status: 'OPERATIONAL' },
    }),
    prisma.bop.upsert({
      where: { code: 'BOP-21' },
      update: {},
      create: { code: 'BOP-21', name: 'Northern Sector BOP 21', location: 'Sector 21, North Zone', latitude: 34.0836, longitude: 74.7973, status: 'OPERATIONAL' },
    }),
  ]);

  console.log('Created BOPs');

  // --- Users ---
  const passwordHash = await bcrypt.hash('password123', 12);

  const users = [
    { email: 'admin@ibvap.gov', name: 'Super Admin', role: 'SUPER_ADMIN' as UserRole, assignedBopId: null },
    { email: 'commander@ibvap.gov', name: 'Zone Commander', role: 'COMMANDER' as UserRole, assignedBopId: null },
    { email: 'operator12@ibvap.gov', name: 'BOP 12 Operator', role: 'BOP_OPERATOR' as UserRole, assignedBopId: bops[0].id },
    { email: 'analyst@ibvap.gov', name: 'Intel Analyst', role: 'ANALYST' as UserRole, assignedBopId: null },
    { email: 'investigator@ibvap.gov', name: 'Field Investigator', role: 'INVESTIGATOR' as UserRole, assignedBopId: null },
  ];

  for (const u of users) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: {
        email: u.email,
        name: u.name,
        passwordHash,
        role: u.role,
        assignedBopId: u.assignedBopId,
        isActive: true,
        isEmailVerified: true,
      },
    });
  }
  console.log('Created Users');

  // --- Cameras ---
  const camerasData = [
    { code: 'BOP12-CAM01', name: 'Main Gate PTZ', bopId: bops[0].id, lat: 28.614, lng: 77.209 },
    { code: 'BOP12-CAM02', name: 'Perimeter North', bopId: bops[0].id, lat: 28.615, lng: 77.209 },
    { code: 'BOP12-CAM04', name: 'Restricted Zone Alpha', bopId: bops[0].id, lat: 28.613, lng: 77.210 },
  ];

  const cameras = [];
  for (const c of camerasData) {
    const cam = await prisma.camera.upsert({
      where: { cameraCode: c.code },
      update: {},
      create: {
        cameraCode: c.code,
        name: c.name,
        location: 'Perimeter',
        bopId: c.bopId,
        latitude: c.lat,
        longitude: c.lng,
        status: 'ONLINE',
        aiStatus: 'ACTIVE',
        fps: 25,
      },
    });
    cameras.push(cam);
  }
  console.log('Created Cameras');


}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
