-- CreateTable
CREATE TABLE "ReportSnapshot" (
    "id" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "metricsJson" JSONB NOT NULL,
    "filesMeta" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReportSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ReportSnapshot_periodEnd_idx" ON "ReportSnapshot"("periodEnd");

-- CreateIndex
CREATE INDEX "ReportSnapshot_periodStart_idx" ON "ReportSnapshot"("periodStart");

