import { z } from "zod";

const reportReasonEnum = z.enum([
  "SPAM",
  "ABUSE",
  "MISINFORMATION",
  "INAPPROPRIATE",
  "COPYRIGHT",
  "OTHER",
]);

const moderationStatusEnum = z.enum(["APPROVED", "REJECTED"]);
const feedbackTypeEnum = z.enum(["REVIEW", "REJECTION", "IMPROVEMENT"]);
const ideaReviewActionEnum = z.enum(["APPROVED", "REJECTED", "ARCHIVED"]);

export const reportIdeaSchema = z
  .object({
    reason: reportReasonEnum,
    note: z.string().trim().optional(),
  })
  .strict();

export const reportCommentSchema = z
  .object({
    reason: reportReasonEnum,
    note: z.string().trim().optional(),
  })
  .strict();

export const reviewReportSchema = z
  .object({
    status: moderationStatusEnum,
    note: z.string().trim().optional(),
  })
  .strict();

export const reviewFeedbackSchema = z
  .object({
    feedbackType: feedbackTypeEnum.optional(),
    title: z.string().trim().optional(),
    message: z.string().trim().min(1, "Message is required"),
    isVisibleToAuthor: z.boolean().optional(),
  })
  .strict();

export const reviewIdeaSchema = z
  .object({
    action: ideaReviewActionEnum,
    note: z.string().trim().optional(),
    rejectionFeedback: z.string().trim().optional(),
  })
  .strict()
  .refine((data) => !(data.action === "REJECTED" && !data.rejectionFeedback), {
    message: "rejectionFeedback is required when action is REJECTED",
    path: ["rejectionFeedback"],
  });

export const moderationCommentActionSchema = z
  .object({
    note: z.string().trim().optional(),
  })
  .strict();
