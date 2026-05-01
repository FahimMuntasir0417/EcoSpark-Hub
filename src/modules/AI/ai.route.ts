import express from "express";
import { Role } from "../../generated/prisma/client";
import { checkAuth } from "../../middlewares/checkAuth";
import { validateRequest } from "../../middlewares/validateRequest";
import { AiController } from "./ai.controller";
import { chatSchema, ideaFormSuggestionSchema } from "./ai.validation";

const router = express.Router();

router.use(checkAuth());

router.get("/search-suggestions", AiController.getSearchSuggestions);
router.get("/recommendations", AiController.getRecommendations);
router.get("/trending-ideas", AiController.getTrendingIdeas);
router.get("/personalized-banner", AiController.getPersonalizedBanner);
router.get("/dashboard-insights", AiController.getDashboardInsights);
router.get("/next-actions", AiController.getNextActions);
router.get(
  "/anomaly-alerts",
  checkAuth(Role.ADMIN, Role.SUPER_ADMIN),
  AiController.getAnomalyAlerts,
);

router.post("/chat", validateRequest(chatSchema), AiController.chat);
router.post(
  "/idea-form-suggestions",
  validateRequest(ideaFormSuggestionSchema),
  AiController.getIdeaFormSuggestions,
);

export const AiRoutes = router;
