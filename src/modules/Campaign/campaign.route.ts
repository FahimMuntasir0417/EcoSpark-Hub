import express from "express";
import { validateRequest } from "../../middlewares/validateRequest";
import { CampaignController } from "./campaign.controller";
import {
  createCampaignSchema,
  updateCampaignSchema,
  updateCampaignStatusSchema,
} from "./campaign.validation";

const router = express.Router();

router.post(
  "/",
  validateRequest(createCampaignSchema),
  CampaignController.createCampaign,
);

router.get("/", CampaignController.getAllCampaigns);
router.get("/slug/:slug", CampaignController.getCampaignBySlug);
router.get("/:id", CampaignController.getSingleCampaign);

router.patch(
  "/:id",
  validateRequest(updateCampaignSchema),
  CampaignController.updateCampaign,
);

router.patch(
  "/:id/status",
  validateRequest(updateCampaignStatusSchema),
  CampaignController.updateCampaignStatus,
);

router.delete("/:id", CampaignController.deleteCampaign);

router.get("/:id/ideas", CampaignController.getCampaignIdeas);

export const CampaignRoutes = router;
