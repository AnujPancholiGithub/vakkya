-- CreateTable
CREATE TABLE "form_schemas" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "fields" JSONB NOT NULL,
    "webhookUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "form_schemas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "form_submissions" (
    "id" TEXT NOT NULL,
    "formSchemaId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "webhookSent" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "form_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "form_schemas_projectId_idx" ON "form_schemas"("projectId");

-- CreateIndex
CREATE INDEX "form_submissions_formSchemaId_idx" ON "form_submissions"("formSchemaId");

-- CreateIndex
CREATE INDEX "form_submissions_sessionId_idx" ON "form_submissions"("sessionId");

-- AddForeignKey
ALTER TABLE "form_schemas" ADD CONSTRAINT "form_schemas_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "form_submissions" ADD CONSTRAINT "form_submissions_formSchemaId_fkey" FOREIGN KEY ("formSchemaId") REFERENCES "form_schemas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
