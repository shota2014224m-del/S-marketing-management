-- CreateTable
CREATE TABLE "LearningPattern" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "topic" TEXT,
    "genre" TEXT,
    "keywords" TEXT,
    "viralScore" INTEGER,
    "hook" TEXT,
    "structure" TEXT,
    "promptCore" TEXT,
    "outputSample" TEXT,
    "learnings" TEXT,
    "obsidianPath" TEXT,
    "sourceId" TEXT,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
