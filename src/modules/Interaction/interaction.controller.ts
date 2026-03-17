import { Request, Response } from "express";
import status from "http-status";
import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponse";
import { InteractionService } from "./interaction.service";

const voteIdea = catchAsync(async (req: Request, res: Response) => {
  const userId = (req as Request & { user?: { userId: string } }).user
    ?.userId as string;
  const result = await InteractionService.voteIdea(
    req.params.ideaId,
    userId,
    req.body,
  );

  sendResponse(res, {
    httpStatusCode: status.CREATED,
    success: true,
    message: "Vote created successfully",
    data: result,
  });
});

const updateVote = catchAsync(async (req: Request, res: Response) => {
  const userId = (req as Request & { user?: { userId: string } }).user
    ?.userId as string;
  const result = await InteractionService.updateVote(
    req.params.ideaId,
    userId,
    req.body,
  );

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Vote updated successfully",
    data: result,
  });
});

const removeVote = catchAsync(async (req: Request, res: Response) => {
  const userId = (req as Request & { user?: { userId: string } }).user
    ?.userId as string;
  const result = await InteractionService.removeVote(req.params.ideaId, userId);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Vote removed successfully",
    data: result,
  });
});

const createComment = catchAsync(async (req: Request, res: Response) => {
  const userId = (req as Request & { user?: { userId: string } }).user
    ?.userId as string;
  const result = await InteractionService.createComment(
    req.params.ideaId,
    userId,
    req.body,
  );

  sendResponse(res, {
    httpStatusCode: status.CREATED,
    success: true,
    message: "Comment created successfully",
    data: result,
  });
});

const getIdeaComments = catchAsync(async (req: Request, res: Response) => {
  const result = await InteractionService.getIdeaComments(req.params.ideaId);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Comments retrieved successfully",
    data: result,
  });
});

const updateComment = catchAsync(async (req: Request, res: Response) => {
  const userId = (req as Request & { user?: { userId: string } }).user
    ?.userId as string;
  const result = await InteractionService.updateComment(
    req.params.id,
    userId,
    req.body,
  );

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Comment updated successfully",
    data: result,
  });
});

const deleteComment = catchAsync(async (req: Request, res: Response) => {
  const userId = (req as Request & { user?: { userId: string } }).user
    ?.userId as string;
  const result = await InteractionService.deleteComment(req.params.id, userId);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Comment deleted successfully",
    data: result,
  });
});

const replyToComment = catchAsync(async (req: Request, res: Response) => {
  const userId = (req as Request & { user?: { userId: string } }).user
    ?.userId as string;
  const result = await InteractionService.replyToComment(
    req.params.id,
    userId,
    req.body,
  );

  sendResponse(res, {
    httpStatusCode: status.CREATED,
    success: true,
    message: "Reply created successfully",
    data: result,
  });
});

const getCommentReplies = catchAsync(async (req: Request, res: Response) => {
  const result = await InteractionService.getCommentReplies(req.params.id);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Replies retrieved successfully",
    data: result,
  });
});

const bookmarkIdea = catchAsync(async (req: Request, res: Response) => {
  const userId = (req as Request & { user?: { userId: string } }).user
    ?.userId as string;
  const result = await InteractionService.bookmarkIdea(
    req.params.ideaId,
    userId,
  );

  sendResponse(res, {
    httpStatusCode: status.CREATED,
    success: true,
    message: "Idea bookmarked successfully",
    data: result,
  });
});

const removeBookmark = catchAsync(async (req: Request, res: Response) => {
  const userId = (req as Request & { user?: { userId: string } }).user
    ?.userId as string;
  const result = await InteractionService.removeBookmark(
    req.params.ideaId,
    userId,
  );

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Bookmark removed successfully",
    data: result,
  });
});

const getMyBookmarks = catchAsync(async (req: Request, res: Response) => {
  const userId = (req as Request & { user?: { userId: string } }).user
    ?.userId as string;
  const result = await InteractionService.getMyBookmarks(userId);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Bookmarks retrieved successfully",
    data: result,
  });
});

export const InteractionController = {
  voteIdea,
  updateVote,
  removeVote,
  createComment,
  getIdeaComments,
  updateComment,
  deleteComment,
  replyToComment,
  getCommentReplies,
  bookmarkIdea,
  removeBookmark,
  getMyBookmarks,
};
