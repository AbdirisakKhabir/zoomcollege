import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { loadSeedDataSnapshot, seedFromDatabaseSnapshot } from "./seed-from-data";
import { seedDefaultBootstrap } from "./seed-default";

async function main() {
  const snapshot = loadSeedDataSnapshot();

  if (snapshot) {
    await seedFromDatabaseSnapshot(prisma, snapshot);
    console.log("Seed completed from prisma/seed-data.json");
    return;
  }

  console.log("No prisma/seed-data.json found — running default bootstrap seed.");
  console.log("To seed your current database data, run: npm run db:export-seed");
  await seedDefaultBootstrap(prisma);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    void prisma.$disconnect();
    process.exit(1);
  });
