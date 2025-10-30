-- CreateTable
CREATE TABLE "club_source_data" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clubId" INTEGER NOT NULL,
    "endpoint" TEXT NOT NULL DEFAULT '/public/clubs/:id',
    "rawData" TEXT NOT NULL,
    "name" TEXT,
    "memberCount" INTEGER,
    "countryCode" TEXT,
    "rateLimitRemaining" INTEGER,
    "rateLimitReset" DATETIME,
    "apiVersion" TEXT NOT NULL DEFAULT 'v1',
    "responseStatus" INTEGER NOT NULL DEFAULT 200,
    "responseTime" INTEGER,
    "fetchedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "club_roster_source_data" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clubId" INTEGER NOT NULL,
    "fromRiderId" INTEGER NOT NULL,
    "endpoint" TEXT NOT NULL DEFAULT '/public/clubs/:id/:riderId',
    "rawData" TEXT NOT NULL,
    "ridersCount" INTEGER NOT NULL DEFAULT 0,
    "rateLimitRemaining" INTEGER,
    "rateLimitReset" DATETIME,
    "responseStatus" INTEGER NOT NULL DEFAULT 200,
    "responseTime" INTEGER,
    "fetchedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "event_results_source_data" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" INTEGER NOT NULL,
    "endpoint" TEXT NOT NULL DEFAULT '/public/results/:eventId',
    "rawData" TEXT NOT NULL,
    "participantsCount" INTEGER NOT NULL DEFAULT 0,
    "finishersCount" INTEGER NOT NULL DEFAULT 0,
    "eventName" TEXT,
    "eventDate" DATETIME,
    "rateLimitRemaining" INTEGER,
    "rateLimitReset" DATETIME,
    "responseStatus" INTEGER NOT NULL DEFAULT 200,
    "responseTime" INTEGER,
    "fetchedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "event_zp_source_data" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" INTEGER NOT NULL,
    "endpoint" TEXT NOT NULL DEFAULT '/public/zp/:eventId/results',
    "rawData" TEXT NOT NULL,
    "participantsCount" INTEGER NOT NULL DEFAULT 0,
    "eventName" TEXT,
    "eventDate" DATETIME,
    "rateLimitRemaining" INTEGER,
    "rateLimitReset" DATETIME,
    "responseStatus" INTEGER NOT NULL DEFAULT 200,
    "responseTime" INTEGER,
    "fetchedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "rider_source_data" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "riderId" INTEGER NOT NULL,
    "endpoint" TEXT NOT NULL DEFAULT '/public/riders/:riderId',
    "rawData" TEXT NOT NULL,
    "name" TEXT,
    "ranking" INTEGER,
    "categoryRacing" TEXT,
    "ftp" REAL,
    "rateLimitRemaining" INTEGER,
    "rateLimitReset" DATETIME,
    "responseStatus" INTEGER NOT NULL DEFAULT 200,
    "responseTime" INTEGER,
    "fetchedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "rider_history_source_data" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "riderId" INTEGER NOT NULL,
    "epochTime" INTEGER NOT NULL,
    "endpoint" TEXT NOT NULL DEFAULT '/public/riders/:riderId/:time',
    "rawData" TEXT NOT NULL,
    "name" TEXT,
    "ranking" INTEGER,
    "ftp" REAL,
    "rateLimitRemaining" INTEGER,
    "rateLimitReset" DATETIME,
    "responseStatus" INTEGER NOT NULL DEFAULT 200,
    "responseTime" INTEGER,
    "snapshotDate" DATETIME NOT NULL,
    "fetchedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "rider_bulk_source_data" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "endpoint" TEXT NOT NULL DEFAULT 'POST /public/riders',
    "riderIds" TEXT NOT NULL,
    "rawData" TEXT NOT NULL,
    "requestedCount" INTEGER NOT NULL DEFAULT 0,
    "returnedCount" INTEGER NOT NULL DEFAULT 0,
    "rateLimitRemaining" INTEGER,
    "rateLimitReset" DATETIME,
    "responseStatus" INTEGER NOT NULL DEFAULT 200,
    "responseTime" INTEGER,
    "fetchedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "rider_bulk_history_source_data" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "epochTime" INTEGER NOT NULL,
    "endpoint" TEXT NOT NULL DEFAULT 'POST /public/riders/:time',
    "riderIds" TEXT NOT NULL,
    "rawData" TEXT NOT NULL,
    "requestedCount" INTEGER NOT NULL DEFAULT 0,
    "returnedCount" INTEGER NOT NULL DEFAULT 0,
    "rateLimitRemaining" INTEGER,
    "rateLimitReset" DATETIME,
    "responseStatus" INTEGER NOT NULL DEFAULT 200,
    "responseTime" INTEGER,
    "snapshotDate" DATETIME NOT NULL,
    "fetchedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "rate_limit_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "endpoint" TEXT NOT NULL,
    "method" TEXT NOT NULL DEFAULT 'GET',
    "limitMax" INTEGER NOT NULL,
    "limitRemaining" INTEGER NOT NULL,
    "limitResetAt" DATETIME NOT NULL,
    "requestUrl" TEXT,
    "responseStatus" INTEGER,
    "responseTime" INTEGER,
    "recordedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "club_source_data_clubId_fetchedAt_idx" ON "club_source_data"("clubId", "fetchedAt");

