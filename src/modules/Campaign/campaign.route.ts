import express from "express";
import { multerUpload } from "../../config/multer.config";
import { checkAuth } from "../../middlewares/checkAuth";
import { validateRequest } from "../../middlewares/validateRequest";
import { CampaignController } from "./campaign.controller";
import {
  createCampaignUploadSchema,
  updateCampaignUploadSchema,
  updateCampaignStatusSchema,
} from "./campaign.validation";

const router = express.Router();
router.use(checkAuth());

router.post(
  "/",
  multerUpload.single("bannerImage"),
  validateRequest(createCampaignUploadSchema),
  CampaignController.createCampaign,
);

router.get("/", CampaignController.getAllCampaigns);
router.get("/slug/:slug", CampaignController.getCampaignBySlug);
router.get("/:id", CampaignController.getSingleCampaign);

router.patch(
  "/:id",
  multerUpload.single("bannerImage"),
  validateRequest(updateCampaignUploadSchema),
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
