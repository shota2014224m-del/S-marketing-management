-- CreateTable
CREATE TABLE "VideoTemplate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "genre" TEXT,
    "targetAudience" TEXT,
    "duration" INTEGER NOT NULL DEFAULT 60,
    "tone" TEXT,
    "keywords" TEXT,
    "structure" TEXT,
    "hookTemplate" TEXT,
    "ctaTemplate" TEXT,
    "notes" TEXT,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
