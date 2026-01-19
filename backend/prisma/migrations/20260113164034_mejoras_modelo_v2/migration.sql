/*
  Warnings:

  - The `formaPago` column on the `PagoMensualGimnasio` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "FormaPago" AS ENUM ('EFECTIVO', 'TRANSFERENCIA', 'DEBITO', 'CREDITO', 'OTRO');

-- AlterTable
ALTER TABLE "PagoMensualGimnasio" DROP COLUMN "formaPago",
ADD COLUMN     "formaPago" "FormaPago";

-- CreateTable
CREATE TABLE "TurnoHistorial" (
    "id" TEXT NOT NULL,
    "turnoId" TEXT NOT NULL,
    "estadoAnterior" "TurnoEstado",
    "estadoNuevo" "TurnoEstado" NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TurnoHistorial_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TurnoHistorial_turnoId_idx" ON "TurnoHistorial"("turnoId");

-- CreateIndex
CREATE INDEX "TurnoHistorial_fecha_idx" ON "TurnoHistorial"("fecha");

-- CreateIndex
CREATE INDEX "OrdenKinesiologia_numero_idx" ON "OrdenKinesiologia"("numero");

-- AddForeignKey
ALTER TABLE "TurnoHistorial" ADD CONSTRAINT "TurnoHistorial_turnoId_fkey" FOREIGN KEY ("turnoId") REFERENCES "Turno"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TurnoHistorial" ADD CONSTRAINT "TurnoHistorial_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
