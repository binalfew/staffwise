-- CreateTable
CREATE TABLE "public"."OrganAdmin" (
    "userId" TEXT NOT NULL,
    "organId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrganAdmin_pkey" PRIMARY KEY ("userId","organId")
);

-- CreateIndex
CREATE INDEX "OrganAdmin_organId_idx" ON "public"."OrganAdmin"("organId");

-- AddForeignKey
ALTER TABLE "public"."OrganAdmin" ADD CONSTRAINT "OrganAdmin_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."OrganAdmin" ADD CONSTRAINT "OrganAdmin_organId_fkey" FOREIGN KEY ("organId") REFERENCES "public"."Organ"("id") ON DELETE CASCADE ON UPDATE CASCADE;
