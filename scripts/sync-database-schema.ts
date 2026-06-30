import "dotenv/config";
import { execSync } from "node:child_process";

function run(command: string): void {
  execSync(command, {
    stdio: "inherit",
    env: process.env,
  });
}

/**
 * Ensure DB schema matches prisma/schema.prisma.
 * - Normal path: prisma migrate deploy
 * - VPS / legacy DBs (P3005): prisma db push
 */
export function syncDatabaseSchema(): void {
  console.log("Syncing database schema...");

  try {
    run("npx prisma migrate deploy");
    console.log("Migrations applied.");
    return;
  } catch {
    console.warn("\nprisma migrate deploy failed.");
    console.warn(
      "Common causes: P3005 (database already has tables but no Prisma migration history)."
    );
    console.log("Falling back to prisma db push...");
  }

  run("npx prisma db push --skip-generate --accept-data-loss");
  console.log("Schema synced with db push.");
}

if (require.main === module) {
  try {
    syncDatabaseSchema();
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}
