import express from "express";

import { multerUpload } from "../../config/multer.config";
import { Role } from "../../generated/prisma/client";
import { checkAuth } from "../../middlewares/checkAuth";
import { validateRequest } from "../../middlewares/validateRequest";
import { AuthController } from "../Auth/auth.controller";
import { updateMyProfileSchema } from "../Auth/auth.validation";
import { UserController } from "./user.controller";
import {
  createMyCommentSchema,
  createMyVoteSchema,
  updateMyCommentSchema,
  updateMyVoteSchema,
} from "./user.validation";

const router = express.Router();
router.use(checkAuth());

router.get("/me", AuthController.getMyProfile);
router.patch(
  "/me",
  multerUpload.single("image"),
  validateRequest(updateMyProfileSchema),
  AuthController.updateMyProfile,
);
router.get("/me/votes", UserController.getMyVotes);
router.post(
  "/me/votes",
  validateRequest(createMyVoteSchema),
  UserController.createMyVote,
);
router.patch(
  "/me/votes/:id",
  validateRequest(updateMyVoteSchema),
  UserController.updateMyVote,
);
router.delete("/me/votes/:id", UserController.deleteMyVote);

router.get("/me/comments", UserController.getMyComments);
router.post(
  "/me/comments",
  validateRequest(createMyCommentSchema),
  UserController.createMyComment,
);
router.patch(
  "/me/comments/:id",
  validateRequest(updateMyCommentSchema),
  UserController.updateMyComment,
);
router.delete("/me/comments/:id", UserController.deleteMyComment);

router.get(
  "/",
  checkAuth(Role.ADMIN, Role.SUPER_ADMIN),
  AuthController.getAllUsers,
);

export const UserRoutes = router;
