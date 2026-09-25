import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma: any };

function createPrismaClient() {
  const baseClient = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

  return baseClient.$extends({
    query: {
      $allModels: {
        async $allOperations({ operation, model, args, query }) {
          try {
            return await query(args);
          } catch (error: any) {
            const msg = String(error?.message || '');
            const isConnectionError =
              msg.includes('E57P01') ||
              msg.includes('terminating connection') ||
              msg.includes('Connection lost') ||
              msg.includes("Can't reach database server") ||
              msg.includes('connection closed') ||
              msg.includes('Server has closed the connection');

            if (isConnectionError) {
              // Wait 1.2s for Neon serverless instance to resume and retry once
              await new Promise((resolve) => setTimeout(resolve, 1200));
              return await query(args);
            }
            throw error;
          }
        },
      },
    },
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
