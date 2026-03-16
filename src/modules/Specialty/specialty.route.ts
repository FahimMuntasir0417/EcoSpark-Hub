import express from "express";
import { SpecialtyController } from "./specialty.controller";
import { validateRequest } from "../../middlewares/validateRequest";
import {
  createSpecialtySchema,
  updateSpecialtySchema,
} from "./specialty.validation";

const router = express.Router();

router.post(
  "/",
  validateRequest(createSpecialtySchema),
  SpecialtyController.createSpecialty,
);

router.get("/", SpecialtyController.getAllSpecialties);
router.get("/:id", SpecialtyController.getSingleSpecialty);

router.patch(
  "/:id",
  validateRequest(updateSpecialtySchema),
  SpecialtyController.updateSpecialty,
);

router.delete("/:id", SpecialtyController.deleteSpecialty);

export const SpecialtyRoutes = router;
