import { Request, Response } from "express";
import status from "http-status";
import AppError from "../../errors/AppError";
import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponse";
import { UserService } from "./user.service";

const getAuthenticatedUserId = (req: Request) => {
  const userId = req.user?.userId;

  if (!userId) {
    throw new AppError(status.UNAUTHORIZED, "Unauthorized access! Please log in.");
  }

  return userId;
};

const getMyVotes = catchAsync(async (req: Request, res: Response) => {
  const userId = getAuthenticatedUserId(req);
  const result = await UserService.getMyVotes(
    userId,
    req.query as Record<string, unknown>,
  );

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "My votes retrieved successfully",
    meta: result.meta,
    data: result.data,
  });
});

const createMyVote = catchAsync(async (req: Request, res: Response) => {
  const userId = getAuthenticatedUserId(req);
  const result = await UserService.createMyVote(userId, req.body);

  sendResponse(res, {
    httpStatusCode: status.CREATED,
    success: true,
    message: "Vote created successfully",
    data: result,
  });
});

const updateMyVote = catchAsync(async (req: Request, res: Response) => {
  const userId = getAuthenticatedUserId(req);
  const result = await UserService.updateMyVote(
    req.params.id as string,
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

const deleteMyVote = catchAsync(async (req: Request, res: Response) => {
  const userId = getAuthenticatedUserId(req);
  const result = await UserService.deleteMyVote(req.params.id as string, userId);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Vote deleted successfully",
    data: result,
  });
});

const getMyComments = catchAsync(async (req: Request, res: Response) => {
  const userId = getAuthenticatedUserId(req);
  const result = await UserService.getMyComments(
    userId,
    req.query as Record<string, unknown>,
  );

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "My comments retrieved successfully",
    meta: result.meta,
    data: result.data,
  });
});

const createMyComment = catchAsync(async (req: Request, res: Response) => {
  const userId = getAuthenticatedUserId(req);
  const result = await UserService.createMyComment(userId, req.body);

  sendResponse(res, {
    httpStatusCode: status.CREATED,
    success: true,
    message: "Comment created successfully",
    data: result,
  });
});

const updateMyComment = catchAsync(async (req: Request, res: Response) => {
  const userId = getAuthenticatedUserId(req);
  const result = await UserService.updateMyComment(
    req.params.id as string,
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

const deleteMyComment = catchAsync(async (req: Request, res: Response) => {
  const userId = getAuthenticatedUserId(req);
  const result = await UserService.deleteMyComment(
    req.params.id as string,
    userId,
  );

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Comment deleted successfully",
    data: result,
  });
});

export const UserController = {
  getMyVotes,
  createMyVote,
  updateMyVote,
  deleteMyVote,
  getMyComments,
  createMyComment,
  updateMyComment,
  deleteMyComment,
};
