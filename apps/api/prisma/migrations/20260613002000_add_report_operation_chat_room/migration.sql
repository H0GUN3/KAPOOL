ALTER TABLE "Report" ADD COLUMN "operationChatRoomId" TEXT;

ALTER TABLE "Report" ADD CONSTRAINT "Report_operationChatRoomId_fkey" FOREIGN KEY ("operationChatRoomId") REFERENCES "ChatRoom"("id") ON DELETE SET NULL ON UPDATE CASCADE;
