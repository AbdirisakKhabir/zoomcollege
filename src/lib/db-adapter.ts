import { PrismaMariaDb } from "@prisma/adapter-mariadb";

function parseDatabaseUrl(databaseUrl: string) {
  const parsed = new URL(databaseUrl);
  const socket = parsed.searchParams.get("socket");

  if (socket) {
    return new PrismaMariaDb({
      user: decodeURIComponent(parsed.username),
      password: decodeURIComponent(parsed.password),
      database: parsed.pathname.replace(/^\//, ""),
      socketPath: socket,
      connectTimeout: 15000,
      acquireTimeout: 15000,
    });
  }

  return new PrismaMariaDb({
    host: parsed.hostname,
    port: parsed.port ? Number(parsed.port) : 3306,
    user: decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password),
    database: parsed.pathname.replace(/^\//, ""),
    connectTimeout: 15000,
    acquireTimeout: 15000,
  });
}

export function getDbAdapter(databaseUrl = process.env.DATABASE_URL) {
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not set");
  }

  return parseDatabaseUrl(databaseUrl);
}
