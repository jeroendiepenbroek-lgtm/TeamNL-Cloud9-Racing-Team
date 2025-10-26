-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_clubs" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT,
    "description" TEXT,
    "memberCount" INTEGER NOT NULL DEFAULT 0,
    "countryCode" TEXT,
    "website" TEXT,
    "discordUrl" TEXT,
    "isFavorite" BOOLEAN NOT NULL DEFAULT false,
    "syncEnabled" BOOLEAN NOT NULL DEFAULT true,
    "syncInterval" INTEGER NOT NULL DEFAULT 60,
    "lastSync" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_clubs" ("countryCode", "createdAt", "description", "discordUrl", "id", "lastSync", "memberCount", "name", "website") SELECT "countryCode", "createdAt", "description", "discordUrl", "id", "lastSync", "memberCount", "name", "website" FROM "clubs";
DROP TABLE "clubs";
ALTER TABLE "new_clubs" RENAME TO "clubs";
CREATE INDEX "clubs_countryCode_idx" ON "clubs"("countryCode");
CREATE INDEX "clubs_isFavorite_idx" ON "clubs"("isFavorite");
CREATE INDEX "clubs_syncEnabled_idx" ON "clubs"("syncEnabled");
CREATE TABLE "new_events" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "clubId" INTEGER,
    "eventType" TEXT NOT NULL DEFAULT 'race',
    "eventDate" DATETIME NOT NULL,
    "startTime" DATETIME,
    "duration" INTEGER,
    "fetchedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dataSource" TEXT NOT NULL DEFAULT 'club',
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
INSERT INTO "new_events" ("categories", "clubId", "createdAt", "description", "distance", "duration", "elevation", "eventDate", "eventType", "eventUrl", "id", "imageUrl", "isPrivate", "laps", "name", "requiresEntry", "routeName", "seriesName", "startTime", "totalFinishers", "totalParticipants", "updatedAt", "worldName") SELECT "categories", "clubId", "createdAt", "description", "distance", "duration", "elevation", "eventDate", "eventType", "eventUrl", "id", "imageUrl", "isPrivate", "laps", "name", "requiresEntry", "routeName", "seriesName", "startTime", "totalFinishers", "totalParticipants", "updatedAt", "worldName" FROM "events";
DROP TABLE "events";
ALTER TABLE "new_events" RENAME TO "events";
CREATE INDEX "events_eventDate_idx" ON "events"("eventDate");
CREATE INDEX "events_eventType_idx" ON "events"("eventType");
CREATE INDEX "events_clubId_idx" ON "events"("clubId");
CREATE INDEX "events_worldName_idx" ON "events"("worldName");
CREATE TABLE "new_race_results" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" INTEGER NOT NULL,
    "riderType" TEXT NOT NULL DEFAULT 'favorite',
    "riderId" INTEGER,
    "clubMemberId" INTEGER,
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
    CONSTRAINT "race_results_riderId_fkey" FOREIGN KEY ("riderId") REFERENCES "riders" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "race_results_clubMemberId_fkey" FOREIGN KEY ("clubMemberId") REFERENCES "club_members" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_race_results" ("averageCadence", "averageHeartRate", "averagePower", "averageSpeed", "averageWkg", "bikeFrame", "bikeWheels", "category", "createdAt", "dataQuality", "didFinish", "didNotStart", "disqualified", "distance", "eventId", "flagReason", "flagged", "id", "maxCadence", "maxHeartRate", "maxPower", "maxSpeed", "normalizedPower", "notes", "points", "position", "positionCategory", "primePoints", "riderId", "source", "time", "timeGap", "updatedAt", "zPower") SELECT "averageCadence", "averageHeartRate", "averagePower", "averageSpeed", "averageWkg", "bikeFrame", "bikeWheels", "category", "createdAt", "dataQuality", "didFinish", "didNotStart", "disqualified", "distance", "eventId", "flagReason", "flagged", "id", "maxCadence", "maxHeartRate", "maxPower", "maxSpeed", "normalizedPower", "notes", "points", "position", "positionCategory", "primePoints", "riderId", "source", "time", "timeGap", "updatedAt", "zPower" FROM "race_results";
