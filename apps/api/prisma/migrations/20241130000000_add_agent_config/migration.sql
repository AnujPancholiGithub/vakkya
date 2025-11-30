-- Add custom agent configuration fields to projects
-- These are nullable for backward compatibility with existing projects

ALTER TABLE "projects" ADD COLUMN "systemPrompt" TEXT;
ALTER TABLE "projects" ADD COLUMN "agentName" TEXT;
