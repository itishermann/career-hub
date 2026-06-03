import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { env } from "@/lib/env";

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

function makeClient(): PrismaClient {
  const adapter = new PrismaPg({ connectionString: env.DATABASE_URL });
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

export const db: PrismaClient = global.__prisma ?? makeClient();

if (process.env.NODE_ENV !== "production") {
  global.__prisma = db;
}
