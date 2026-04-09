import express from "express";
import { multerUpload } from "../../config/multer.config";
import { checkAuth } from "../../middlewares/checkAuth";
import { validateRequest } from "../../middlewares/validateRequest";
import { IdeaController } from "./idea.controller";
import {
  createIdeaAttachmentSchema,
  createIdeaMediaSchema,
  createIdeaSchema,
  rejectIdeaSchema,
  updateIdeaSchema,
  updateIdeaTagsSchema,
} from "./idea.validation";

const router = express.Router();
router.use(checkAuth());

router.post(
  "/",
  validateRequest(createIdeaSchema),
  IdeaController.createIdea,
);

router.get("/", IdeaController.getAllIdeas);
router.get("/slug/:slug", IdeaController.getIdeaBySlug);
router.get("/:id", IdeaController.getSingleIdea);

router.patch(
  "/:id",
  validateRequest(updateIdeaSchema),
  IdeaController.updateIdea,
);
router.delete("/:id", IdeaController.deleteIdea);

router.patch("/:id/submit", IdeaController.submitIdea);
router.patch("/:id/approve", IdeaController.approveIdea);
router.patch(
  "/:id/reject",
  validateRequest(rejectIdeaSchema),
  IdeaController.rejectIdea,
);
router.patch("/:id/archive", IdeaController.archiveIdea);
router.patch("/:id/publish", IdeaController.publishIdea);
router.patch("/:id/feature", IdeaController.featureIdea);
router.patch("/:id/highlight", IdeaController.highlightIdea);

router.patch(
  "/:id/tags",
  validateRequest(updateIdeaTagsSchema),
  IdeaController.updateIdeaTags,
);

router.post(
  "/:id/attachments",
  multerUpload.single("file"),
  validateRequest(createIdeaAttachmentSchema),
  IdeaController.addIdeaAttachment,
);

router.delete(
  "/:id/attachments/:attachmentId",
  IdeaController.deleteIdeaAttachment,
);

router.post(
  "/:id/media",
  multerUpload.single("file"),
  validateRequest(createIdeaMediaSchema),
  IdeaController.addIdeaMedia,
);

router.delete(
  "/:id/media/:mediaId",
  IdeaController.deleteIdeaMedia,
);

export const IdeaRoutes = router;
