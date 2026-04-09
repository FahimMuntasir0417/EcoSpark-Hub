-- AlterTable
ALTER TABLE "_IdeaToTag" ADD CONSTRAINT "_IdeaToTag_AB_pkey" PRIMARY KEY ("A", "B");

-- DropIndex
DROP INDEX "_IdeaToTag_AB_unique";
