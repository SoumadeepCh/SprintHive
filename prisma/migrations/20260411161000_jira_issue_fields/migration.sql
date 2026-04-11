CREATE TYPE "IssueType" AS ENUM ('EPIC', 'STORY', 'TASK', 'BUG', 'SUBTASK');

CREATE TYPE "TaskActivityType" AS ENUM (
  'CREATED',
  'UPDATED',
  'STATUS_CHANGED',
  'ASSIGNEE_CHANGED',
  'SPRINT_CHANGED',
  'COMMENTED',
  'DELETED'
);

ALTER TABLE "Project" ADD COLUMN "key" TEXT;

ALTER TABLE "Task" ADD COLUMN "key" TEXT;
ALTER TABLE "Task" ADD COLUMN "issueType" "IssueType" NOT NULL DEFAULT 'TASK';
ALTER TABLE "Task" ADD COLUMN "projectId" INTEGER;
ALTER TABLE "Task" ADD COLUMN "parentId" INTEGER;
ALTER TABLE "Task" ADD COLUMN "storyPoints" INTEGER;
ALTER TABLE "Task" ADD COLUMN "rank" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Task" ADD COLUMN "reporterId" INTEGER;

UPDATE "Project"
SET "key" = UPPER(SUBSTRING(REGEXP_REPLACE(name, '[^A-Za-z0-9]', '', 'g') FROM 1 FOR 4)) || id::text
WHERE "key" IS NULL;

UPDATE "Project"
SET "key" = 'PRJ' || id::text
WHERE "key" IS NULL OR "key" = '';

UPDATE "Task" t
SET "projectId" = s."projectId"
FROM "Sprint" s
WHERE t."sprintId" = s.id;

UPDATE "Task"
SET "rank" = id
WHERE "rank" = 0;

UPDATE "Task" t
SET "key" = p."key" || '-' || t.id::text
FROM "Project" p
WHERE t."projectId" = p.id AND t."key" IS NULL;

ALTER TABLE "Task" ALTER COLUMN "projectId" SET NOT NULL;
ALTER TABLE "Task" ALTER COLUMN "sprintId" DROP NOT NULL;

CREATE TABLE "TaskActivity" (
  "id" SERIAL NOT NULL,
  "taskId" INTEGER NOT NULL,
  "actorId" INTEGER,
  "actorName" TEXT NOT NULL,
  "type" "TaskActivityType" NOT NULL,
  "field" TEXT,
  "fromValue" TEXT,
  "toValue" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TaskActivity_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Task"
ADD CONSTRAINT "Task_projectId_fkey"
FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Task"
ADD CONSTRAINT "Task_parentId_fkey"
FOREIGN KEY ("parentId") REFERENCES "Task"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "TaskActivity"
ADD CONSTRAINT "TaskActivity_taskId_fkey"
FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE UNIQUE INDEX "Project_organizationId_key_key" ON "Project"("organizationId", "key");
CREATE UNIQUE INDEX "Task_projectId_key_key" ON "Task"("projectId", "key");
CREATE INDEX "Task_projectId_sprintId_rank_idx" ON "Task"("projectId", "sprintId", "rank");
CREATE INDEX "TaskActivity_taskId_createdAt_idx" ON "TaskActivity"("taskId", "createdAt");
