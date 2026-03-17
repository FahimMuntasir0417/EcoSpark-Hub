import express from "express";
import { validateRequest } from "../../middlewares/validateRequest";
import { ModerationController } from "./moderation.controller";
import {
  moderationCommentActionSchema,
  reportCommentSchema,
  reportIdeaSchema,
  reviewFeedbackSchema,
  reviewIdeaSchema,
  reviewReportSchema,
} from "./moderation.validation";

const router = express.Router();

router.post(
  "/ideas/:ideaId/reports",
  validateRequest(reportIdeaSchema),
  ModerationController.reportIdea,
);

router.post(
  "/comments/:commentId/reports",
  validateRequest(reportCommentSchema),
  ModerationController.reportComment,
);

router.get("/reports/ideas", ModerationController.getIdeaReports);
router.get("/reports/ideas/:id", ModerationController.getSingleIdeaReport);

router.patch(
  "/reports/ideas/:id/review",
  validateRequest(reviewReportSchema),
  ModerationController.reviewIdeaReport,
);

router.get("/reports/comments", ModerationController.getCommentReports);
router.get(
  "/reports/comments/:id",
  ModerationController.getSingleCommentReport,
);

router.patch(
  "/reports/comments/:id/review",
  validateRequest(reviewReportSchema),
  ModerationController.reviewCommentReport,
);

router.post(
  "/ideas/:ideaId/review-feedback",
  validateRequest(reviewFeedbackSchema),
  ModerationController.createIdeaReviewFeedback,
);

router.get(
  "/ideas/:ideaId/review-feedback",
  ModerationController.getIdeaReviewFeedbacks,
);
router.get(
  "/review-feedback/:id",
  ModerationController.getSingleReviewFeedback,
);

router.post(
  "/ideas/:ideaId/review",
  validateRequest(reviewIdeaSchema),
  ModerationController.reviewIdea,
);

router.post(
  "/comments/:commentId/delete",
  validateRequest(moderationCommentActionSchema),
  ModerationController.deleteCommentByModerator,
);

router.post(
  "/comments/:commentId/restore",
  validateRequest(moderationCommentActionSchema),
  ModerationController.restoreCommentByModerator,
);

router.get("/actions", ModerationController.getModerationActions);
router.get("/actions/:id", ModerationController.getSingleModerationAction);

export const ModerationRoutes = router;
