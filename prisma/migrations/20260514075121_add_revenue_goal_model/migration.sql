-- CreateTable
CREATE TABLE "RevenueGoal" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "yearMonth" TEXT NOT NULL,
    "goal" REAL NOT NULL,
    "actual" REAL NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "RevenueGoal_yearMonth_key" ON "RevenueGoal"("yearMonth");
