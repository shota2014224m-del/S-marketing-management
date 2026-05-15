-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_AudioAsset" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "scriptId" TEXT,
    "sceneId" TEXT,
    "title" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "service" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "audioUrl" TEXT,
    "localPath" TEXT,
    "duration" INTEGER,
    "voice" TEXT,
    "language" TEXT DEFAULT 'ja',
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AudioAsset_scriptId_fkey" FOREIGN KEY ("scriptId") REFERENCES "Script" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "AudioAsset_sceneId_fkey" FOREIGN KEY ("sceneId") REFERENCES "ScriptScene" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_AudioAsset" ("audioUrl", "createdAt", "duration", "id", "language", "localPath", "notes", "scriptId", "service", "status", "text", "title", "updatedAt", "voice") SELECT "audioUrl", "createdAt", "duration", "id", "language", "localPath", "notes", "scriptId", "service", "status", "text", "title", "updatedAt", "voice" FROM "AudioAsset";
DROP TABLE "AudioAsset";
ALTER TABLE "new_AudioAsset" RENAME TO "AudioAsset";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
