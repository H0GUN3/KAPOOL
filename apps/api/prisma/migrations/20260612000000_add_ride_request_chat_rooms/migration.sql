ALTER TABLE "ChatRoom" ADD COLUMN "rideRequestId" TEXT;
ALTER TABLE "ChatRoom" ALTER COLUMN "rideId" DROP NOT NULL;

CREATE UNIQUE INDEX "ChatRoom_rideRequestId_key" ON "ChatRoom"("rideRequestId");

ALTER TABLE "ChatRoom" ADD CONSTRAINT "ChatRoom_rideRequestId_fkey" FOREIGN KEY ("rideRequestId") REFERENCES "RideRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
