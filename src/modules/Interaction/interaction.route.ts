import express from "express";
import { checkAuth } from "../../middlewares/checkAuth";
import { validateRequest } from "../../middlewares/validateRequest";
import { InteractionController } from "./interaction.controller";
import {
  commentSchema,
  updateCommentSchema,
  voteSchema,
} from "./interaction.validation";

const router = express.Router();
router.use(checkAuth());

router.post(
  "/ideas/:ideaId/votes",
  validateRequest(voteSchema),
  InteractionController.voteIdea,
);

router.patch(
  "/ideas/:ideaId/votes",
  validateRequest(voteSchema),
  InteractionController.updateVote,
);

router.delete("/ideas/:ideaId/votes", InteractionController.removeVote);

router.post(
  "/ideas/:ideaId/comments",
  validateRequest(commentSchema),
  InteractionController.createComment,
);

router.get(
  "/ideas/:ideaId/comments",
  InteractionController.getIdeaComments,
);

router.patch(
  "/comments/:id",
  validateRequest(updateCommentSchema),
  InteractionController.updateComment,
);

router.delete("/comments/:id", InteractionController.deleteComment);

router.post(
  "/comments/:id/replies",
  validateRequest(commentSchema),
  InteractionController.replyToComment,
);

router.get(
  "/comments/:id/replies",
  InteractionController.getCommentReplies,
);

router.post("/ideas/:ideaId/bookmark", InteractionController.bookmarkIdea);
router.delete("/ideas/:ideaId/bookmark", InteractionController.removeBookmark);
router.get("/users/me/bookmarks", InteractionController.getMyBookmarks);

export const InteractionRoutes = router;
