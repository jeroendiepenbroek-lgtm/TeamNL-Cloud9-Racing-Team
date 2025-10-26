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
    "source" TEXT NOT NULL DEFAULT 'manual',
    "syncEnabled" BOOLEAN NOT NULL DEFAULT true,
    "lastUpdated" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "riders_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "clubs" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_riders" ("age", "avgPosition", "categoryEnforced", "categoryRacing", "clubId", "countryCode", "createdAt", "flagCode", "ftp", "ftpWkg", "gender", "height", "id", "isActive", "isBanned", "isPremium", "lastActive", "lastUpdated", "name", "powerToWeight", "profileImageUrl", "ranking", "rankingScore", "totalEvents", "totalPodiums", "totalRaces", "totalWins", "weight", "zFtp", "zPoints", "zwiftId") SELECT "age", "avgPosition", "categoryEnforced", "categoryRacing", "clubId", "countryCode", "createdAt", "flagCode", "ftp", "ftpWkg", "gender", "height", "id", "isActive", "isBanned", "isPremium", "lastActive", "lastUpdated", "name", "powerToWeight", "profileImageUrl", "ranking", "rankingScore", "totalEvents", "totalPodiums", "totalRaces", "totalWins", "weight", "zFtp", "zPoints", "zwiftId" FROM "riders";
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
CREATE INDEX "riders_source_idx" ON "riders"("source");
CREATE INDEX "riders_syncEnabled_idx" ON "riders"("syncEnabled");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
