-- AlterTable
ALTER TABLE "Turno" ADD COLUMN     "ordenKinesiologiaId" TEXT,
ADD COLUMN     "sesionNro" INTEGER;

-- CreateTable
CREATE TABLE "OrdenKinesiologia" (
    "id" TEXT NOT NULL,
    "pacienteId" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,
    "cantidadSesiones" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrdenKinesiologia_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OrdenKinesiologia_pacienteId_idx" ON "OrdenKinesiologia"("pacienteId");

-- CreateIndex
CREATE UNIQUE INDEX "OrdenKinesiologia_pacienteId_numero_key" ON "OrdenKinesiologia"("pacienteId", "numero");

-- AddForeignKey
ALTER TABLE "OrdenKinesiologia" ADD CONSTRAINT "OrdenKinesiologia_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "Paciente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Turno" ADD CONSTRAINT "Turno_ordenKinesiologiaId_fkey" FOREIGN KEY ("ordenKinesiologiaId") REFERENCES "OrdenKinesiologia"("id") ON DELETE SET NULL ON UPDATE CASCADE;