-- CreateIndex
CREATE INDEX "club_source_data_fetchedAt_idx" ON "club_source_data"("fetchedAt");

-- CreateIndex
CREATE INDEX "club_roster_source_data_clubId_fetchedAt_idx" ON "club_roster_source_data"("clubId", "fetchedAt");

-- CreateIndex
CREATE INDEX "club_roster_source_data_fetchedAt_idx" ON "club_roster_source_data"("fetchedAt");

-- CreateIndex
CREATE INDEX "event_results_source_data_eventId_fetchedAt_idx" ON "event_results_source_data"("eventId", "fetchedAt");

-- CreateIndex
CREATE INDEX "event_results_source_data_eventDate_idx" ON "event_results_source_data"("eventDate");

-- CreateIndex
CREATE INDEX "event_results_source_data_fetchedAt_idx" ON "event_results_source_data"("fetchedAt");

-- CreateIndex
CREATE INDEX "event_zp_source_data_eventId_fetchedAt_idx" ON "event_zp_source_data"("eventId", "fetchedAt");

-- CreateIndex
CREATE INDEX "event_zp_source_data_eventDate_idx" ON "event_zp_source_data"("eventDate");

-- CreateIndex
CREATE INDEX "event_zp_source_data_fetchedAt_idx" ON "event_zp_source_data"("fetchedAt");

-- CreateIndex
CREATE INDEX "rider_source_data_riderId_fetchedAt_idx" ON "rider_source_data"("riderId", "fetchedAt");

-- CreateIndex
CREATE INDEX "rider_source_data_fetchedAt_idx" ON "rider_source_data"("fetchedAt");

-- CreateIndex
CREATE INDEX "rider_history_source_data_riderId_snapshotDate_idx" ON "rider_history_source_data"("riderId", "snapshotDate");

-- CreateIndex
CREATE INDEX "rider_history_source_data_riderId_fetchedAt_idx" ON "rider_history_source_data"("riderId", "fetchedAt");

-- CreateIndex
CREATE INDEX "rider_history_source_data_fetchedAt_idx" ON "rider_history_source_data"("fetchedAt");

-- CreateIndex
CREATE INDEX "rider_bulk_source_data_fetchedAt_idx" ON "rider_bulk_source_data"("fetchedAt");

-- CreateIndex
CREATE INDEX "rider_bulk_history_source_data_snapshotDate_idx" ON "rider_bulk_history_source_data"("snapshotDate");

-- CreateIndex
CREATE INDEX "rider_bulk_history_source_data_fetchedAt_idx" ON "rider_bulk_history_source_data"("fetchedAt");

-- CreateIndex
CREATE INDEX "rate_limit_logs_endpoint_recordedAt_idx" ON "rate_limit_logs"("endpoint", "recordedAt");

-- CreateIndex
CREATE INDEX "rate_limit_logs_limitResetAt_idx" ON "rate_limit_logs"("limitResetAt");

-- CreateIndex
CREATE INDEX "rate_limit_logs_recordedAt_idx" ON "rate_limit_logs"("recordedAt");
