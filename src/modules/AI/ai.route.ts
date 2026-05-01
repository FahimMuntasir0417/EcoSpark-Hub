import express from "express";
import { Role } from "../../generated/prisma/client";
import { checkAuth } from "../../middlewares/checkAuth";
import { optionalAuth } from "../../middlewares/optionalAuth";
import { validateRequest } from "../../middlewares/validateRequest";
import { AiController } from "./ai.controller";
import { chatSchema, ideaFormSuggestionSchema } from "./ai.validation";

const router = express.Router();

router.get("/search-suggestions", AiController.getSearchSuggestions);
router.get("/recommendations", checkAuth(), AiController.getRecommendations);
router.get("/trending-ideas", AiController.getTrendingIdeas);
router.get(
  "/personalized-banner",
  optionalAuth(),
  AiController.getPersonalizedBanner,
);
router.get("/dashboard-insights", optionalAuth(), AiController.getDashboardInsights);
router.get("/next-actions", optionalAuth(), AiController.getNextActions);
router.get(
  "/anomaly-alerts",
  checkAuth(Role.ADMIN, Role.SUPER_ADMIN),
  AiController.getAnomalyAlerts,
);

router.post("/chat", optionalAuth(), validateRequest(chatSchema), AiController.chat);
router.post(
  "/idea-form-suggestions",
  checkAuth(),
  validateRequest(ideaFormSuggestionSchema),
  AiController.getIdeaFormSuggestions,
);

export const AiRoutes = router;
