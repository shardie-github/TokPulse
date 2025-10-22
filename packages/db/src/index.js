import { PrismaClient } from '@prisma/client';
const globalForPrisma = globalThis;
export const prisma = globalForPrisma.prisma ?? new PrismaClient();
if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = prisma;
}
export * from '@prisma/client';
