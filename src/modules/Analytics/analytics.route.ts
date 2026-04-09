import express from "express";
// import { Role } from "../../generated/prisma/client";
import { checkAuth } from "../../middlewares/checkAuth";
import { AnalyticsController } from "./analytics.controller";

const router = express.Router();

router.get("/member", checkAuth(), AnalyticsController.getMemberAnalytics);

router.get(
  "/scientist",
  checkAuth(),
  AnalyticsController.getScientistAnalytics,
);

router.get("/admin", checkAuth(), AnalyticsController.getAdminAnalytics);

export const AnalyticsRoutes = router;
