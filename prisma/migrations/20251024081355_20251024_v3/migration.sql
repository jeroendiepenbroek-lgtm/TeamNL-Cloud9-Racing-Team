-- AlterTable
ALTER TABLE "club_members" ADD COLUMN "anaerobicWork" REAL;
ALTER TABLE "club_members" ADD COLUMN "criticalPower" REAL;
ALTER TABLE "club_members" ADD COLUMN "power15s" REAL;
ALTER TABLE "club_members" ADD COLUMN "power1min" REAL;
ALTER TABLE "club_members" ADD COLUMN "power20min" REAL;
ALTER TABLE "club_members" ADD COLUMN "power2min" REAL;
ALTER TABLE "club_members" ADD COLUMN "power30s" REAL;
ALTER TABLE "club_members" ADD COLUMN "power5min" REAL;
ALTER TABLE "club_members" ADD COLUMN "power5s" REAL;
ALTER TABLE "club_members" ADD COLUMN "powerWkg15s" REAL;
ALTER TABLE "club_members" ADD COLUMN "powerWkg1min" REAL;
ALTER TABLE "club_members" ADD COLUMN "powerWkg20min" REAL;
ALTER TABLE "club_members" ADD COLUMN "powerWkg2min" REAL;
ALTER TABLE "club_members" ADD COLUMN "powerWkg30s" REAL;
ALTER TABLE "club_members" ADD COLUMN "powerWkg5min" REAL;
ALTER TABLE "club_members" ADD COLUMN "powerWkg5s" REAL;

-- AlterTable
ALTER TABLE "riders" ADD COLUMN "anaerobicWork" REAL;
ALTER TABLE "riders" ADD COLUMN "compoundScore" REAL;
ALTER TABLE "riders" ADD COLUMN "criticalPower" REAL;
ALTER TABLE "riders" ADD COLUMN "power15s" REAL;
ALTER TABLE "riders" ADD COLUMN "power1min" REAL;
ALTER TABLE "riders" ADD COLUMN "power20min" REAL;
ALTER TABLE "riders" ADD COLUMN "power2min" REAL;
ALTER TABLE "riders" ADD COLUMN "power30s" REAL;
ALTER TABLE "riders" ADD COLUMN "power5min" REAL;
ALTER TABLE "riders" ADD COLUMN "power5s" REAL;
ALTER TABLE "riders" ADD COLUMN "powerRating" REAL;
ALTER TABLE "riders" ADD COLUMN "powerWkg15s" REAL;
ALTER TABLE "riders" ADD COLUMN "powerWkg1min" REAL;
ALTER TABLE "riders" ADD COLUMN "powerWkg20min" REAL;
ALTER TABLE "riders" ADD COLUMN "powerWkg2min" REAL;
ALTER TABLE "riders" ADD COLUMN "powerWkg30s" REAL;
ALTER TABLE "riders" ADD COLUMN "powerWkg5min" REAL;
ALTER TABLE "riders" ADD COLUMN "powerWkg5s" REAL;

-- CreateIndex
CREATE INDEX "club_members_power5min_idx" ON "club_members"("power5min");

-- CreateIndex
CREATE INDEX "club_members_powerWkg5min_idx" ON "club_members"("powerWkg5min");

-- CreateIndex
CREATE INDEX "riders_power5s_idx" ON "riders"("power5s");

-- CreateIndex
CREATE INDEX "riders_power1min_idx" ON "riders"("power1min");

-- CreateIndex
CREATE INDEX "riders_power5min_idx" ON "riders"("power5min");

-- CreateIndex
CREATE INDEX "riders_power20min_idx" ON "riders"("power20min");

-- CreateIndex
CREATE INDEX "riders_powerWkg5min_idx" ON "riders"("powerWkg5min");
