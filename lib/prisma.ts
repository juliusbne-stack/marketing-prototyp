import { PrismaClient } from "@prisma/client";

// Bump after Prisma schema migrations so dev hot-reload does not keep a stale
// client singleton that predates new fields (globalThis survives HMR).
const PRISMA_CLIENT_VERSION = "20260707203604_metric_type";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  prismaClientVersion?: string;
};

function createPrismaClient() {
  return new PrismaClient();
}

export const prisma =
  globalForPrisma.prismaClientVersion === PRISMA_CLIENT_VERSION &&
  globalForPrisma.prisma
    ? globalForPrisma.prisma
    : createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
  globalForPrisma.prismaClientVersion = PRISMA_CLIENT_VERSION;
}
