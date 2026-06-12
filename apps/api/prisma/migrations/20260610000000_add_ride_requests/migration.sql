CREATE TABLE "RideRequest" (
  "id" TEXT NOT NULL,
  "passengerId" TEXT NOT NULL,
  "from" TEXT NOT NULL,
  "to" TEXT NOT NULL,
  "time" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RideRequest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "RideRequest_passengerId_idx" ON "RideRequest"("passengerId");
CREATE INDEX "RideRequest_createdAt_idx" ON "RideRequest"("createdAt");

ALTER TABLE "RideRequest" ADD CONSTRAINT "RideRequest_passengerId_fkey" FOREIGN KEY ("passengerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
