-- CreateEnum
CREATE TYPE "public"."IncidentStatus" AS ENUM ('SUBMITTED', 'UNDER_REVIEW', 'IN_PROGRESS', 'ESCALATED', 'RESOLVED', 'CLOSED');

-- AlterTable
ALTER TABLE "public"."Incident" ADD COLUMN     "status" "public"."IncidentStatus" NOT NULL DEFAULT 'SUBMITTED';

-- CreateTable
CREATE TABLE "public"."IncidentStatusHistory" (
    "id" TEXT NOT NULL,
    "incidentId" TEXT NOT NULL,
    "fromStatus" "public"."IncidentStatus",
    "toStatus" "public"."IncidentStatus" NOT NULL,
    "changedById" TEXT,
    "remarks" TEXT,
    "isVisibleToReporter" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IncidentStatusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "IncidentStatusHistory_incidentId_createdAt_idx" ON "public"."IncidentStatusHistory"("incidentId", "createdAt");

-- CreateIndex
CREATE INDEX "Incident_status_idx" ON "public"."Incident"("status");

-- AddForeignKey
ALTER TABLE "public"."IncidentStatusHistory" ADD CONSTRAINT "IncidentStatusHistory_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "public"."Incident"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."IncidentStatusHistory" ADD CONSTRAINT "IncidentStatusHistory_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill: every incident starts as SUBMITTED (column default). Incidents
-- that already have an assessment were reviewed by an admin, so derive their
-- status from IncidentAssessment.status ('Open' / 'Closed').
UPDATE "public"."Incident" i
SET "status" = CASE WHEN a."status" = 'Closed' THEN 'CLOSED'::"public"."IncidentStatus"
                    ELSE 'UNDER_REVIEW'::"public"."IncidentStatus" END
FROM "public"."IncidentAssessment" a
WHERE a."incidentId" = i."id";

-- Record the backfilled change so the timeline explains it (system change, no user).
INSERT INTO "public"."IncidentStatusHistory" ("id", "incidentId", "fromStatus", "toStatus", "changedById", "remarks", "isVisibleToReporter", "createdAt")
SELECT gen_random_uuid()::text, i."id", 'SUBMITTED', i."status", NULL,
       'Status set from the existing assessment when status tracking was introduced', false, a."updatedAt"
FROM "public"."Incident" i
JOIN "public"."IncidentAssessment" a ON a."incidentId" = i."id"
WHERE i."status" <> 'SUBMITTED';
