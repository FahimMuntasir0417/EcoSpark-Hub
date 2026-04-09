import express from "express";
import { checkAuth } from "../../middlewares/checkAuth";
import { validateRequest } from "../../middlewares/validateRequest";
import { TagController } from "./tag.controller";
import { createTagSchema, updateTagSchema } from "./tag.validation";

const router = express.Router();
router.use(checkAuth());

router.post("/", validateRequest(createTagSchema), TagController.createTag);

router.get("/", TagController.getAllTags);
router.get("/slug/:slug", TagController.getTagBySlug);
router.get("/:id", TagController.getSingleTag);

router.patch("/:id", validateRequest(updateTagSchema), TagController.updateTag);

router.delete("/:id", TagController.deleteTag);

export const TagRoutes = router;
