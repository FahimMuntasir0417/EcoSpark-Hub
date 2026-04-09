import express from "express";
import { checkAuth } from "../../middlewares/checkAuth";
import { validateRequest } from "../../middlewares/validateRequest";
import { ScientistController } from "./scientist.controller";
import {
  assignScientistSpecialtiesSchema,
  createScientistSchema,
  updateScientistSchema,
  verifyScientistSchema,
} from "./scientist.validation";

const router = express.Router();
router.use(checkAuth());

router.post(
  "/",
  validateRequest(createScientistSchema),
  ScientistController.createScientist,
);

router.get("/", ScientistController.getAllScientists);
router.get("/user/:userId", ScientistController.getScientistByUserId);
router.get("/:id", ScientistController.getSingleScientist);

router.patch(
  "/:id",
  validateRequest(updateScientistSchema),
  ScientistController.updateScientist,
);

router.patch(
  "/:id/specialties",
  validateRequest(assignScientistSpecialtiesSchema),
  ScientistController.assignScientistSpecialties,
);

router.delete(
  "/:id/specialties/:specialtyId",
  ScientistController.removeScientistSpecialty,
);

router.patch(
  "/:id/verify",
  validateRequest(verifyScientistSchema),
  ScientistController.verifyScientist,
);

router.delete("/:id", ScientistController.deleteScientist);

export const ScientistRoutes = router;
