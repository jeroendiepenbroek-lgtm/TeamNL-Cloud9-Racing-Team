-- AlterTable
ALTER TABLE "club_members" ADD COLUMN "handicapFlat" REAL;
ALTER TABLE "club_members" ADD COLUMN "handicapHilly" REAL;
ALTER TABLE "club_members" ADD COLUMN "handicapMountainous" REAL;
ALTER TABLE "club_members" ADD COLUMN "handicapRolling" REAL;
ALTER TABLE "club_members" ADD COLUMN "totalDnfs" INTEGER;

-- CreateTable
CREATE TABLE "rider_race_ratings" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "riderId" INTEGER NOT NULL,
    "currentRating" REAL,
    "currentDate" DATETIME,
    "currentExpires" DATETIME,
    "lastRating" REAL,
    "lastDate" DATETIME,
    "lastExpires" DATETIME,
    "lastMixedCat" TEXT,
    "lastMixedNum" REAL,
    "max30Rating" REAL,
    "max30Date" DATETIME,
    "max30Expires" DATETIME,
    "max90Rating" REAL,
    "max90Date" DATETIME,
    "max90Expires" DATETIME,
    "updatedAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "rider_race_ratings_riderId_fkey" FOREIGN KEY ("riderId") REFERENCES "riders" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "rider_phenotypes" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "riderId" INTEGER NOT NULL,
    "sprinter" REAL,
    "puncheur" REAL,
    "pursuiter" REAL,
    "climber" REAL,
    "tt" REAL,
    "primaryType" TEXT,
    "bias" REAL,
    "updatedAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "rider_phenotypes_riderId_fkey" FOREIGN KEY ("riderId") REFERENCES "riders" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
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
INSERT INTO "new_riders" ("age", "anaerobicWork", "avgPosition", "categoryEnforced", "categoryRacing", "clubId", "compoundScore", "countryCode", "createdAt", "criticalPower", "flagCode", "ftp", "ftpWkg", "gender", "height", "id", "isActive", "isBanned", "isPremium", "lastActive", "lastUpdated", "name", "notes", "power15s", "power1min", "power20min", "power2min", "power30s", "power5min", "power5s", "powerRating", "powerToWeight", "powerWkg15s", "powerWkg1min", "powerWkg20min", "powerWkg2min", "powerWkg30s", "powerWkg5min", "powerWkg5s", "profileImageUrl", "ranking", "rankingScore", "syncEnabled", "tags", "totalEvents", "totalPodiums", "totalRaces", "totalWins", "weight", "zFtp", "zPoints", "zwiftId") SELECT "age", "anaerobicWork", "avgPosition", "categoryEnforced", "categoryRacing", "clubId", "compoundScore", "countryCode", "createdAt", "criticalPower", "flagCode", "ftp", "ftpWkg", "gender", "height", "id", "isActive", "isBanned", "isPremium", "lastActive", "lastUpdated", "name", "notes", "power15s", "power1min", "power20min", "power2min", "power30s", "power5min", "power5s", "powerRating", "powerToWeight", "powerWkg15s", "powerWkg1min", "powerWkg20min", "powerWkg2min", "powerWkg30s", "powerWkg5min", "powerWkg5s", "profileImageUrl", "ranking", "rankingScore", "syncEnabled", "tags", "totalEvents", "totalPodiums", "totalRaces", "totalWins", "weight", "zFtp", "zPoints", "zwiftId" FROM "riders";
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
CREATE INDEX "riders_power5s_idx" ON "riders"("power5s");
CREATE INDEX "riders_power1min_idx" ON "riders"("power1min");
CREATE INDEX "riders_power5min_idx" ON "riders"("power5min");
CREATE INDEX "riders_power20min_idx" ON "riders"("power20min");
CREATE INDEX "riders_powerWkg5min_idx" ON "riders"("powerWkg5min");
CREATE INDEX "riders_totalDnfs_idx" ON "riders"("totalDnfs");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "rider_race_ratings_riderId_key" ON "rider_race_ratings"("riderId");

-- CreateIndex
CREATE INDEX "rider_race_ratings_currentRating_idx" ON "rider_race_ratings"("currentRating");

-- CreateIndex
CREATE INDEX "rider_race_ratings_max30Rating_idx" ON "rider_race_ratings"("max30Rating");

-- CreateIndex
CREATE INDEX "rider_race_ratings_max90Rating_idx" ON "rider_race_ratings"("max90Rating");

-- CreateIndex
CREATE UNIQUE INDEX "rider_phenotypes_riderId_key" ON "rider_phenotypes"("riderId");

-- CreateIndex
CREATE INDEX "rider_phenotypes_primaryType_idx" ON "rider_phenotypes"("primaryType");

-- CreateIndex
CREATE INDEX "rider_phenotypes_sprinter_idx" ON "rider_phenotypes"("sprinter");

-- CreateIndex
CREATE INDEX "rider_phenotypes_climber_idx" ON "rider_phenotypes"("climber");

-- CreateIndex
CREATE INDEX "club_members_totalDnfs_idx" ON "club_members"("totalDnfs");
