import express from "express";
import { validateRequest } from "../../middlewares/validateRequest";
import { ScientistController } from "./scientist.controller";
import {
  assignScientistSpecialtiesSchema,
  createScientistSchema,
  updateScientistSchema,
} from "./scientist.validation";

const router = express.Router();

// POST /api/v1/scientists

router.post(
  "/",
  validateRequest(createScientistSchema),
  ScientistController.createScientist,
);

router.get("/", ScientistController.getAllScientists);
router.get("/user/:userId", ScientistController.getScientistByUserId);
router.get("/:id", ScientistController.getSingleScientist);

// PATCH /api/v1/scientists/:id
router.patch(
  "/:id",
  validateRequest(updateScientistSchema),
  ScientistController.updateScientist,
);

// PATCH  /api/v1/scientists/:id/specialties
router.patch(
  "/:id/specialties",
  validateRequest(assignScientistSpecialtiesSchema),
  ScientistController.assignScientistSpecialties,
);

router.delete(
  "/:id/specialties/:specialtyId",
  ScientistController.removeScientistSpecialty,
);

router.delete("/:id", ScientistController.deleteScientist);

export const ScientistRoutes = router;

/*
POST   /api/v1/scientists
GET    /api/v1/scientists
GET    /api/v1/scientists/user/:userId
GET    /api/v1/scientists/:id
PATCH  /api/v1/scientists/:id
PATCH  /api/v1/scientists/:id/specialties
DELETE /api/v1/scientists/:id/specialties/:specialtyId
DELETE /api/v1/scientists/:id



*/
