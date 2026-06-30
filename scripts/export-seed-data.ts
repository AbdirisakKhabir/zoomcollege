/**
 * Export the current database into prisma/seed-data.json for use by `npx prisma seed`.
 *
 * Usage: npm run db:export-seed
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { getDatabaseName } from "../src/lib/create-prisma-client";
import {
  exportDatabaseSnapshot,
  getSnapshotCounts,
  getSnapshotRowCount,
} from "../prisma/database-snapshot";
import { saveSeedDataSnapshot } from "../prisma/seed-from-data";

async function main() {
  const databaseUrl = process.env.DATABASE_URL ?? "";
  const databaseName = getDatabaseName(databaseUrl);

  const data = await exportDatabaseSnapshot(prisma);
  saveSeedDataSnapshot(data);

  const counts = getSnapshotCounts(data);
  const totalRows = getSnapshotRowCount(data);

  console.log(`Connected database: ${databaseName}`);
  console.log("Exported database snapshot to prisma/seed-data.json");
  console.log(counts);

  if (totalRows === 0) {
    console.error(
      "\nExport failed: no rows found. Check DATABASE_URL in .env points to the database that has your data."
    );
    console.error(
      "If you already ran `npx prisma db seed` with an empty snapshot, it may have wiped this database."
    );
    process.exit(1);
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    void prisma.$disconnect();
    process.exit(1);
  });
