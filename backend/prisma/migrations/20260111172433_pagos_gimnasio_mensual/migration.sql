-- CreateTable
CREATE TABLE "PagoMensualGimnasio" (
    "id" TEXT NOT NULL,
    "pacienteId" TEXT NOT NULL,
    "yearMonth" TEXT NOT NULL,
    "importe" INTEGER NOT NULL DEFAULT 0,
    "cobrado" BOOLEAN NOT NULL DEFAULT false,
    "cobradoAt" TIMESTAMP(3),
    "cobradoPorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PagoMensualGimnasio_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PagoMensualGimnasio_yearMonth_idx" ON "PagoMensualGimnasio"("yearMonth");

-- CreateIndex
CREATE UNIQUE INDEX "PagoMensualGimnasio_pacienteId_yearMonth_key" ON "PagoMensualGimnasio"("pacienteId", "yearMonth");

-- AddForeignKey
ALTER TABLE "PagoMensualGimnasio" ADD CONSTRAINT "PagoMensualGimnasio_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "Paciente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PagoMensualGimnasio" ADD CONSTRAINT "PagoMensualGimnasio_cobradoPorId_fkey" FOREIGN KEY ("cobradoPorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
