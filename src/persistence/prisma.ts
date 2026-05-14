import { PrismaClient } from "@prisma/client";

export type DbClient = PrismaClient;

export function createPrismaClient(): DbClient {
  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}
