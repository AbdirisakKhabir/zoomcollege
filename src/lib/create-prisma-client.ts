import { PrismaClient } from "@prisma/client";
import { getDbAdapter } from "./db-adapter";

export function createPrismaClient(databaseUrl: string) {
  return new PrismaClient({
    adapter: getDbAdapter(databaseUrl),
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

export function getDatabaseName(databaseUrl: string): string {
  try {
    return new URL(databaseUrl.replace(/^mysql:/, "http:")).pathname.replace(/^\//, "");
  } catch {
    return "unknown";
  }
}
