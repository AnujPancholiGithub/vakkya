-- AlterTable
ALTER TABLE "projects" ADD COLUMN     "autoTerminate" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "initiationMode" TEXT NOT NULL DEFAULT 'agent_first';
