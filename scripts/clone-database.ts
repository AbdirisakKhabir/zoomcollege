/**
 * Clone local database data to a remote/VPS database.
 *
 * Setup in .env:
 *   DATABASE_URL=...           # local source (your MAMP database)
 *   TARGET_DATABASE_URL=...    # VPS MySQL connection string
 *
 * Usage:
 *   npm run db:clone-remote
 *   npm run db:clone-remote -- --no-migrate
 *
 * The VPS database must exist and be reachable from your machine.
 * By default this runs `prisma migrate deploy` on the target first.
 */
import "dotenv/config";
import { execSync } from "node:child_process";
import { createPrismaClient, getDatabaseName } from "../src/lib/create-prisma-client";
import {
  exportDatabaseSnapshot,
  getSnapshotCounts,
  getSnapshotRowCount,
} from "../prisma/database-snapshot";
import { saveSeedDataSnapshot, seedFromDatabaseSnapshot } from "../prisma/seed-from-data";

function normalizeDatabaseUrl(url: string): string {
  return url.trim().replace(/\/$/, "");
}

function maskDatabaseUrl(url: string): string {
  try {
    const parsed = new URL(url.replace(/^mysql:/, "http:"));
    const db = parsed.pathname.replace(/^\//, "");
    const host = parsed.hostname || "socket";
    const port = parsed.port ? `:${parsed.port}` : "";
    const user = parsed.username || "user";
    return `mysql://${user}:***@${host}${port}/${db}`;
  } catch {
    return "mysql://***";
  }
}

function validateTargetUrl(url: string): void {
  let parsed: URL;
  try {
    parsed = new URL(url.replace(/^mysql:/, "http:"));
  } catch {
    throw new Error("TARGET_DATABASE_URL is not a valid MySQL URL.");
  }

  const host = parsed.hostname.toLowerCase();
  const user = decodeURIComponent(parsed.username || "");
  const password = decodeURIComponent(parsed.password || "");

  if (!host || host === "your_vps_ip" || host.includes("your_vps")) {
    throw new Error(
      'Replace YOUR_VPS_IP with your real VPS IP or hostname, e.g. mysql://root:secret@123.45.67.89:3306/zoomcollege'
    );
  }
  if ((user === "user" && password === "pass") || user === "USER" || password === "PASSWORD") {
    throw new Error("Replace the example user/password with your real VPS MySQL credentials.");
  }
}

async function testDatabaseConnection(
  prisma: ReturnType<typeof createPrismaClient>,
  label: string
): Promise<void> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    console.log(`  ${label}: connected`);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(
      [
        `Cannot connect to ${label}.`,
        "Check:",
        "  - VPS IP/hostname and port (usually 3306)",
        "  - MySQL username and password",
        "  - Database exists on the VPS",
        "  - Firewall/security group allows your IP on port 3306",
        "  - MySQL user is allowed from your IP (not only localhost)",
        "",
        `Details: ${detail}`,
      ].join("\n")
    );
  }
}

function readTargetDatabaseUrl(): string | undefined {
  const flag = process.argv.find((arg) => arg.startsWith("--target-url="));
  if (flag) {
    return flag.slice("--target-url=".length).trim();
  }
  return process.env.TARGET_DATABASE_URL?.trim();
}

async function main() {
  const sourceUrl = process.env.SOURCE_DATABASE_URL ?? process.env.DATABASE_URL;
  const targetUrl = readTargetDatabaseUrl();
  const skipMigrate = process.argv.includes("--no-migrate");

  if (!sourceUrl) {
    throw new Error("Set DATABASE_URL (local source) in .env");
  }
  if (!targetUrl) {
    throw new Error(
      [
        "Missing VPS database URL.",
        "Add TARGET_DATABASE_URL to .env, for example:",
        '  TARGET_DATABASE_URL="mysql://user:pass@YOUR_VPS_IP:3306/zoomcollege"',
        "Or pass it inline:",
        '  npm run db:clone-remote -- --target-url="mysql://user:pass@YOUR_VPS_IP:3306/zoomcollege"',
      ].join("\n")
    );
  }

  if (normalizeDatabaseUrl(sourceUrl) === normalizeDatabaseUrl(targetUrl)) {
    throw new Error("SOURCE and TARGET database URLs must be different");
  }

  validateTargetUrl(targetUrl);

  console.log("Clone plan");
  console.log(`  Source: ${maskDatabaseUrl(sourceUrl)} (${getDatabaseName(sourceUrl)})`);
  console.log(`  Target: ${maskDatabaseUrl(targetUrl)} (${getDatabaseName(targetUrl)})`);

  const source = createPrismaClient(sourceUrl);
  const target = createPrismaClient(targetUrl);

  try {
    console.log("\nChecking database connections...");
    await testDatabaseConnection(source, "Source");
    await testDatabaseConnection(target, "Target");

    console.log("\n1/4 Exporting from source...");
    const snapshot = await exportDatabaseSnapshot(source);
    const counts = getSnapshotCounts(snapshot);
    const totalRows = getSnapshotRowCount(snapshot);

    console.log(counts);
    if (totalRows === 0) {
      throw new Error("Source database is empty. Fix DATABASE_URL before cloning.");
    }

    saveSeedDataSnapshot(snapshot);
    console.log("Saved backup to prisma/seed-data.json");

    if (!skipMigrate) {
      console.log("\n2/4 Applying migrations on target...");
      execSync("npx prisma migrate deploy", {
        env: { ...process.env, DATABASE_URL: targetUrl },
        stdio: "inherit",
      });
    } else {
      console.log("\n2/4 Skipping migrations (--no-migrate)");
    }

    console.log("\n3/4 Cloning data to target (this replaces all target data)...");
    await seedFromDatabaseSnapshot(target, snapshot);

    console.log("\n4/4 Verifying target...");
    const targetUsers = await target.user.count();
    const targetStudents = await target.student.count();
    const targetDepartments = await target.department.count();

    console.log({
      users: targetUsers,
      students: targetStudents,
      departments: targetDepartments,
    });

    if (targetUsers === 0 && counts.users > 0) {
      throw new Error("Clone verification failed: target has no users after import.");
    }

    console.log("\nClone completed successfully.");
  } finally {
    await source.$disconnect();
    await target.$disconnect();
  }
}

main().catch((error) => {
  console.error("\nClone failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
