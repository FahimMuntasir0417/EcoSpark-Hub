/*
  Warnings:

  - You are about to drop the column `email` on the `members` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `members` table. All the data in the column will be lost.
  - You are about to drop the column `email` on the `scientists` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `scientists` table. All the data in the column will be lost.

*/
-- AlterEnum
ALTER TYPE "PaymentStatus" ADD VALUE 'CANCELLED';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "Role" ADD VALUE 'ADMIN';
ALTER TYPE "Role" ADD VALUE 'MODERATOR';

-- AlterEnum
ALTER TYPE "UserStatus" ADD VALUE 'SUSPENDED';

-- DropIndex
DROP INDEX "scientists_email_key";

-- AlterTable
ALTER TABLE "PaymentTransaction" ALTER COLUMN "status" DROP DEFAULT;

-- AlterTable
ALTER TABLE "members" DROP COLUMN "email",
DROP COLUMN "name";

-- AlterTable
ALTER TABLE "scientists" DROP COLUMN "email",
DROP COLUMN "name";
