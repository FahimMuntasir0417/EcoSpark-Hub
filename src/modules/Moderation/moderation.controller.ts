import { Request, Response } from "express";
import status from "http-status";
import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponse";
import { ModerationService } from "./moderation.service";

const reportIdea = catchAsync(async (req: Request, res: Response) => {
  const reporterId = (req as Request & { user?: { userId: string } }).user
    ?.userId as string;
  const result = await ModerationService.reportIdea(
    req.params.ideaId,
    reporterId,
    req.body,
  );

  sendResponse(res, {
    httpStatusCode: status.CREATED,
    success: true,
    message: "Idea reported successfully",
    data: result,
  });
});

const reportComment = catchAsync(async (req: Request, res: Response) => {
  const reporterId = (req as Request & { user?: { userId: string } }).user
    ?.userId as string;
  const result = await ModerationService.reportComment(
    req.params.commentId,
    reporterId,
    req.body,
  );

  sendResponse(res, {
    httpStatusCode: status.CREATED,
    success: true,
    message: "Comment reported successfully",
    data: result,
  });
});

const getIdeaReports = catchAsync(async (req: Request, res: Response) => {
  const result = await ModerationService.getIdeaReports(
    req.query as Record<string, unknown>,
  );

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Idea reports retrieved successfully",
    meta: result.meta,
    data: result.data,
  });
});

const getSingleIdeaReport = catchAsync(async (req: Request, res: Response) => {
  const result = await ModerationService.getSingleIdeaReport(req.params.id);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Idea report retrieved successfully",
    data: result,
  });
});

const reviewIdeaReport = catchAsync(async (req: Request, res: Response) => {
  const actorId = (req as Request & { user?: { userId: string } }).user
    ?.userId as string;
  const result = await ModerationService.reviewIdeaReport(
    req.params.id,
    actorId,
    req.body,
  );

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Idea report reviewed successfully",
    data: result,
  });
});

const getCommentReports = catchAsync(async (req: Request, res: Response) => {
  const result = await ModerationService.getCommentReports(
    req.query as Record<string, unknown>,
  );

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Comment reports retrieved successfully",
    meta: result.meta,
    data: result.data,
  });
});

const getSingleCommentReport = catchAsync(
  async (req: Request, res: Response) => {
    const result = await ModerationService.getSingleCommentReport(
      req.params.id,
    );

    sendResponse(res, {
      httpStatusCode: status.OK,
      success: true,
      message: "Comment report retrieved successfully",
      data: result,
    });
  },
);

const reviewCommentReport = catchAsync(async (req: Request, res: Response) => {
  const actorId = (req as Request & { user?: { userId: string } }).user
    ?.userId as string;
  const result = await ModerationService.reviewCommentReport(
    req.params.id,
    actorId,
    req.body,
  );

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Comment report reviewed successfully",
    data: result,
  });
});

const createIdeaReviewFeedback = catchAsync(
  async (req: Request, res: Response) => {
    const reviewerId = (req as Request & { user?: { userId: string } }).user
      ?.userId as string;
    const result = await ModerationService.createIdeaReviewFeedback(
      req.params.ideaId,
      reviewerId,
      req.body,
    );

    sendResponse(res, {
      httpStatusCode: status.CREATED,
      success: true,
      message: "Review feedback created successfully",
      data: result,
    });
  },
);

const getIdeaReviewFeedbacks = catchAsync(
  async (req: Request, res: Response) => {
    const result = await ModerationService.getIdeaReviewFeedbacks(
      req.params.ideaId,
      req.query as Record<string, unknown>,
    );

    sendResponse(res, {
      httpStatusCode: status.OK,
      success: true,
      message: "Review feedbacks retrieved successfully",
      meta: result.meta,
      data: result.data,
    });
  },
);

const getSingleReviewFeedback = catchAsync(
  async (req: Request, res: Response) => {
    const result = await ModerationService.getSingleReviewFeedback(
      req.params.id,
    );

    sendResponse(res, {
      httpStatusCode: status.OK,
      success: true,
      message: "Review feedback retrieved successfully",
      data: result,
    });
  },
);

const reviewIdea = catchAsync(async (req: Request, res: Response) => {
  const actorId = (req as Request & { user?: { userId: string } }).user
    ?.userId as string;
  const result = await ModerationService.reviewIdea(
    req.params.ideaId,
    actorId,
    req.body,
  );

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Idea reviewed successfully",
    data: result,
  });
});

const deleteCommentByModerator = catchAsync(
  async (req: Request, res: Response) => {
    const actorId = (req as Request & { user?: { userId: string } }).user
      ?.userId as string;
    const result = await ModerationService.deleteCommentByModerator(
      req.params.commentId,
      actorId,
      req.body,
    );

    sendResponse(res, {
      httpStatusCode: status.OK,
      success: true,
      message: "Comment deleted successfully",
      data: result,
    });
  },
);

const restoreCommentByModerator = catchAsync(
  async (req: Request, res: Response) => {
    const actorId = (req as Request & { user?: { userId: string } }).user
      ?.userId as string;
    const result = await ModerationService.restoreCommentByModerator(
      req.params.commentId,
      actorId,
      req.body,
    );

    sendResponse(res, {
      httpStatusCode: status.OK,
      success: true,
      message: "Comment restored successfully",
      data: result,
    });
  },
);

const getModerationActions = catchAsync(
  async (req: Request, res: Response) => {
    const result = await ModerationService.getModerationActions(
      req.query as Record<string, unknown>,
    );

    sendResponse(res, {
      httpStatusCode: status.OK,
      success: true,
      message: "Moderation actions retrieved successfully",
      meta: result.meta,
      data: result.data,
    });
  },
);

const getSingleModerationAction = catchAsync(
  async (req: Request, res: Response) => {
    const result = await ModerationService.getSingleModerationAction(
      req.params.id,
    );

    sendResponse(res, {
      httpStatusCode: status.OK,
      success: true,
      message: "Moderation action retrieved successfully",
      data: result,
    });
  },
);

export const ModerationController = {
  reportIdea,
  reportComment,
  getIdeaReports,
  getSingleIdeaReport,
  reviewIdeaReport,
  getCommentReports,
  getSingleCommentReport,
  reviewCommentReport,
  createIdeaReviewFeedback,
  getIdeaReviewFeedbacks,
  getSingleReviewFeedback,
  reviewIdea,
  deleteCommentByModerator,
  restoreCommentByModerator,
  getModerationActions,
  getSingleModerationAction,
};
