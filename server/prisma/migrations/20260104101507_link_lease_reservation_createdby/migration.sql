-- AlterTable
ALTER TABLE "Lease" ADD COLUMN     "createdByUserId" TEXT,
ADD COLUMN     "reservationId" TEXT;

-- AddForeignKey
ALTER TABLE "Lease" ADD CONSTRAINT "Lease_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lease" ADD CONSTRAINT "Lease_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "Reservation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
