-- CreateTable
CREATE TABLE "clubs" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT,
    "memberCount" INTEGER NOT NULL DEFAULT 0,
    "lastSync" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "riders" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "zwiftId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "clubId" INTEGER,
    "categoryRacing" TEXT,
    "ftp" REAL,
    "powerToWeight" REAL,
    "ranking" INTEGER,
    "rankingScore" REAL,
    "countryCode" TEXT,
    "weight" REAL,
    "height" REAL,
    "lastUpdated" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "riders_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "clubs" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "race_results" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" INTEGER NOT NULL,
    "riderId" INTEGER NOT NULL,
    "eventName" TEXT,
    "eventDate" DATETIME,
    "position" INTEGER,
    "category" TEXT,
    "averagePower" REAL,
    "averageWkg" REAL,
    "time" INTEGER,
    "distance" REAL,
    "source" TEXT NOT NULL DEFAULT 'zwiftpower',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "race_results_riderId_fkey" FOREIGN KEY ("riderId") REFERENCES "riders" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "rider_history" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "riderId" INTEGER NOT NULL,
    "ftp" REAL,
    "powerToWeight" REAL,
    "ranking" INTEGER,
    "rankingScore" REAL,
    "weight" REAL,
    "recordedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "rider_history_riderId_fkey" FOREIGN KEY ("riderId") REFERENCES "riders" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "sync_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "syncType" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "recordsProcessed" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "duration" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "riders_zwiftId_key" ON "riders"("zwiftId");

-- CreateIndex
CREATE INDEX "riders_clubId_idx" ON "riders"("clubId");

-- CreateIndex
CREATE INDEX "riders_ranking_idx" ON "riders"("ranking");

-- CreateIndex
CREATE INDEX "race_results_riderId_idx" ON "race_results"("riderId");

-- CreateIndex
CREATE INDEX "race_results_eventId_idx" ON "race_results"("eventId");

-- CreateIndex
CREATE INDEX "race_results_eventDate_idx" ON "race_results"("eventDate");

-- CreateIndex
CREATE UNIQUE INDEX "race_results_eventId_riderId_source_key" ON "race_results"("eventId", "riderId", "source");

-- CreateIndex
CREATE INDEX "rider_history_riderId_recordedAt_idx" ON "rider_history"("riderId", "recordedAt");

-- CreateIndex
CREATE INDEX "sync_logs_syncType_createdAt_idx" ON "sync_logs"("syncType", "createdAt");
