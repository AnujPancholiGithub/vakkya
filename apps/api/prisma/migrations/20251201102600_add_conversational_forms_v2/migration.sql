-- AlterTable
ALTER TABLE "form_schemas" ADD COLUMN     "completionMessage" TEXT,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "greetingMessage" TEXT,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "triggerPhrases" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "webhookSecret" TEXT;

-- AlterTable
ALTER TABLE "form_submissions" ADD COLUMN     "conversationId" TEXT,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'pending',
ADD COLUMN     "webhookAttempts" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "form_events" (
    "id" TEXT NOT NULL,
    "formSchemaId" TEXT NOT NULL,
    "conversationId" TEXT,
    "sessionId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "fieldName" TEXT,
    "fieldValue" TEXT,
    "attemptCount" INTEGER,
    "metadata" JSONB,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "form_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "form_events_formSchemaId_idx" ON "form_events"("formSchemaId");

-- CreateIndex
CREATE INDEX "form_events_conversationId_idx" ON "form_events"("conversationId");

-- CreateIndex
CREATE INDEX "form_events_sessionId_idx" ON "form_events"("sessionId");

-- CreateIndex
CREATE INDEX "form_events_eventType_idx" ON "form_events"("eventType");

-- CreateIndex
CREATE INDEX "form_schemas_projectId_isActive_idx" ON "form_schemas"("projectId", "isActive");

-- CreateIndex
CREATE INDEX "form_submissions_conversationId_idx" ON "form_submissions"("conversationId");

-- AddForeignKey
ALTER TABLE "form_submissions" ADD CONSTRAINT "form_submissions_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "form_events" ADD CONSTRAINT "form_events_formSchemaId_fkey" FOREIGN KEY ("formSchemaId") REFERENCES "form_schemas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "form_events" ADD CONSTRAINT "form_events_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
