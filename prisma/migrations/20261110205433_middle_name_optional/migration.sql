-- AlterTable
ALTER TABLE "public"."Dependant" ALTER COLUMN "middleName" DROP NOT NULL;

-- AlterTable
ALTER TABLE "public"."Employee" ALTER COLUMN "middleName" DROP NOT NULL;

-- AlterTable
ALTER TABLE "public"."Spouse" ALTER COLUMN "middleName" DROP NOT NULL;
