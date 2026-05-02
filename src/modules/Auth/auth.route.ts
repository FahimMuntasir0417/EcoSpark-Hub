import express from "express";
import { Role } from "../../generated/prisma/client";
import { multerUpload } from "../../config/multer.config";
import { checkAuth } from "../../middlewares/checkAuth";
import { validateRequest } from "../../middlewares/validateRequest";
import { AuthController } from "./auth.controller";
import {
  forgetPasswordSchema,
  resetPasswordSchema,
  verifyEmailSchema,
} from "./auth.validation";

const router = express.Router();

router.post(
  "/register",

  AuthController.registerMember,
);

router.post("/login", AuthController.loginUser);
router.get("/users/me", checkAuth(), AuthController.getMyProfile);
router.patch(
  "/users/me",
  checkAuth(),
  multerUpload.single("image"),
  // validateRequest(updateMyProfileSchema),
  AuthController.updateMyProfile,
);
router.get(
  "/users",
  checkAuth(Role.ADMIN, Role.SUPER_ADMIN),
  AuthController.getAllUsers,
);
router.post("/refresh-token", AuthController.getNewToken);
router.post("/change-password", AuthController.changePassword);
router.post("/logout", AuthController.logoutUser);
router.post(
  "/verify-email",
  validateRequest(verifyEmailSchema),
  AuthController.verifyEmail,
);
router.post(
  "/forget-password",
  validateRequest(forgetPasswordSchema),
  AuthController.forgetPassword,
);
router.post(
  "/reset-password",
  validateRequest(resetPasswordSchema),
  AuthController.resetPassword,
);

router.get("/google", AuthController.googleLogin);
router.get("/login/google", AuthController.googleLogin);
router.get("/google/callback", AuthController.googleOAuthCallback);
router.get("/google/success", AuthController.googleLoginSuccess);
router.get("/oauth/error", AuthController.handleOAuthError);

export const AuthRoutes = router;
