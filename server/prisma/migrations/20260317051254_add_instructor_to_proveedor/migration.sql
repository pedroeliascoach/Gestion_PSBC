/*
  Warnings:

  - A unique constraint covering the columns `[instructorId]` on the table `Proveedor` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Proveedor" ADD COLUMN     "instructorId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Proveedor_instructorId_key" ON "Proveedor"("instructorId");

-- AddForeignKey
ALTER TABLE "Proveedor" ADD CONSTRAINT "Proveedor_instructorId_fkey" FOREIGN KEY ("instructorId") REFERENCES "Instructor"("id") ON DELETE SET NULL ON UPDATE CASCADE;
