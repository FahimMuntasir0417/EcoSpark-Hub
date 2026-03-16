import express from "express";
import { AuthController } from "./auth.controller";
import { validateRequest } from "../../middlewares/validateRequest";
import { registerPatientSchema } from "./auth.validation";

const router = express.Router();

router.post(
  "/register",
  validateRequest(registerPatientSchema),
  AuthController.registerPatient,
);
export const AuthRoutes = router;
