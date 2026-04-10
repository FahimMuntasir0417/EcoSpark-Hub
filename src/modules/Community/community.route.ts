import express from "express";
import { multerUpload } from "../../config/multer.config";
import { checkAuth } from "../../middlewares/checkAuth";
import { validateRequest } from "../../middlewares/validateRequest";
import { CommunityController } from "./community.controller";
import {
  createExperienceReportUploadSchema,
  subscribeNewsletterSchema,
  unsubscribeNewsletterSchema,
  updateExperienceReportSchema,
} from "./community.validation";

const router = express.Router();
router.use(checkAuth());

router.post(
  "/experience-reports",
  multerUpload.fields([
    { name: "beforeImage", maxCount: 1 },
    { name: "afterImage", maxCount: 1 },
  ]),
  validateRequest(createExperienceReportUploadSchema),
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
