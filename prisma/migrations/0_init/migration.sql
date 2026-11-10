-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "public"."AuditLogAction" AS ENUM ('CREATE', 'READ', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'REGISTER', 'RESET_PASSWORD', 'CHANGE_PASSWORD', 'VERIFY_EMAIL');

-- CreateEnum
CREATE TYPE "public"."CarPassRequestReason" AS ENUM ('LOST', 'DAMAGED', 'EXPIRED', 'NEW');

-- CreateEnum
CREATE TYPE "public"."CarPassRequestStatus" AS ENUM ('PENDING', 'IN_REVIEW', 'APPROVED', 'REJECTED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."CarPassRequestType" AS ENUM ('EMPLOYEE', 'SERVICEPROVIDER');

-- CreateEnum
CREATE TYPE "public"."CounterType" AS ENUM ('ACCESSREQUEST', 'IDREQUEST', 'INCIDENT', 'CARPASSREQUEST');

-- CreateEnum
CREATE TYPE "public"."EmployeeProfileStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "public"."IdRequestReason" AS ENUM ('LOST', 'DAMAGED', 'EXPIRED', 'NEW');

-- CreateEnum
CREATE TYPE "public"."IdRequestStatus" AS ENUM ('PENDING', 'IN_REVIEW', 'APPROVED', 'REJECTED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."IdRequestType" AS ENUM ('EMPLOYEE', 'DEPENDANT', 'SPOUSE', 'PRIVATEDRIVER', 'EMBASSYSTAFF', 'PARTNER', 'SERVICEPROVIDER', 'LIBRARYUSER', 'GYMUSER', 'RETIREE');

-- CreateEnum
CREATE TYPE "public"."OfficerType" AS ENUM ('ID', 'INCIDENT', 'CARPASS', 'ACCESS', 'PARKING');

-- CreateTable
CREATE TABLE "public"."AccessRequest" (
    "id" TEXT NOT NULL,
    "requestorId" TEXT NOT NULL,
    "requestNumber" TEXT NOT NULL DEFAULT '',
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccessRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Attachment" (
    "id" TEXT NOT NULL,
    "altText" TEXT,
    "type" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "extension" TEXT NOT NULL,
    "incidentId" TEXT,
    "idRequestId" TEXT,
    "carPassRequestId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Attachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" "public"."AuditLogAction" NOT NULL,
    "entity" TEXT NOT NULL,
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CarPassRequest" (
    "id" TEXT NOT NULL,
    "requestNumber" TEXT NOT NULL,
    "type" "public"."CarPassRequestType" NOT NULL DEFAULT 'EMPLOYEE',
    "status" "public"."CarPassRequestStatus" NOT NULL DEFAULT 'PENDING',
    "reason" "public"."CarPassRequestReason" NOT NULL DEFAULT 'NEW',
    "requestorEmail" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CarPassRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Connection" (
    "id" TEXT NOT NULL,
    "providerName" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Connection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Counter" (
    "id" TEXT NOT NULL,
    "type" "public"."CounterType" NOT NULL,
    "lastCounter" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Counter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Country" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "isMemberState" BOOLEAN NOT NULL,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Country_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Department" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "organId" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Department_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Dependant" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "familyName" TEXT NOT NULL,
    "middleName" TEXT NOT NULL,
    "auIdNumber" TEXT,
    "dateIssued" TIMESTAMP(3),
    "validUntil" TIMESTAMP(3),
    "dateOfBirth" TIMESTAMP(3),
    "relationshipId" TEXT NOT NULL,
    "nameOfSchool" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Dependant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."DependantIdRequest" (
    "id" TEXT NOT NULL,
    "dependantId" TEXT NOT NULL,
    "idRequestId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DependantIdRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."EmbassyStaffIdRequest" (
    "id" TEXT NOT NULL,
    "idRequestId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "idNumber" TEXT NOT NULL,
    "embassy" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "gender" TEXT NOT NULL,
    "nationality" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmbassyStaffIdRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Employee" (
    "id" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "familyName" TEXT NOT NULL,
    "middleName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "countryId" TEXT NOT NULL,
    "nationalPassportNumber" TEXT NOT NULL,
    "auPassportNumber" TEXT NOT NULL,
    "auIdNumber" TEXT NOT NULL,
    "dateIssued" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validUntil" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dateOfBirth" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "organId" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "floorId" TEXT NOT NULL,
    "officeNumber" TEXT NOT NULL,
    "specialConditions" TEXT,
    "medicallyTrained" BOOLEAN,
    "zone" TEXT,
    "team" TEXT,
    "city" TEXT,
    "subcity" TEXT,
    "woreda" TEXT,
    "street" TEXT,
    "kebele" TEXT,
    "houseNumber" TEXT,
    "houseTelephoneNumber" TEXT,
    "mobileTelephoneNumber" TEXT,
    "officeTelephoneNumber" TEXT,
    "specificLocation" TEXT,
    "gpsLocation" TEXT,
    "homeCountryAddress" TEXT,
    "profileStatus" "public"."EmployeeProfileStatus" NOT NULL DEFAULT 'PENDING',
    "profileRemarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Employee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."EmployeeCarPassRequest" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "carPassRequestId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmployeeCarPassRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."EmployeeIdRequest" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "idRequestId" TEXT NOT NULL,
    "contractExpiryDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmployeeIdRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Floor" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Floor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."IdRequest" (
    "id" TEXT NOT NULL,
    "requestNumber" TEXT NOT NULL,
    "type" "public"."IdRequestType" NOT NULL DEFAULT 'EMPLOYEE',
    "status" "public"."IdRequestStatus" NOT NULL DEFAULT 'PENDING',
    "reason" "public"."IdRequestReason" NOT NULL DEFAULT 'NEW',
    "requestorEmail" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IdRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Incident" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "incidentNumber" TEXT NOT NULL DEFAULT '',
    "incidentTypeId" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT '',
    "location" TEXT NOT NULL DEFAULT '',
    "gpsLocation" TEXT,
    "description" TEXT NOT NULL DEFAULT '',
    "eyeWitnesses" TEXT NOT NULL DEFAULT '',
    "occuredWhile" TEXT NOT NULL DEFAULT '',
    "occuredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "timeOfDay" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Incident_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."IncidentActivity" (
    "id" TEXT NOT NULL,
    "incidentId" TEXT NOT NULL,
    "officerId" TEXT NOT NULL,
    "activity" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IncidentActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."IncidentAssessment" (
    "id" TEXT NOT NULL,
    "incidentId" TEXT NOT NULL,
    "cause" TEXT NOT NULL,
    "actionTaken" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "impactType" TEXT NOT NULL,
    "likelihood" TEXT NOT NULL,
    "training" TEXT NOT NULL,
    "changeOfProcedure" TEXT NOT NULL,
    "physicalMeasures" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IncidentAssessment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."IncidentAssignment" (
    "id" TEXT NOT NULL,
    "incidentId" TEXT NOT NULL,
    "officerId" TEXT NOT NULL,
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IncidentAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."IncidentType" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IncidentType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."LibraryUserIdRequest" (
    "id" TEXT NOT NULL,
    "idRequestId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "idNumber" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "requestedBy" TEXT NOT NULL,
    "gender" TEXT NOT NULL,
    "nationality" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LibraryUserIdRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Location" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "organId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Location_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Officer" (
    "id" TEXT NOT NULL,
    "type" "public"."OfficerType" NOT NULL,
    "employeeId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Officer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Organ" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "countryId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organ_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PartnerIdRequest" (
    "id" TEXT NOT NULL,
    "idRequestId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "idNumber" TEXT NOT NULL,
    "contractExpireDate" TIMESTAMP(3) NOT NULL,
    "title" TEXT NOT NULL,
    "gender" TEXT NOT NULL,
    "nationality" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PartnerIdRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Password" (
    "hash" TEXT NOT NULL,
    "userId" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "public"."Permission" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "access" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Permission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PrivateDriverIdRequest" (
    "id" TEXT NOT NULL,
    "idRequestId" TEXT NOT NULL,
    "staffAuIdNumber" TEXT NOT NULL,
    "driverFullName" TEXT NOT NULL,
    "driverIdNumber" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "driverPhoneNumber" TEXT NOT NULL,
    "gender" TEXT NOT NULL,
    "nationality" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PrivateDriverIdRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Relationship" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Relationship_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."RetireeIdRequest" (
    "id" TEXT NOT NULL,
    "idRequestId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "idNumber" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "gender" TEXT NOT NULL,
    "nationality" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RetireeIdRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Role" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ServiceProviderIdRequest" (
    "id" TEXT NOT NULL,
    "idRequestId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "idNumber" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "serviceProviderName" TEXT NOT NULL,
    "gender" TEXT NOT NULL,
    "nationality" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceProviderIdRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Spouse" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "familyName" TEXT NOT NULL,
    "middleName" TEXT NOT NULL,
    "auIdNumber" TEXT,
    "dateIssued" TIMESTAMP(3),
    "validUntil" TIMESTAMP(3),
    "telephoneNumber" TEXT,
    "dateOfBirth" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Spouse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SpouseIdRequest" (
    "id" TEXT NOT NULL,
    "spouseId" TEXT NOT NULL,
    "idRequestId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SpouseIdRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "username" TEXT NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Vehicle" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "make" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "year" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "plateNumber" TEXT NOT NULL,
    "capacity" TEXT NOT NULL,
    "ownership" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Vehicle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Verification" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "target" TEXT NOT NULL,
    "secret" TEXT NOT NULL,
    "algorithm" TEXT NOT NULL,
    "digits" INTEGER NOT NULL,
    "period" INTEGER NOT NULL,
    "charSet" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Verification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Visitor" (
    "id" TEXT NOT NULL,
    "accessRequestId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL DEFAULT '',
    "familyName" TEXT NOT NULL DEFAULT '',
    "telephone" TEXT NOT NULL DEFAULT '',
    "organization" TEXT NOT NULL DEFAULT '',
    "whomToVisit" TEXT NOT NULL DEFAULT '',
    "destination" TEXT NOT NULL DEFAULT '',
    "carPlateNumber" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Visitor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."VisitorLog" (
    "id" TEXT NOT NULL,
    "visitorId" TEXT NOT NULL,
    "checkIn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "checkOut" TIMESTAMP(3),
    "badgeNumber" TEXT NOT NULL,
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VisitorLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."_PermissionToRole" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_PermissionToRole_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "public"."_RoleToUser" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_RoleToUser_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "Attachment_carPassRequestId_idx" ON "public"."Attachment"("carPassRequestId" ASC);

-- CreateIndex
CREATE INDEX "Attachment_idRequestId_idx" ON "public"."Attachment"("idRequestId" ASC);

-- CreateIndex
CREATE INDEX "Attachment_incidentId_idx" ON "public"."Attachment"("incidentId" ASC);

-- CreateIndex
CREATE INDEX "AuditLog_entity_idx" ON "public"."AuditLog"("entity" ASC);

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "public"."AuditLog"("userId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Connection_providerName_providerId_key" ON "public"."Connection"("providerName" ASC, "providerId" ASC);

-- CreateIndex
CREATE INDEX "Connection_userId_idx" ON "public"."Connection"("userId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Counter_type_key" ON "public"."Counter"("type" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "DependantIdRequest_idRequestId_key" ON "public"."DependantIdRequest"("idRequestId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "EmbassyStaffIdRequest_idRequestId_key" ON "public"."EmbassyStaffIdRequest"("idRequestId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "EmployeeCarPassRequest_carPassRequestId_key" ON "public"."EmployeeCarPassRequest"("carPassRequestId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "EmployeeIdRequest_idRequestId_key" ON "public"."EmployeeIdRequest"("idRequestId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "IncidentAssessment_incidentId_key" ON "public"."IncidentAssessment"("incidentId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "LibraryUserIdRequest_idRequestId_key" ON "public"."LibraryUserIdRequest"("idRequestId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Officer_type_employeeId_key" ON "public"."Officer"("type" ASC, "employeeId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "PartnerIdRequest_idRequestId_key" ON "public"."PartnerIdRequest"("idRequestId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Password_userId_key" ON "public"."Password"("userId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Permission_action_entity_access_key" ON "public"."Permission"("action" ASC, "entity" ASC, "access" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "PrivateDriverIdRequest_idRequestId_key" ON "public"."PrivateDriverIdRequest"("idRequestId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "RetireeIdRequest_idRequestId_key" ON "public"."RetireeIdRequest"("idRequestId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Role_name_key" ON "public"."Role"("name" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "ServiceProviderIdRequest_idRequestId_key" ON "public"."ServiceProviderIdRequest"("idRequestId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "SpouseIdRequest_idRequestId_key" ON "public"."SpouseIdRequest"("idRequestId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "public"."User"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "public"."User"("username" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Verification_target_type_key" ON "public"."Verification"("target" ASC, "type" ASC);

-- CreateIndex
CREATE INDEX "_PermissionToRole_B_index" ON "public"."_PermissionToRole"("B" ASC);

-- CreateIndex
CREATE INDEX "_RoleToUser_B_index" ON "public"."_RoleToUser"("B" ASC);

-- AddForeignKey
ALTER TABLE "public"."AccessRequest" ADD CONSTRAINT "AccessRequest_requestorId_fkey" FOREIGN KEY ("requestorId") REFERENCES "public"."Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Attachment" ADD CONSTRAINT "Attachment_carPassRequestId_fkey" FOREIGN KEY ("carPassRequestId") REFERENCES "public"."CarPassRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Attachment" ADD CONSTRAINT "Attachment_idRequestId_fkey" FOREIGN KEY ("idRequestId") REFERENCES "public"."IdRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Attachment" ADD CONSTRAINT "Attachment_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "public"."Incident"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Connection" ADD CONSTRAINT "Connection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Department" ADD CONSTRAINT "Department_organId_fkey" FOREIGN KEY ("organId") REFERENCES "public"."Organ"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Dependant" ADD CONSTRAINT "Dependant_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "public"."Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Dependant" ADD CONSTRAINT "Dependant_relationshipId_fkey" FOREIGN KEY ("relationshipId") REFERENCES "public"."Relationship"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DependantIdRequest" ADD CONSTRAINT "DependantIdRequest_dependantId_fkey" FOREIGN KEY ("dependantId") REFERENCES "public"."Dependant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DependantIdRequest" ADD CONSTRAINT "DependantIdRequest_idRequestId_fkey" FOREIGN KEY ("idRequestId") REFERENCES "public"."IdRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."EmbassyStaffIdRequest" ADD CONSTRAINT "EmbassyStaffIdRequest_idRequestId_fkey" FOREIGN KEY ("idRequestId") REFERENCES "public"."IdRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Employee" ADD CONSTRAINT "Employee_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "public"."Country"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Employee" ADD CONSTRAINT "Employee_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "public"."Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Employee" ADD CONSTRAINT "Employee_floorId_fkey" FOREIGN KEY ("floorId") REFERENCES "public"."Floor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Employee" ADD CONSTRAINT "Employee_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "public"."Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Employee" ADD CONSTRAINT "Employee_organId_fkey" FOREIGN KEY ("organId") REFERENCES "public"."Organ"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."EmployeeCarPassRequest" ADD CONSTRAINT "EmployeeCarPassRequest_carPassRequestId_fkey" FOREIGN KEY ("carPassRequestId") REFERENCES "public"."CarPassRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."EmployeeCarPassRequest" ADD CONSTRAINT "EmployeeCarPassRequest_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "public"."Vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."EmployeeIdRequest" ADD CONSTRAINT "EmployeeIdRequest_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "public"."Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."EmployeeIdRequest" ADD CONSTRAINT "EmployeeIdRequest_idRequestId_fkey" FOREIGN KEY ("idRequestId") REFERENCES "public"."IdRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Floor" ADD CONSTRAINT "Floor_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "public"."Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Incident" ADD CONSTRAINT "Incident_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "public"."Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Incident" ADD CONSTRAINT "Incident_incidentTypeId_fkey" FOREIGN KEY ("incidentTypeId") REFERENCES "public"."IncidentType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."IncidentActivity" ADD CONSTRAINT "IncidentActivity_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "public"."Incident"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."IncidentActivity" ADD CONSTRAINT "IncidentActivity_officerId_fkey" FOREIGN KEY ("officerId") REFERENCES "public"."Officer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."IncidentAssessment" ADD CONSTRAINT "IncidentAssessment_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "public"."Incident"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."IncidentAssignment" ADD CONSTRAINT "IncidentAssignment_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "public"."Incident"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."IncidentAssignment" ADD CONSTRAINT "IncidentAssignment_officerId_fkey" FOREIGN KEY ("officerId") REFERENCES "public"."Officer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."LibraryUserIdRequest" ADD CONSTRAINT "LibraryUserIdRequest_idRequestId_fkey" FOREIGN KEY ("idRequestId") REFERENCES "public"."IdRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Location" ADD CONSTRAINT "Location_organId_fkey" FOREIGN KEY ("organId") REFERENCES "public"."Organ"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Officer" ADD CONSTRAINT "Officer_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "public"."Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Organ" ADD CONSTRAINT "Organ_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "public"."Country"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PartnerIdRequest" ADD CONSTRAINT "PartnerIdRequest_idRequestId_fkey" FOREIGN KEY ("idRequestId") REFERENCES "public"."IdRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Password" ADD CONSTRAINT "Password_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PrivateDriverIdRequest" ADD CONSTRAINT "PrivateDriverIdRequest_idRequestId_fkey" FOREIGN KEY ("idRequestId") REFERENCES "public"."IdRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RetireeIdRequest" ADD CONSTRAINT "RetireeIdRequest_idRequestId_fkey" FOREIGN KEY ("idRequestId") REFERENCES "public"."IdRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ServiceProviderIdRequest" ADD CONSTRAINT "ServiceProviderIdRequest_idRequestId_fkey" FOREIGN KEY ("idRequestId") REFERENCES "public"."IdRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Spouse" ADD CONSTRAINT "Spouse_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "public"."Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SpouseIdRequest" ADD CONSTRAINT "SpouseIdRequest_idRequestId_fkey" FOREIGN KEY ("idRequestId") REFERENCES "public"."IdRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SpouseIdRequest" ADD CONSTRAINT "SpouseIdRequest_spouseId_fkey" FOREIGN KEY ("spouseId") REFERENCES "public"."Spouse"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Vehicle" ADD CONSTRAINT "Vehicle_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "public"."Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Visitor" ADD CONSTRAINT "Visitor_accessRequestId_fkey" FOREIGN KEY ("accessRequestId") REFERENCES "public"."AccessRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."VisitorLog" ADD CONSTRAINT "VisitorLog_visitorId_fkey" FOREIGN KEY ("visitorId") REFERENCES "public"."Visitor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_PermissionToRole" ADD CONSTRAINT "_PermissionToRole_A_fkey" FOREIGN KEY ("A") REFERENCES "public"."Permission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_PermissionToRole" ADD CONSTRAINT "_PermissionToRole_B_fkey" FOREIGN KEY ("B") REFERENCES "public"."Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_RoleToUser" ADD CONSTRAINT "_RoleToUser_A_fkey" FOREIGN KEY ("A") REFERENCES "public"."Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_RoleToUser" ADD CONSTRAINT "_RoleToUser_B_fkey" FOREIGN KEY ("B") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

