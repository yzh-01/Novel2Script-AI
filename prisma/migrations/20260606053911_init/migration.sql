-- CreateTable
CREATE TABLE "ScreenplayRecord" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "novel" TEXT NOT NULL,
    "yaml" TEXT NOT NULL,
    "genre" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "author" TEXT,
    "chapterCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
