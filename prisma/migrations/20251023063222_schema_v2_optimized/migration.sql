/*
  Warnings:

  - You are about to drop the column `eventDate` on the `race_results` table. All the data in the column will be lost.
  - You are about to drop the column `eventName` on the `race_results` table. All the data in the column will be lost.
  - Added the required column `updatedAt` to the `race_results` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "clubs" ADD COLUMN "countryCode" TEXT;
ALTER TABLE "clubs" ADD COLUMN "description" TEXT;
ALTER TABLE "clubs" ADD COLUMN "discordUrl" TEXT;
ALTER TABLE "clubs" ADD COLUMN "website" TEXT;

-- CreateTable
CREATE TABLE "events" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "clubId" INTEGER,
    "eventType" TEXT NOT NULL DEFAULT 'race',
    "eventDate" DATETIME NOT NULL,
    "startTime" DATETIME,
    "duration" INTEGER,
    "routeName" TEXT,
    "worldName" TEXT,
    "distance" REAL,
    "elevation" REAL,
    "laps" INTEGER,
    "categories" TEXT,
    "requiresEntry" BOOLEAN NOT NULL DEFAULT false,
    "isPrivate" BOOLEAN NOT NULL DEFAULT false,
    "seriesName" TEXT,
    "eventUrl" TEXT,
    "imageUrl" TEXT,
    "totalParticipants" INTEGER NOT NULL DEFAULT 0,
    "totalFinishers" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "events_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "clubs" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "rider_statistics" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "riderId" INTEGER NOT NULL,
    "totalRaces" INTEGER NOT NULL DEFAULT 0,
    "totalWins" INTEGER NOT NULL DEFAULT 0,
    "totalPodiums" INTEGER NOT NULL DEFAULT 0,
    "totalTop10" INTEGER NOT NULL DEFAULT 0,
    "totalDNF" INTEGER NOT NULL DEFAULT 0,
    "avgPosition" REAL,
    "avgPower" REAL,
    "avgWkg" REAL,
    "avgHeartRate" REAL,
    "bestPosition" INTEGER,
    "bestPower" REAL,
    "bestWkg" REAL,
    "bestTime" INTEGER,
    "recent30dRaces" INTEGER NOT NULL DEFAULT 0,
    "recent30dWins" INTEGER NOT NULL DEFAULT 0,
    "recent30dAvgPos" REAL,
    "racesPerCategory" TEXT,
    "winsPerCategory" TEXT,
    "totalDistance" REAL NOT NULL DEFAULT 0,
    "totalRaceTime" INTEGER NOT NULL DEFAULT 0,
    "longestWinStreak" INTEGER NOT NULL DEFAULT 0,
    "currentWinStreak" INTEGER NOT NULL DEFAULT 0,
    "lastCalculated" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "rider_statistics_riderId_fkey" FOREIGN KEY ("riderId") REFERENCES "riders" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_race_results" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" INTEGER NOT NULL,
    "riderId" INTEGER NOT NULL,
    "position" INTEGER,
    "positionCategory" INTEGER,
    "category" TEXT,
    "time" INTEGER,
    "timeGap" INTEGER,
    "distance" REAL,
    "averagePower" REAL,
    "normalizedPower" REAL,
    "maxPower" REAL,
    "averageWkg" REAL,
    "zPower" REAL,
    "averageHeartRate" INTEGER,
    "maxHeartRate" INTEGER,
    "averageCadence" INTEGER,
    "maxCadence" INTEGER,
    "averageSpeed" REAL,
    "maxSpeed" REAL,
    "points" INTEGER NOT NULL DEFAULT 0,
    "primePoints" INTEGER NOT NULL DEFAULT 0,
    "didFinish" BOOLEAN NOT NULL DEFAULT true,
    "didNotStart" BOOLEAN NOT NULL DEFAULT false,
    "flagged" BOOLEAN NOT NULL DEFAULT false,
    "disqualified" BOOLEAN NOT NULL DEFAULT false,
    "flagReason" TEXT,
    "bikeFrame" TEXT,
    "bikeWheels" TEXT,
    "source" TEXT NOT NULL DEFAULT 'zwiftranking',
    "dataQuality" TEXT NOT NULL DEFAULT 'complete',
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "race_results_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "race_results_riderId_fkey" FOREIGN KEY ("riderId") REFERENCES "riders" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_race_results" ("averagePower", "averageWkg", "category", "createdAt", "distance", "eventId", "id", "position", "riderId", "source", "time") SELECT "averagePower", "averageWkg", "category", "createdAt", "distance", "eventId", "id", "position", "riderId", "source", "time" FROM "race_results";
DROP TABLE "race_results";
ALTER TABLE "new_race_results" RENAME TO "race_results";
CREATE INDEX "race_results_riderId_eventId_idx" ON "race_results"("riderId", "eventId");
CREATE INDEX "race_results_eventId_position_idx" ON "race_results"("eventId", "position");
CREATE INDEX "race_results_position_idx" ON "race_results"("position");
CREATE INDEX "race_results_category_idx" ON "race_results"("category");
CREATE INDEX "race_results_flagged_idx" ON "race_results"("flagged");
CREATE INDEX "race_results_source_idx" ON "race_results"("source");
CREATE UNIQUE INDEX "race_results_eventId_riderId_source_key" ON "race_results"("eventId", "riderId", "source");
CREATE TABLE "new_rider_history" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "riderId" INTEGER NOT NULL,
    "ftp" REAL,
    "powerToWeight" REAL,
    "ranking" INTEGER,
    "rankingScore" REAL,
    "weight" REAL,
    "categoryRacing" TEXT,
    "zPoints" INTEGER,
    "snapshotType" TEXT NOT NULL DEFAULT 'daily',
    "triggeredBy" TEXT,
    "recordedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "rider_history_riderId_fkey" FOREIGN KEY ("riderId") REFERENCES "riders" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_rider_history" ("ftp", "id", "powerToWeight", "ranking", "rankingScore", "recordedAt", "riderId", "weight") SELECT "ftp", "id", "powerToWeight", "ranking", "rankingScore", "recordedAt", "riderId", "weight" FROM "rider_history";
DROP TABLE "rider_history";
ALTER TABLE "new_rider_history" RENAME TO "rider_history";
CREATE INDEX "rider_history_riderId_recordedAt_idx" ON "rider_history"("riderId", "recordedAt");
CREATE INDEX "rider_history_recordedAt_idx" ON "rider_history"("recordedAt");
CREATE TABLE "new_riders" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "zwiftId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "clubId" INTEGER,
    "categoryRacing" TEXT,
    "categoryEnforced" BOOLEAN NOT NULL DEFAULT false,
    "ftp" REAL,
    "ftpWkg" REAL,
    "powerToWeight" REAL,
    "zFtp" REAL,
    "ranking" INTEGER,
    "rankingScore" REAL,
    "zPoints" INTEGER,
    "age" INTEGER,
    "gender" TEXT,
    "countryCode" TEXT,
    "flagCode" TEXT,
    "weight" REAL,
    "height" REAL,
    "profileImageUrl" TEXT,
    "totalEvents" INTEGER NOT NULL DEFAULT 0,
    "totalRaces" INTEGER NOT NULL DEFAULT 0,
    "totalWins" INTEGER NOT NULL DEFAULT 0,
    "totalPodiums" INTEGER NOT NULL DEFAULT 0,
    "avgPosition" REAL,
    "lastActive" DATETIME,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isPremium" BOOLEAN NOT NULL DEFAULT false,
    "isBanned" BOOLEAN NOT NULL DEFAULT false,
    "lastUpdated" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "riders_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "clubs" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_riders" ("categoryRacing", "clubId", "countryCode", "createdAt", "ftp", "height", "id", "lastUpdated", "name", "powerToWeight", "ranking", "rankingScore", "weight", "zwiftId") SELECT "categoryRacing", "clubId", "countryCode", "createdAt", "ftp", "height", "id", "lastUpdated", "name", "powerToWeight", "ranking", "rankingScore", "weight", "zwiftId" FROM "riders";
DROP TABLE "riders";
ALTER TABLE "new_riders" RENAME TO "riders";
CREATE UNIQUE INDEX "riders_zwiftId_key" ON "riders"("zwiftId");
CREATE INDEX "riders_clubId_ranking_idx" ON "riders"("clubId", "ranking");
CREATE INDEX "riders_ranking_idx" ON "riders"("ranking");
CREATE INDEX "riders_categoryRacing_idx" ON "riders"("categoryRacing");
CREATE INDEX "riders_countryCode_idx" ON "riders"("countryCode");
CREATE INDEX "riders_ftp_idx" ON "riders"("ftp");
CREATE INDEX "riders_powerToWeight_idx" ON "riders"("powerToWeight");
CREATE INDEX "riders_isActive_idx" ON "riders"("isActive");
CREATE INDEX "riders_lastActive_idx" ON "riders"("lastActive");
CREATE TABLE "new_sync_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "syncType" TEXT NOT NULL,
    "targetId" TEXT,
    "status" TEXT NOT NULL,
    "recordsProcessed" INTEGER NOT NULL DEFAULT 0,
    "recordsCreated" INTEGER NOT NULL DEFAULT 0,
    "recordsUpdated" INTEGER NOT NULL DEFAULT 0,
    "recordsFailed" INTEGER NOT NULL DEFAULT 0,
    "duration" INTEGER,
    "apiCalls" INTEGER NOT NULL DEFAULT 1,
    "errorMessage" TEXT,
    "errorStack" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "triggeredBy" TEXT NOT NULL DEFAULT 'manual',
    "metadata" TEXT,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_sync_logs" ("createdAt", "duration", "errorMessage", "id", "recordsProcessed", "status", "syncType") SELECT "createdAt", "duration", "errorMessage", "id", "recordsProcessed", "status", "syncType" FROM "sync_logs";
DROP TABLE "sync_logs";
ALTER TABLE "new_sync_logs" RENAME TO "sync_logs";
CREATE INDEX "sync_logs_syncType_createdAt_idx" ON "sync_logs"("syncType", "createdAt");
CREATE INDEX "sync_logs_status_idx" ON "sync_logs"("status");
CREATE INDEX "sync_logs_createdAt_idx" ON "sync_logs"("createdAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "events_eventDate_idx" ON "events"("eventDate");

-- CreateIndex
CREATE INDEX "events_eventType_idx" ON "events"("eventType");

-- CreateIndex
CREATE INDEX "events_clubId_idx" ON "events"("clubId");

-- CreateIndex
CREATE INDEX "events_worldName_idx" ON "events"("worldName");

-- CreateIndex
CREATE UNIQUE INDEX "rider_statistics_riderId_key" ON "rider_statistics"("riderId");

-- CreateIndex
CREATE INDEX "clubs_countryCode_idx" ON "clubs"("countryCode");
