-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_VideoAsset" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "scriptId" TEXT,
    "imageId" TEXT,
    "audioId" TEXT,
    "title" TEXT NOT NULL,
    "service" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "videoUrl" TEXT,
    "localPath" TEXT,
    "thumbnailUrl" TEXT,
    "duration" INTEGER,
    "aspectRatio" TEXT DEFAULT '9:16',
    "notes" TEXT,
    "jobId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "VideoAsset_scriptId_fkey" FOREIGN KEY ("scriptId") REFERENCES "Script" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "VideoAsset_imageId_fkey" FOREIGN KEY ("imageId") REFERENCES "ImageAsset" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "VideoAsset_audioId_fkey" FOREIGN KEY ("audioId") REFERENCES "AudioAsset" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_VideoAsset" ("aspectRatio", "createdAt", "duration", "id", "imageId", "jobId", "localPath", "notes", "scriptId", "service", "status", "thumbnailUrl", "title", "updatedAt", "videoUrl") SELECT "aspectRatio", "createdAt", "duration", "id", "imageId", "jobId", "localPath", "notes", "scriptId", "service", "status", "thumbnailUrl", "title", "updatedAt", "videoUrl" FROM "VideoAsset";
DROP TABLE "VideoAsset";
ALTER TABLE "new_VideoAsset" RENAME TO "VideoAsset";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
