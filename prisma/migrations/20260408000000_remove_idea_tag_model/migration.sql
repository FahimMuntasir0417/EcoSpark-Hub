-- CreateTable
CREATE TABLE "_IdeaToTag" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "_IdeaToTag_AB_unique" ON "_IdeaToTag"("A", "B");

-- CreateIndex
CREATE INDEX "_IdeaToTag_B_index" ON "_IdeaToTag"("B");

-- Backfill existing idea-tag links from the explicit join table.
INSERT INTO "_IdeaToTag" ("A", "B")
SELECT "ideaId", "tagId"
FROM "IdeaTag"
ON CONFLICT ("A", "B") DO NOTHING;

-- AddForeignKey
ALTER TABLE "_IdeaToTag"
ADD CONSTRAINT "_IdeaToTag_A_fkey"
FOREIGN KEY ("A") REFERENCES "Idea"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_IdeaToTag"
ADD CONSTRAINT "_IdeaToTag_B_fkey"
FOREIGN KEY ("B") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- DropTable
DROP TABLE "IdeaTag";
