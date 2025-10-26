/*
  Warnings:

  - You are about to drop the `user_favorites` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the column `source` on the `riders` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "user_favorites_userId_favoriteRiderId_key";

-- DropIndex
DROP INDEX "user_favorites_favoriteRiderId_idx";

-- DropIndex
DROP INDEX "user_favorites_userId_idx";

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "user_favorites";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "club_members" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "zwiftId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "clubId" INTEGER NOT NULL,
    "categoryRacing" TEXT,
    "ftp" REAL,
    "ftpWkg" REAL,
    "powerToWeight" REAL,
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
    "lastRaceDate" DATETIME,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastSynced" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "club_members_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "clubs" ("id") ON DELETE CASCADE ON UPDATE CASCADE
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
    "notes" TEXT,
    "tags" TEXT,
    "syncEnabled" BOOLEAN NOT NULL DEFAULT true,
    "lastUpdated" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "riders_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "clubs" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_riders" ("age", "avgPosition", "categoryEnforced", "categoryRacing", "clubId", "countryCode", "createdAt", "flagCode", "ftp", "ftpWkg", "gender", "height", "id", "isActive", "isBanned", "isPremium", "lastActive", "lastUpdated", "name", "powerToWeight", "profileImageUrl", "ranking", "rankingScore", "syncEnabled", "totalEvents", "totalPodiums", "totalRaces", "totalWins", "weight", "zFtp", "zPoints", "zwiftId") SELECT "age", "avgPosition", "categoryEnforced", "categoryRacing", "clubId", "countryCode", "createdAt", "flagCode", "ftp", "ftpWkg", "gender", "height", "id", "isActive", "isBanned", "isPremium", "lastActive", "lastUpdated", "name", "powerToWeight", "profileImageUrl", "ranking", "rankingScore", "syncEnabled", "totalEvents", "totalPodiums", "totalRaces", "totalWins", "weight", "zFtp", "zPoints", "zwiftId" FROM "riders";
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
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "club_members_clubId_idx" ON "club_members"("clubId");

-- CreateIndex
CREATE INDEX "club_members_zwiftId_idx" ON "club_members"("zwiftId");

-- CreateIndex
CREATE INDEX "club_members_ranking_idx" ON "club_members"("ranking");

-- CreateIndex
CREATE INDEX "club_members_categoryRacing_idx" ON "club_members"("categoryRacing");

-- CreateIndex
CREATE INDEX "club_members_lastRaceDate_idx" ON "club_members"("lastRaceDate");

-- CreateIndex
CREATE INDEX "club_members_isActive_idx" ON "club_members"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "club_members_zwiftId_clubId_key" ON "club_members"("zwiftId", "clubId");
