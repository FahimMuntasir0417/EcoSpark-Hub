/*
  Warnings:

  - A unique constraint covering the columns `[email]` on the table `scientists` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `email` to the `scientists` table without a default value. This is not possible if the table is not empty.
  - Added the required column `name` to the `scientists` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "members" ALTER COLUMN "email" DROP NOT NULL,
ALTER COLUMN "name" DROP NOT NULL;

-- AlterTable
ALTER TABLE "scientists" ADD COLUMN     "address" TEXT,
ADD COLUMN     "contactNumber" TEXT,
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "email" TEXT NOT NULL,
ADD COLUMN     "isDeleted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "name" TEXT NOT NULL,
ADD COLUMN     "profilePhoto" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "scientists_email_key" ON "scientists"("email");