DROP TABLE "race_results";
ALTER TABLE "new_race_results" RENAME TO "race_results";
CREATE INDEX "race_results_riderId_eventId_idx" ON "race_results"("riderId", "eventId");
CREATE INDEX "race_results_clubMemberId_eventId_idx" ON "race_results"("clubMemberId", "eventId");
CREATE INDEX "race_results_eventId_position_idx" ON "race_results"("eventId", "position");
CREATE INDEX "race_results_position_idx" ON "race_results"("position");
CREATE INDEX "race_results_category_idx" ON "race_results"("category");
CREATE INDEX "race_results_flagged_idx" ON "race_results"("flagged");
CREATE INDEX "race_results_source_idx" ON "race_results"("source");
CREATE INDEX "race_results_riderType_idx" ON "race_results"("riderType");
CREATE TABLE "new_riders" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "zwiftId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "clubId" INTEGER,
    "isFavorite" BOOLEAN NOT NULL DEFAULT true,
    "addedBy" TEXT NOT NULL DEFAULT 'manual',
    "addedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "syncPriority" INTEGER NOT NULL DEFAULT 1,
    "categoryRacing" TEXT,
    "categoryEnforced" BOOLEAN NOT NULL DEFAULT false,
    "ftp" REAL,
    "ftpWkg" REAL,
    "powerToWeight" REAL,
    "zFtp" REAL,
    "power5s" REAL,
    "power15s" REAL,
    "power30s" REAL,
    "power1min" REAL,
    "power2min" REAL,
    "power5min" REAL,
    "power20min" REAL,
    "powerWkg5s" REAL,
    "powerWkg15s" REAL,
    "powerWkg30s" REAL,
    "powerWkg1min" REAL,
    "powerWkg2min" REAL,
    "powerWkg5min" REAL,
    "powerWkg20min" REAL,
    "criticalPower" REAL,
    "anaerobicWork" REAL,
    "compoundScore" REAL,
    "powerRating" REAL,
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
    "totalDnfs" INTEGER NOT NULL DEFAULT 0,
    "avgPosition" REAL,
    "lastActive" DATETIME,
    "handicapFlat" REAL,
    "handicapRolling" REAL,
    "handicapHilly" REAL,
    "handicapMountainous" REAL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isPremium" BOOLEAN NOT NULL DEFAULT false,
    "isBanned" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "tags" TEXT,
    "syncEnabled" BOOLEAN NOT NULL DEFAULT true,
    "lastUpdated" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "riders_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "clubs" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_riders" ("age", "anaerobicWork", "avgPosition", "categoryEnforced", "categoryRacing", "clubId", "compoundScore", "countryCode", "createdAt", "criticalPower", "flagCode", "ftp", "ftpWkg", "gender", "handicapFlat", "handicapHilly", "handicapMountainous", "handicapRolling", "height", "id", "isActive", "isBanned", "isPremium", "lastActive", "lastUpdated", "name", "notes", "power15s", "power1min", "power20min", "power2min", "power30s", "power5min", "power5s", "powerRating", "powerToWeight", "powerWkg15s", "powerWkg1min", "powerWkg20min", "powerWkg2min", "powerWkg30s", "powerWkg5min", "powerWkg5s", "profileImageUrl", "ranking", "rankingScore", "syncEnabled", "tags", "totalDnfs", "totalEvents", "totalPodiums", "totalRaces", "totalWins", "weight", "zFtp", "zPoints", "zwiftId") SELECT "age", "anaerobicWork", "avgPosition", "categoryEnforced", "categoryRacing", "clubId", "compoundScore", "countryCode", "createdAt", "criticalPower", "flagCode", "ftp", "ftpWkg", "gender", "handicapFlat", "handicapHilly", "handicapMountainous", "handicapRolling", "height", "id", "isActive", "isBanned", "isPremium", "lastActive", "lastUpdated", "name", "notes", "power15s", "power1min", "power20min", "power2min", "power30s", "power5min", "power5s", "powerRating", "powerToWeight", "powerWkg15s", "powerWkg1min", "powerWkg20min", "powerWkg2min", "powerWkg30s", "powerWkg5min", "powerWkg5s", "profileImageUrl", "ranking", "rankingScore", "syncEnabled", "tags", "totalDnfs", "totalEvents", "totalPodiums", "totalRaces", "totalWins", "weight", "zFtp", "zPoints", "zwiftId" FROM "riders";
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
CREATE INDEX "riders_syncEnabled_idx" ON "riders"("syncEnabled");
CREATE INDEX "riders_syncPriority_idx" ON "riders"("syncPriority");
CREATE INDEX "riders_isFavorite_idx" ON "riders"("isFavorite");
CREATE INDEX "riders_addedBy_idx" ON "riders"("addedBy");
CREATE INDEX "riders_power5s_idx" ON "riders"("power5s");
CREATE INDEX "riders_power1min_idx" ON "riders"("power1min");
CREATE INDEX "riders_power5min_idx" ON "riders"("power5min");
CREATE INDEX "riders_power20min_idx" ON "riders"("power20min");
CREATE INDEX "riders_powerWkg5min_idx" ON "riders"("powerWkg5min");
CREATE INDEX "riders_totalDnfs_idx" ON "riders"("totalDnfs");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
