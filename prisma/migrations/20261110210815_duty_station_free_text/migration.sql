-- AlterTable
ALTER TABLE "public"."Employee" ADD COLUMN     "buildingName" TEXT,
ADD COLUMN     "floorName" TEXT,
ALTER COLUMN "locationId" DROP NOT NULL,
ALTER COLUMN "floorId" DROP NOT NULL;
