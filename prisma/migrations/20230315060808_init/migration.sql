-- CreateTable
CREATE TABLE "PrintQueue" (
    "queueId" TEXT NOT NULL PRIMARY KEY,
    "jobName" TEXT NOT NULL,
    "nickname" TEXT NOT NULL,
    "length" INTEGER NOT NULL DEFAULT 0,
    "jobStatus" TEXT NOT NULL DEFAULT 'INITIAL_JOB_PASSING',
    "contentType" TEXT NOT NULL,
    "color" BOOLEAN NOT NULL DEFAULT false,
    "duplex" BOOLEAN NOT NULL DEFAULT false,
    "jobOriginatingUserName" TEXT NOT NULL DEFAULT 'ajou',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
