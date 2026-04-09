import express from "express";

import { multerUpload } from "../../config/multer.config";
import { Role } from "../../generated/prisma/client";
import { checkAuth } from "../../middlewares/checkAuth";
import { validateRequest } from "../../middlewares/validateRequest";
import { AuthController } from "../Auth/auth.controller";
import { updateMyProfileSchema } from "../Auth/auth.validation";

const router = express.Router();
router.use(checkAuth());

router.get("/me", AuthController.getMyProfile);
router.patch(
  "/me",
  multerUpload.single("image"),
  validateRequest(updateMyProfileSchema),
  AuthController.updateMyProfile,
);

router.get(
  "/",
  checkAuth(Role.ADMIN, Role.SUPER_ADMIN),
  AuthController.getAllUsers,
);

export const UserRoutes = router;
