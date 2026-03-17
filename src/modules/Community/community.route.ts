import express from "express";
import { validateRequest } from "../../middlewares/validateRequest";
import { CommunityController } from "./community.controller";
import {
  createExperienceReportSchema,
  subscribeNewsletterSchema,
  unsubscribeNewsletterSchema,
  updateExperienceReportSchema,
} from "./community.validation";

const router = express.Router();

router.post(
  "/experience-reports",
  validateRequest(createExperienceReportSchema),
  CommunityController.createExperienceReport,
);

router.get("/experience-reports", CommunityController.getAllExperienceReports);
router.get(
  "/experience-reports/:id",
  CommunityController.getSingleExperienceReport,
);
router.get(
  "/ideas/:ideaId/experience-reports",
  CommunityController.getIdeaExperienceReports,
);

router.patch(
  "/experience-reports/:id",
  validateRequest(updateExperienceReportSchema),
  CommunityController.updateExperienceReport,
);

router.delete(
  "/experience-reports/:id",
  CommunityController.deleteExperienceReport,
);
router.patch(
  "/experience-reports/:id/approve",
  CommunityController.approveExperienceReport,
);
router.patch(
  "/experience-reports/:id/reject",
  CommunityController.rejectExperienceReport,
);
router.patch(
  "/experience-reports/:id/feature",
  CommunityController.featureExperienceReport,
);

router.get("/notifications", CommunityController.getMyNotifications);
router.get("/notifications/:id", CommunityController.getSingleNotification);
router.patch(
  "/notifications/:id/read",
  CommunityController.markNotificationRead,
);
router.patch(
  "/notifications/read-all",
  CommunityController.markAllNotificationsRead,
);
router.delete("/notifications/:id", CommunityController.deleteNotification);

router.post(
  "/newsletter/subscribe",
  validateRequest(subscribeNewsletterSchema),
  CommunityController.subscribeNewsletter,
);

router.post(
  "/newsletter/unsubscribe",
  validateRequest(unsubscribeNewsletterSchema),
  CommunityController.unsubscribeNewsletter,
);

router.get(
  "/newsletter/subscriptions",
  CommunityController.getNewsletterSubscriptions,
);

export const CommunityRoutes = router;
