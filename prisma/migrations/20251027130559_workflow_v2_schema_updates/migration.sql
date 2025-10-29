-- AlterTable
ALTER TABLE "events" ADD COLUMN "deletedAt" DATETIME;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_club_members" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "zwiftId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "clubId" INTEGER NOT NULL,
    "categoryRacing" TEXT,
    "ftp" REAL,
    "ftpWkg" REAL,
    "powerToWeight" REAL,
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
    "ranking" INTEGER,
    "rankingScore" REAL,
    "age" INTEGER,
    "gender" TEXT,
    "countryCode" TEXT,
    "weight" REAL,
    "height" REAL,
    "totalWins" INTEGER,
    "totalPodiums" INTEGER,
    "totalRaces" INTEGER,
    "totalDnfs" INTEGER,
    "lastRaceDate" DATETIME,
    "handicapFlat" REAL,
    "handicapRolling" REAL,
    "handicapHilly" REAL,
    "handicapMountainous" REAL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isFavorite" BOOLEAN NOT NULL DEFAULT false,
    "lastSynced" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "club_members_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "clubs" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_club_members" ("age", "anaerobicWork", "categoryRacing", "clubId", "countryCode", "createdAt", "criticalPower", "ftp", "ftpWkg", "gender", "handicapFlat", "handicapHilly", "handicapMountainous", "handicapRolling", "height", "id", "isActive", "lastRaceDate", "lastSynced", "name", "power15s", "power1min", "power20min", "power2min", "power30s", "power5min", "power5s", "powerToWeight", "powerWkg15s", "powerWkg1min", "powerWkg20min", "powerWkg2min", "powerWkg30s", "powerWkg5min", "powerWkg5s", "ranking", "rankingScore", "totalDnfs", "totalPodiums", "totalRaces", "totalWins", "weight", "zwiftId") SELECT "age", "anaerobicWork", "categoryRacing", "clubId", "countryCode", "createdAt", "criticalPower", "ftp", "ftpWkg", "gender", "handicapFlat", "handicapHilly", "handicapMountainous", "handicapRolling", "height", "id", "isActive", "lastRaceDate", "lastSynced", "name", "power15s", "power1min", "power20min", "power2min", "power30s", "power5min", "power5s", "powerToWeight", "powerWkg15s", "powerWkg1min", "powerWkg20min", "powerWkg2min", "powerWkg30s", "powerWkg5min", "powerWkg5s", "ranking", "rankingScore", "totalDnfs", "totalPodiums", "totalRaces", "totalWins", "weight", "zwiftId" FROM "club_members";
DROP TABLE "club_members";
ALTER TABLE "new_club_members" RENAME TO "club_members";
CREATE INDEX "club_members_clubId_idx" ON "club_members"("clubId");
CREATE INDEX "club_members_zwiftId_idx" ON "club_members"("zwiftId");
CREATE INDEX "club_members_ranking_idx" ON "club_members"("ranking");
CREATE INDEX "club_members_categoryRacing_idx" ON "club_members"("categoryRacing");
CREATE INDEX "club_members_lastRaceDate_idx" ON "club_members"("lastRaceDate");
CREATE INDEX "club_members_isActive_idx" ON "club_members"("isActive");
CREATE INDEX "club_members_isFavorite_idx" ON "club_members"("isFavorite");
CREATE INDEX "club_members_power5min_idx" ON "club_members"("power5min");
CREATE INDEX "club_members_powerWkg5min_idx" ON "club_members"("powerWkg5min");
CREATE INDEX "club_members_totalDnfs_idx" ON "club_members"("totalDnfs");
CREATE UNIQUE INDEX "club_members_zwiftId_clubId_key" ON "club_members"("zwiftId", "clubId");
CREATE TABLE "new_clubs" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT,
    "description" TEXT,
    "memberCount" INTEGER NOT NULL DEFAULT 0,
    "countryCode" TEXT,
    "website" TEXT,
    "discordUrl" TEXT,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "trackedSince" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isFavorite" BOOLEAN NOT NULL DEFAULT false,
    "syncEnabled" BOOLEAN NOT NULL DEFAULT true,
    "syncInterval" INTEGER NOT NULL DEFAULT 60,
    "lastSync" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_clubs" ("countryCode", "createdAt", "description", "discordUrl", "id", "isFavorite", "lastSync", "memberCount", "name", "syncEnabled", "syncInterval", "website") SELECT "countryCode", "createdAt", "description", "discordUrl", "id", "isFavorite", "lastSync", "memberCount", "name", "syncEnabled", "syncInterval", "website" FROM "clubs";
DROP TABLE "clubs";
ALTER TABLE "new_clubs" RENAME TO "clubs";
CREATE INDEX "clubs_countryCode_idx" ON "clubs"("countryCode");
CREATE INDEX "clubs_isFavorite_idx" ON "clubs"("isFavorite");
CREATE INDEX "clubs_syncEnabled_idx" ON "clubs"("syncEnabled");
CREATE INDEX "clubs_source_idx" ON "clubs"("source");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "events_deletedAt_idx" ON "events"("deletedAt");
