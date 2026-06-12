CREATE TABLE "ReportMessage" (
  "id" TEXT NOT NULL,
  "reportId" TEXT NOT NULL,
  "senderId" TEXT NOT NULL,
  "text" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ReportMessage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ReportMessage_reportId_createdAt_idx" ON "ReportMessage"("reportId", "createdAt");

ALTER TABLE "ReportMessage" ADD CONSTRAINT "ReportMessage_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "Report"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReportMessage" ADD CONSTRAINT "ReportMessage_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
