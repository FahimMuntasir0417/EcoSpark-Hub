import { Router } from "express";

import { AuthRoutes } from "../modules/Auth/auth.route";
import { SpecialtyRoutes } from "../modules/Specialty/specialty.route";
import { ScientistRoutes } from "../modules/Scientist/scientist.route";

const router = Router();
router.use("/auth", AuthRoutes);
router.use("/specialties", SpecialtyRoutes);
router.use("/scientists", ScientistRoutes);

export const IndexRoutes = router;
