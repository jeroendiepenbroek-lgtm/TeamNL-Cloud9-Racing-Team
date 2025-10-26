-- CreateTable
CREATE TABLE "user_favorites" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "favoriteRiderId" INTEGER NOT NULL,
    "notes" TEXT,
    "notificationEnabled" BOOLEAN NOT NULL DEFAULT true,
    "addedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "user_favorites_userId_fkey" FOREIGN KEY ("userId") REFERENCES "riders" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "user_favorites_favoriteRiderId_fkey" FOREIGN KEY ("favoriteRiderId") REFERENCES "riders" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "user_favorites_userId_idx" ON "user_favorites"("userId");

-- CreateIndex
CREATE INDEX "user_favorites_favoriteRiderId_idx" ON "user_favorites"("favoriteRiderId");

-- CreateIndex
CREATE UNIQUE INDEX "user_favorites_userId_favoriteRiderId_key" ON "user_favorites"("userId", "favoriteRiderId");
