-- CreateTable
CREATE TABLE "clubs" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT,
    "memberCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUpdated" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "riders" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "zwiftId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "clubId" INTEGER,
    "categoryRacing" TEXT,
    "ftp" REAL,
    "weight" REAL,
    "ranking" INTEGER,
    "rankingScore" REAL,
    "countryCode" TEXT,
    "gender" TEXT,
    "age" INTEGER,
    "totalRaces" INTEGER,
    "totalWins" INTEGER,
    "totalPodiums" INTEGER,
    "totalDnfs" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSynced" DATETIME NOT NULL,
    CONSTRAINT "riders_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "clubs" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "events" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "eventDate" DATETIME NOT NULL,
    "eventType" TEXT,
    "routeName" TEXT,
    "world" TEXT,
    "distance" REAL,
    "elevation" REAL,
    "laps" INTEGER,
    "totalFinishers" INTEGER,
    "clubId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "events_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "clubs" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "race_results" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "eventId" INTEGER NOT NULL,
    "riderId" INTEGER NOT NULL,
    "position" INTEGER,
    "positionCategory" INTEGER,
    "time" INTEGER,
    "averagePower" REAL,
    "normalizedPower" REAL,
    "maxPower" REAL,
    "averageSpeed" REAL,
    "averageHeartRate" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "race_results_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "race_results_riderId_fkey" FOREIGN KEY ("riderId") REFERENCES "riders" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "event_results_source_data" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" INTEGER NOT NULL,
    "eventName" TEXT,
    "eventDate" DATETIME,
    "rawData" TEXT NOT NULL,
    "fetchedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "responseTime" INTEGER,
    CONSTRAINT "event_results_source_data_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "event_zp_source_data" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" INTEGER NOT NULL,
    "eventName" TEXT,
    "eventDate" DATETIME,
    "rawData" TEXT NOT NULL,
    "fetchedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "responseTime" INTEGER,
    CONSTRAINT "event_zp_source_data_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "rate_limit_logs" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "endpoint" TEXT NOT NULL,
    "method" TEXT NOT NULL DEFAULT 'GET',
    "statusCode" INTEGER,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "riders_zwiftId_key" ON "riders"("zwiftId");

-- CreateIndex
CREATE INDEX "riders_clubId_idx" ON "riders"("clubId");

-- CreateIndex
CREATE INDEX "riders_ranking_idx" ON "riders"("ranking");

-- CreateIndex
CREATE INDEX "events_eventDate_idx" ON "events"("eventDate");

-- CreateIndex
CREATE INDEX "events_clubId_idx" ON "events"("clubId");

-- CreateIndex
CREATE INDEX "race_results_riderId_idx" ON "race_results"("riderId");

-- CreateIndex
CREATE INDEX "race_results_eventId_idx" ON "race_results"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "race_results_eventId_riderId_key" ON "race_results"("eventId", "riderId");

-- CreateIndex
CREATE UNIQUE INDEX "event_results_source_data_eventId_key" ON "event_results_source_data"("eventId");

-- CreateIndex
CREATE INDEX "event_results_source_data_eventId_idx" ON "event_results_source_data"("eventId");

-- CreateIndex
CREATE INDEX "event_results_source_data_fetchedAt_idx" ON "event_results_source_data"("fetchedAt");

-- CreateIndex
CREATE UNIQUE INDEX "event_zp_source_data_eventId_key" ON "event_zp_source_data"("eventId");

-- CreateIndex
CREATE INDEX "event_zp_source_data_eventId_idx" ON "event_zp_source_data"("eventId");

-- CreateIndex
CREATE INDEX "event_zp_source_data_fetchedAt_idx" ON "event_zp_source_data"("fetchedAt");

-- CreateIndex
CREATE INDEX "rate_limit_logs_endpoint_idx" ON "rate_limit_logs"("endpoint");

-- CreateIndex
CREATE INDEX "rate_limit_logs_timestamp_idx" ON "rate_limit_logs"("timestamp");
