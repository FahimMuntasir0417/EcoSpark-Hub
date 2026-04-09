import express from "express";
import { checkAuth } from "../../middlewares/checkAuth";
import { CategoryController } from "./category.controller";
import { validateRequest } from "../../middlewares/validateRequest";
import {
  createCategorySchema,
  updateCategorySchema,
} from "./category.validation";

const router = express.Router();
router.use(checkAuth());

router.post(
  "/",
  validateRequest(createCategorySchema),
  CategoryController.createCategory,
);

router.get("/", CategoryController.getAllCategories);
router.get("/slug/:slug", CategoryController.getCategoryBySlug);
router.get("/:id", CategoryController.getSingleCategory);

router.patch(
  "/:id",
  validateRequest(updateCategorySchema),
  CategoryController.updateCategory,
);

router.delete("/:id", CategoryController.deleteCategory);

export const CategoryRoutes = router;
