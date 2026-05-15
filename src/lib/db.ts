import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import path from "path";

function createPrismaClient() {
  const dbPath = `file:${path.join(process.cwd(), "prisma", "dev.db")}`;
  const adapter = new PrismaBetterSqlite3({ url: dbPath });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new PrismaClient({ adapter } as any);
}

// In production: cache the client in globalThis to survive HMR without creating
// multiple connections. In development: always create a fresh client so that
// schema changes from `prisma generate` take effect on hot reload without a
// full server restart. SQLite file handles are lightweight and GC'd when the old
// instance is released.
let _devClient: PrismaClient | undefined;

export const prisma = (() => {
  if (process.env.NODE_ENV === "production") {
    const g = globalThis as unknown as { prisma?: PrismaClient };
    if (!g.prisma) g.prisma = createPrismaClient();
    return g.prisma;
  }
  if (!_devClient) _devClient = createPrismaClient();
  return _devClient;
})();
