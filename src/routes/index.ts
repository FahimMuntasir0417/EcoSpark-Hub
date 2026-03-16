import { Router } from "express";

import { AuthRoutes } from "../modules/Auth/auth.route";

const router = Router();
router.use("/auth", AuthRoutes);

export const IndexRoutes = router;
