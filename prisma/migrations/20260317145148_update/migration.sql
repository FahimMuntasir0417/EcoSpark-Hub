/*
  Warnings:

  - The values [UNPAID] on the enum `PaymentStatus` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `isdeleted` on the `admin` table. All the data in the column will be lost.
  - You are about to drop the column `email` on the `members` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `members` table. All the data in the column will be lost.
  - You are about to drop the column `email` on the `scientists` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `scientists` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "IdeaStatus" AS ENUM ('DRAFT', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "IdeaVisibility" AS ENUM ('PUBLIC', 'PRIVATE', 'UNLISTED');

-- CreateEnum
CREATE TYPE "IdeaAccessType" AS ENUM ('FREE', 'PAID', 'MEMBERS_ONLY');

-- CreateEnum
CREATE TYPE "VoteType" AS ENUM ('UP', 'DOWN');

-- CreateEnum
CREATE TYPE "ModerationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('IDEA_APPROVED', 'IDEA_REJECTED', 'REPORT_APPROVED', 'REPORT_REJECTED', 'COMMENT_REPLY', 'PURCHASE_SUCCESS', 'PURCHASE_FAILED', 'NEW_FEATURED_IDEA', 'IDEA_UNDER_REVIEW', 'SYSTEM');

-- CreateEnum
CREATE TYPE "AttachmentType" AS ENUM ('PDF', 'DOC', 'IMAGE', 'VIDEO', 'OTHER');

-- CreateEnum
CREATE TYPE "MediaType" AS ENUM ('IMAGE', 'VIDEO');

-- CreateEnum
CREATE TYPE "FeedbackType" AS ENUM ('REVIEW', 'REJECTION', 'IMPROVEMENT');

-- CreateEnum
CREATE TYPE "ReportReason" AS ENUM ('SPAM', 'ABUSE', 'MISINFORMATION', 'INAPPROPRIATE', 'COPYRIGHT', 'OTHER');

-- CreateEnum
CREATE TYPE "ModerationActionType" AS ENUM ('IDEA_APPROVED', 'IDEA_REJECTED', 'IDEA_ARCHIVED', 'COMMENT_DELETED', 'COMMENT_RESTORED', 'USER_SUSPENDED', 'USER_BLOCKED', 'REPORT_RESOLVED');

-- AlterEnum
BEGIN;
CREATE TYPE "PaymentStatus_new" AS ENUM ('PENDING', 'PAID', 'FAILED', 'REFUNDED');
ALTER TYPE "PaymentStatus" RENAME TO "PaymentStatus_old";
ALTER TYPE "PaymentStatus_new" RENAME TO "PaymentStatus";
DROP TYPE "public"."PaymentStatus_old";
COMMIT;

-- DropIndex
DROP INDEX IF EXISTS "admin_isdeleted_idx";

-- AlterTable
ALTER TABLE "admin" RENAME COLUMN "isdeleted" TO "isDeleted";

-- CreateTable
CREATE TABLE "Campaign" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "bannerImage" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "goalText" TEXT,
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "color" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tag" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IdeaPurchase" (
    "id" TEXT NOT NULL,
    "ideaId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "paymentProvider" TEXT NOT NULL,
    "providerPaymentId" TEXT,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "paidAt" TIMESTAMP(3),
    "refundedAt" TIMESTAMP(3),
    "accessExpiresAt" TIMESTAMP(3),
    "receiptUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IdeaPurchase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentTransaction" (
    "id" TEXT NOT NULL,
    "purchaseId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "provider" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "gatewayResponse" JSONB,
    "failureReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExperienceReport" (
    "id" TEXT NOT NULL,
    "ideaId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "outcome" TEXT NOT NULL,
    "challenges" TEXT,
    "measurableResult" TEXT,
    "adoptedScale" TEXT,
    "location" TEXT,
    "effectivenessRating" INTEGER NOT NULL,
    "beforeImageUrl" TEXT,
    "afterImageUrl" TEXT,
    "status" "ModerationStatus" NOT NULL DEFAULT 'PENDING',
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExperienceReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "actionUrl" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NewsletterSubscription" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "userId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "source" TEXT,
    "subscribedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unsubscribedAt" TIMESTAMP(3),

    CONSTRAINT "NewsletterSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Idea" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "excerpt" TEXT,
    "problemStatement" TEXT NOT NULL,
    "proposedSolution" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "implementationSteps" TEXT,
    "risksAndChallenges" TEXT,
    "requiredResources" TEXT,
    "expectedBenefits" TEXT,
    "targetAudience" TEXT,
    "coverImageUrl" TEXT,
    "videoUrl" TEXT,
    "status" "IdeaStatus" NOT NULL DEFAULT 'DRAFT',
    "visibility" "IdeaVisibility" NOT NULL DEFAULT 'PUBLIC',
    "accessType" "IdeaAccessType" NOT NULL DEFAULT 'FREE',
    "price" DECIMAL(10,2),
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "rejectionFeedback" TEXT,
    "adminNote" TEXT,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "featuredAt" TIMESTAMP(3),
    "isHighlighted" BOOLEAN NOT NULL DEFAULT false,
    "authorId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "campaignId" TEXT,
    "estimatedCost" INTEGER,
    "implementationEffort" INTEGER,
    "expectedImpact" INTEGER,
    "timeToImplementDays" INTEGER,
    "resourceAvailability" INTEGER,
    "innovationLevel" INTEGER,
    "scalabilityScore" INTEGER,
    "feasibilityScore" DOUBLE PRECISION,
    "impactScore" DOUBLE PRECISION,
    "ecoScore" DOUBLE PRECISION,
    "estimatedWasteReductionKgMonth" DOUBLE PRECISION,
    "estimatedCo2ReductionKgMonth" DOUBLE PRECISION,
    "estimatedCostSavingsMonth" DOUBLE PRECISION,
    "estimatedWaterSavedLitersMonth" DOUBLE PRECISION,
    "estimatedEnergySavedKwhMonth" DOUBLE PRECISION,
    "totalViews" INTEGER NOT NULL DEFAULT 0,
    "uniqueViews" INTEGER NOT NULL DEFAULT 0,
    "totalUpvotes" INTEGER NOT NULL DEFAULT 0,
    "totalDownvotes" INTEGER NOT NULL DEFAULT 0,
    "totalComments" INTEGER NOT NULL DEFAULT 0,
    "totalBookmarks" INTEGER NOT NULL DEFAULT 0,
    "averageRating" DOUBLE PRECISION,
    "trendingScore" DOUBLE PRECISION,
    "submittedAt" TIMESTAMP(3),
    "reviewedAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "lastActivityAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Idea_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IdeaTag" (
    "id" TEXT NOT NULL,
    "ideaId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IdeaTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IdeaAttachment" (
    "id" TEXT NOT NULL,
    "ideaId" TEXT NOT NULL,
    "title" TEXT,
    "fileUrl" TEXT NOT NULL,
    "fileType" "AttachmentType" NOT NULL,
    "fileName" TEXT,
    "fileSizeBytes" INTEGER,
    "mimeType" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IdeaAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IdeaMedia" (
    "id" TEXT NOT NULL,
    "ideaId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "type" "MediaType" NOT NULL,
    "altText" TEXT,
    "caption" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IdeaMedia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vote" (
    "id" TEXT NOT NULL,
    "ideaId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "VoteType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Vote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Comment" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "isEdited" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "ideaId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "parentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Comment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IdeaBookmark" (
    "id" TEXT NOT NULL,
    "ideaId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IdeaBookmark_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IdeaStatusLog" (
    "id" TEXT NOT NULL,
    "ideaId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "fromStatus" "IdeaStatus",
    "toStatus" "IdeaStatus" NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IdeaStatusLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IdeaReviewFeedback" (
    "id" TEXT NOT NULL,
    "ideaId" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "feedbackType" "FeedbackType" NOT NULL DEFAULT 'REJECTION',
    "title" TEXT,
    "message" TEXT NOT NULL,
    "isVisibleToAuthor" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IdeaReviewFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommentReport" (
    "id" TEXT NOT NULL,
    "commentId" TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "reason" "ReportReason" NOT NULL,
    "note" TEXT,
    "status" "ModerationStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommentReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IdeaReport" (
    "id" TEXT NOT NULL,
    "ideaId" TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "reason" "ReportReason" NOT NULL,
    "note" TEXT,
    "status" "ModerationStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IdeaReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModerationAction" (
    "id" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "ideaId" TEXT,
    "commentId" TEXT,
    "actionType" "ModerationActionType" NOT NULL,
    "note" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ModerationAction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Campaign_slug_key" ON "Campaign"("slug");

-- CreateIndex
CREATE INDEX "Campaign_slug_idx" ON "Campaign"("slug");

-- CreateIndex
CREATE INDEX "Campaign_isActive_startDate_endDate_idx" ON "Campaign"("isActive", "startDate", "endDate");

-- CreateIndex
CREATE UNIQUE INDEX "Category_name_key" ON "Category"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Category_slug_key" ON "Category"("slug");

-- CreateIndex
CREATE INDEX "Category_slug_idx" ON "Category"("slug");

-- CreateIndex
CREATE INDEX "Category_isActive_sortOrder_idx" ON "Category"("isActive", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "Tag_name_key" ON "Tag"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Tag_slug_key" ON "Tag"("slug");

-- CreateIndex
CREATE INDEX "Tag_slug_idx" ON "Tag"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "IdeaPurchase_providerPaymentId_key" ON "IdeaPurchase"("providerPaymentId");

-- CreateIndex
CREATE INDEX "IdeaPurchase_userId_status_idx" ON "IdeaPurchase"("userId", "status");

-- CreateIndex
CREATE INDEX "IdeaPurchase_ideaId_idx" ON "IdeaPurchase"("ideaId");

-- CreateIndex
CREATE INDEX "IdeaPurchase_ideaId_userId_idx" ON "IdeaPurchase"("ideaId", "userId");

-- CreateIndex
CREATE INDEX "IdeaPurchase_paidAt_idx" ON "IdeaPurchase"("paidAt");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentTransaction_transactionId_key" ON "PaymentTransaction"("transactionId");

-- CreateIndex
CREATE INDEX "PaymentTransaction_purchaseId_idx" ON "PaymentTransaction"("purchaseId");

-- CreateIndex
CREATE INDEX "PaymentTransaction_userId_status_idx" ON "PaymentTransaction"("userId", "status");

-- CreateIndex
CREATE INDEX "PaymentTransaction_transactionId_idx" ON "PaymentTransaction"("transactionId");

-- CreateIndex
CREATE INDEX "ExperienceReport_ideaId_status_idx" ON "ExperienceReport"("ideaId", "status");

-- CreateIndex
CREATE INDEX "ExperienceReport_authorId_idx" ON "ExperienceReport"("authorId");

-- CreateIndex
CREATE INDEX "ExperienceReport_isFeatured_idx" ON "ExperienceReport"("isFeatured");

-- CreateIndex
CREATE INDEX "Notification_userId_isRead_createdAt_idx" ON "Notification"("userId", "isRead", "createdAt");

-- CreateIndex
CREATE INDEX "NewsletterSubscription_isActive_idx" ON "NewsletterSubscription"("isActive");

-- CreateIndex
CREATE INDEX "NewsletterSubscription_userId_idx" ON "NewsletterSubscription"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "NewsletterSubscription_email_key" ON "NewsletterSubscription"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Idea_slug_key" ON "Idea"("slug");

-- CreateIndex
CREATE INDEX "Idea_slug_idx" ON "Idea"("slug");

-- CreateIndex
CREATE INDEX "Idea_status_isFeatured_idx" ON "Idea"("status", "isFeatured");

-- CreateIndex
CREATE INDEX "Idea_authorId_status_idx" ON "Idea"("authorId", "status");

-- CreateIndex
CREATE INDEX "Idea_categoryId_status_idx" ON "Idea"("categoryId", "status");

-- CreateIndex
CREATE INDEX "Idea_campaignId_idx" ON "Idea"("campaignId");

-- CreateIndex
CREATE INDEX "Idea_accessType_idx" ON "Idea"("accessType");

-- CreateIndex
CREATE INDEX "Idea_ecoScore_idx" ON "Idea"("ecoScore");

-- CreateIndex
CREATE INDEX "Idea_publishedAt_idx" ON "Idea"("publishedAt");

-- CreateIndex
CREATE INDEX "Idea_trendingScore_idx" ON "Idea"("trendingScore");

-- CreateIndex
CREATE INDEX "Idea_submittedAt_idx" ON "Idea"("submittedAt");

-- CreateIndex
CREATE INDEX "Idea_lastActivityAt_idx" ON "Idea"("lastActivityAt");

-- CreateIndex
CREATE INDEX "Idea_deletedAt_idx" ON "Idea"("deletedAt");

-- CreateIndex
CREATE INDEX "IdeaTag_tagId_idx" ON "IdeaTag"("tagId");

-- CreateIndex
CREATE UNIQUE INDEX "IdeaTag_ideaId_tagId_key" ON "IdeaTag"("ideaId", "tagId");

-- CreateIndex
CREATE INDEX "IdeaAttachment_ideaId_fileType_idx" ON "IdeaAttachment"("ideaId", "fileType");

-- CreateIndex
CREATE INDEX "IdeaMedia_ideaId_type_idx" ON "IdeaMedia"("ideaId", "type");

-- CreateIndex
CREATE INDEX "IdeaMedia_ideaId_sortOrder_idx" ON "IdeaMedia"("ideaId", "sortOrder");

-- CreateIndex
CREATE INDEX "Vote_ideaId_type_idx" ON "Vote"("ideaId", "type");

-- CreateIndex
CREATE INDEX "Vote_userId_idx" ON "Vote"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Vote_ideaId_userId_key" ON "Vote"("ideaId", "userId");

-- CreateIndex
CREATE INDEX "Comment_ideaId_createdAt_idx" ON "Comment"("ideaId", "createdAt");

-- CreateIndex
CREATE INDEX "Comment_authorId_idx" ON "Comment"("authorId");

-- CreateIndex
CREATE INDEX "Comment_parentId_idx" ON "Comment"("parentId");

-- CreateIndex
CREATE INDEX "Comment_isDeleted_idx" ON "Comment"("isDeleted");

-- CreateIndex
CREATE INDEX "IdeaBookmark_userId_idx" ON "IdeaBookmark"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "IdeaBookmark_ideaId_userId_key" ON "IdeaBookmark"("ideaId", "userId");

-- CreateIndex
CREATE INDEX "IdeaStatusLog_ideaId_createdAt_idx" ON "IdeaStatusLog"("ideaId", "createdAt");

-- CreateIndex
CREATE INDEX "IdeaStatusLog_actorId_idx" ON "IdeaStatusLog"("actorId");

-- CreateIndex
CREATE INDEX "IdeaReviewFeedback_ideaId_feedbackType_idx" ON "IdeaReviewFeedback"("ideaId", "feedbackType");

-- CreateIndex
CREATE INDEX "IdeaReviewFeedback_reviewerId_idx" ON "IdeaReviewFeedback"("reviewerId");

-- CreateIndex
CREATE INDEX "CommentReport_commentId_status_idx" ON "CommentReport"("commentId", "status");

-- CreateIndex
CREATE INDEX "CommentReport_reporterId_idx" ON "CommentReport"("reporterId");

-- CreateIndex
CREATE UNIQUE INDEX "CommentReport_commentId_reporterId_key" ON "CommentReport"("commentId", "reporterId");

-- CreateIndex
CREATE INDEX "IdeaReport_ideaId_status_idx" ON "IdeaReport"("ideaId", "status");

-- CreateIndex
CREATE INDEX "IdeaReport_reporterId_idx" ON "IdeaReport"("reporterId");

-- CreateIndex
CREATE UNIQUE INDEX "IdeaReport_ideaId_reporterId_key" ON "IdeaReport"("ideaId", "reporterId");

-- CreateIndex
CREATE INDEX "ModerationAction_actorId_actionType_idx" ON "ModerationAction"("actorId", "actionType");

-- CreateIndex
CREATE INDEX "ModerationAction_ideaId_idx" ON "ModerationAction"("ideaId");

-- CreateIndex
CREATE INDEX "ModerationAction_commentId_idx" ON "ModerationAction"("commentId");

-- CreateIndex
CREATE INDEX "admin_isDeleted_idx" ON "admin"("isDeleted");

-- CreateIndex
CREATE INDEX "idx_scientist_is_deleted" ON "scientists"("isDeleted");

-- CreateIndex
CREATE INDEX "idx_scientist_verified_by_id" ON "scientists"("verifiedById");

-- AddForeignKey
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IdeaPurchase" ADD CONSTRAINT "IdeaPurchase_ideaId_fkey" FOREIGN KEY ("ideaId") REFERENCES "Idea"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IdeaPurchase" ADD CONSTRAINT "IdeaPurchase_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentTransaction" ADD CONSTRAINT "PaymentTransaction_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "IdeaPurchase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentTransaction" ADD CONSTRAINT "PaymentTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExperienceReport" ADD CONSTRAINT "ExperienceReport_ideaId_fkey" FOREIGN KEY ("ideaId") REFERENCES "Idea"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExperienceReport" ADD CONSTRAINT "ExperienceReport_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NewsletterSubscription" ADD CONSTRAINT "NewsletterSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Idea" ADD CONSTRAINT "Idea_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Idea" ADD CONSTRAINT "Idea_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Idea" ADD CONSTRAINT "Idea_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IdeaTag" ADD CONSTRAINT "IdeaTag_ideaId_fkey" FOREIGN KEY ("ideaId") REFERENCES "Idea"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IdeaTag" ADD CONSTRAINT "IdeaTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IdeaAttachment" ADD CONSTRAINT "IdeaAttachment_ideaId_fkey" FOREIGN KEY ("ideaId") REFERENCES "Idea"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IdeaMedia" ADD CONSTRAINT "IdeaMedia_ideaId_fkey" FOREIGN KEY ("ideaId") REFERENCES "Idea"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vote" ADD CONSTRAINT "Vote_ideaId_fkey" FOREIGN KEY ("ideaId") REFERENCES "Idea"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vote" ADD CONSTRAINT "Vote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_ideaId_fkey" FOREIGN KEY ("ideaId") REFERENCES "Idea"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Comment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IdeaBookmark" ADD CONSTRAINT "IdeaBookmark_ideaId_fkey" FOREIGN KEY ("ideaId") REFERENCES "Idea"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IdeaBookmark" ADD CONSTRAINT "IdeaBookmark_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IdeaStatusLog" ADD CONSTRAINT "IdeaStatusLog_ideaId_fkey" FOREIGN KEY ("ideaId") REFERENCES "Idea"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IdeaStatusLog" ADD CONSTRAINT "IdeaStatusLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IdeaReviewFeedback" ADD CONSTRAINT "IdeaReviewFeedback_ideaId_fkey" FOREIGN KEY ("ideaId") REFERENCES "Idea"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IdeaReviewFeedback" ADD CONSTRAINT "IdeaReviewFeedback_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommentReport" ADD CONSTRAINT "CommentReport_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "Comment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommentReport" ADD CONSTRAINT "CommentReport_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IdeaReport" ADD CONSTRAINT "IdeaReport_ideaId_fkey" FOREIGN KEY ("ideaId") REFERENCES "Idea"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IdeaReport" ADD CONSTRAINT "IdeaReport_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModerationAction" ADD CONSTRAINT "ModerationAction_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModerationAction" ADD CONSTRAINT "ModerationAction_ideaId_fkey" FOREIGN KEY ("ideaId") REFERENCES "Idea"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModerationAction" ADD CONSTRAINT "ModerationAction_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "Comment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scientists" ADD CONSTRAINT "scientists_verifiedById_fkey" FOREIGN KEY ("verifiedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
