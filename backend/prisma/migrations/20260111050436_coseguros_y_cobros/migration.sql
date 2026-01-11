-- CreateEnum
CREATE TYPE "CoseguroTipo" AS ENUM ('COSEGURO1', 'COSEGURO2');

-- AlterTable
ALTER TABLE "ObraSocial" ADD COLUMN     "coseguroTipo" "CoseguroTipo";

-- AlterTable
ALTER TABLE "Turno" ADD COLUMN     "cobrado" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "cobradoAt" TIMESTAMP(3),
ADD COLUMN     "cobradoPorId" TEXT,
ADD COLUMN     "importeCoseguro" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "ConfiguracionCoseguros" (
    "id" TEXT NOT NULL,
    "coseguro1" INTEGER NOT NULL DEFAULT 0,
    "coseguro2" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConfiguracionCoseguros_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Turno" ADD CONSTRAINT "Turno_cobradoPorId_fkey" FOREIGN KEY ("cobradoPorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
