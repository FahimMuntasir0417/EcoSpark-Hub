import { Request, Response } from "express";
import status from "http-status";
import AppError from "../../errors/AppError";
import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponse";
import { ICreateExperienceReportPayload } from "./community.interface";
import { CommunityService } from "./community.service";
import { createExperienceReportSchema } from "./community.validation";

const getAuthenticatedUserId = (req: Request) => {
  const userId = req.user?.userId;

  if (!userId) {
    throw new AppError(
      status.UNAUTHORIZED,
      "Unauthorized access! No authenticated user found.",
    );
  }

  return userId;
};

const parseJsonField = <T>(
  value: unknown,
  fieldName: string,
): T | undefined => {
  if (typeof value !== "string" || !value.trim()) {
    return undefined;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    throw new AppError(
      status.BAD_REQUEST,
      `${fieldName} must be a valid JSON string`,
    );
  }
};

const getUploadedImageUrl = (
  file: (Express.Multer.File & { path?: string }) | undefined,
  fieldName: string,
) => {
  if (!file) {
    return undefined;
  }

  if (!file.mimetype.toLowerCase().startsWith("image/")) {
    throw new AppError(
      status.BAD_REQUEST,
      `${fieldName} must be an image file`,
    );
  }

  if (!file.path) {
    throw new AppError(status.BAD_REQUEST, `${fieldName} upload failed`);
  }

  return file.path;
};

const createExperienceReport = catchAsync(
  async (req: Request, res: Response) => {
    const userId = getAuthenticatedUserId(req);
    const files = req.files as
      | {
          beforeImage?: Array<Express.Multer.File & { path?: string }>;
          afterImage?: Array<Express.Multer.File & { path?: string }>;
        }
      | undefined;

    const parsedData = parseJsonField<Partial<ICreateExperienceReportPayload>>(
      req.body.data,
      "data",
    );

    const beforeImageFile = files?.beforeImage?.[0];
    const afterImageFile = files?.afterImage?.[0];

    const mergedPayload = {
      ideaId: req.body.ideaId ?? parsedData?.ideaId,
      title: req.body.title ?? parsedData?.title,
      summary: req.body.summary ?? parsedData?.summary,
      outcome: req.body.outcome ?? parsedData?.outcome,
      challenges: req.body.challenges ?? parsedData?.challenges,
      measurableResult:
        req.body.measurableResult ?? parsedData?.measurableResult,
      adoptedScale: req.body.adoptedScale ?? parsedData?.adoptedScale,
      location: req.body.location ?? parsedData?.location,
      effectivenessRating:
        req.body.effectivenessRating ?? parsedData?.effectivenessRating,
      beforeImageUrl:
        getUploadedImageUrl(beforeImageFile, "beforeImage") ??
        req.body.beforeImageUrl ??
        parsedData?.beforeImageUrl,
      afterImageUrl:
        getUploadedImageUrl(afterImageFile, "afterImage") ??
        req.body.afterImageUrl ??
        parsedData?.afterImageUrl,
    };

    const parsedPayload = createExperienceReportSchema.safeParse(mergedPayload);

    if (!parsedPayload.success) {
      throw parsedPayload.error;
    }

    const result = await CommunityService.createExperienceReport(
      userId,
      parsedPayload.data,
    );

    sendResponse(res, {
      httpStatusCode: status.CREATED,
      success: true,
      message: "Experience report created successfully",
      data: result,
    });
  },
);

const getAllExperienceReports = catchAsync(
  async (req: Request, res: Response) => {
    const result = await CommunityService.getAllExperienceReports(
      req.query as Record<string, unknown>,
    );

    sendResponse(res, {
      httpStatusCode: status.OK,
      success: true,
      message: "Experience reports retrieved successfully",
      meta: result.meta,
      data: result.data,
    });
  },
);

const getSingleExperienceReport = catchAsync(
  async (req: Request, res: Response) => {
    const result = await CommunityService.getSingleExperienceReport(
      req.params.id as string,
    );

    sendResponse(res, {
      httpStatusCode: status.OK,
      success: true,
      message: "Experience report retrieved successfully",
      data: result,
    });
  },
);

const getIdeaExperienceReports = catchAsync(
  async (req: Request, res: Response) => {
    const result = await CommunityService.getIdeaExperienceReports(
      req.params.ideaId as string,
      req.query as Record<string, unknown>,
    );

    sendResponse(res, {
      httpStatusCode: status.OK,
      success: true,
      message: "Idea experience reports retrieved successfully",
      meta: result.meta,
      data: result.data,
    });
  },
);

const updateExperienceReport = catchAsync(
  async (req: Request, res: Response) => {
    const userId = getAuthenticatedUserId(req);

    const result = await CommunityService.updateExperienceReport(
      req.params.id as string,
      userId,
      req.body,
    );

    sendResponse(res, {
      httpStatusCode: status.OK,
      success: true,
      message: "Experience report updated successfully",
      data: result,
    });
  },
);

const deleteExperienceReport = catchAsync(
  async (req: Request, res: Response) => {
    const userId = getAuthenticatedUserId(req);

    const result = await CommunityService.deleteExperienceReport(
      req.params.id as string,
      userId,
    );

    sendResponse(res, {
      httpStatusCode: status.OK,
      success: true,
      message: "Experience report deleted successfully",
      data: result,
    });
  },
);

const approveExperienceReport = catchAsync(
  async (req: Request, res: Response) => {
    const result = await CommunityService.approveExperienceReport(
      req.params.id as string,
    );

    sendResponse(res, {
      httpStatusCode: status.OK,
      success: true,
      message: "Experience report approved successfully",
      data: result,
    });
  },
);

const rejectExperienceReport = catchAsync(
  async (req: Request, res: Response) => {
    const result = await CommunityService.rejectExperienceReport(
      req.params.id as string,
    );

    sendResponse(res, {
      httpStatusCode: status.OK,
      success: true,
      message: "Experience report rejected successfully",
      data: result,
    });
  },
);

const featureExperienceReport = catchAsync(
  async (req: Request, res: Response) => {
    const result = await CommunityService.featureExperienceReport(
      req.params.id as string,
    );

    sendResponse(res, {
      httpStatusCode: status.OK,
      success: true,
      message: "Experience report featured successfully",
      data: result,
    });
  },
);

const getMyNotifications = catchAsync(async (req: Request, res: Response) => {
  const userId = getAuthenticatedUserId(req);

  const result = await CommunityService.getMyNotifications(
    userId,
    req.query as Record<string, unknown>,
  );

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Notifications retrieved successfully",
    meta: result.meta,
    data: result.data,
  });
});

const getSingleNotification = catchAsync(
  async (req: Request, res: Response) => {
    const userId = getAuthenticatedUserId(req);

    const result = await CommunityService.getSingleNotification(
      req.params.id as string,
      userId,
    );

    sendResponse(res, {
      httpStatusCode: status.OK,
      success: true,
      message: "Notification retrieved successfully",
      data: result,
    });
  },
);

const markNotificationRead = catchAsync(async (req: Request, res: Response) => {
  const userId = getAuthenticatedUserId(req);

  const result = await CommunityService.markNotificationRead(
    req.params.id as string,
    userId,
  );

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Notification marked as read successfully",
    data: result,
  });
});

const markAllNotificationsRead = catchAsync(
  async (req: Request, res: Response) => {
    const userId = getAuthenticatedUserId(req);

    const result = await CommunityService.markAllNotificationsRead(userId);

    sendResponse(res, {
      httpStatusCode: status.OK,
      success: true,
      message: "All notifications marked as read successfully",
      data: result,
    });
  },
);

const deleteNotification = catchAsync(async (req: Request, res: Response) => {
  const userId = getAuthenticatedUserId(req);

  const result = await CommunityService.deleteNotification(
    req.params.id as string,
    userId,
  );

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Notification deleted successfully",
    data: result,
  });
});

const subscribeNewsletter = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.userId ?? null;

  const result = await CommunityService.subscribeNewsletter(userId, req.body);

  sendResponse(res, {
    httpStatusCode: status.CREATED,
    success: true,
    message: "Newsletter subscription created successfully",
    data: result,
  });
});

const unsubscribeNewsletter = catchAsync(
  async (req: Request, res: Response) => {
    const result = await CommunityService.unsubscribeNewsletter(req.body);

    sendResponse(res, {
      httpStatusCode: status.OK,
      success: true,
      message: "Newsletter unsubscribed successfully",
      data: result,
    });
  },
);

const getNewsletterSubscriptions = catchAsync(
  async (req: Request, res: Response) => {
    const result = await CommunityService.getNewsletterSubscriptions(
      req.query as Record<string, unknown>,
    );

    sendResponse(res, {
      httpStatusCode: status.OK,
      success: true,
      message: "Newsletter subscriptions retrieved successfully",
      meta: result.meta,
      data: result.data,
    });
  },
);

export const CommunityController = {
  createExperienceReport,
  getAllExperienceReports,
  getSingleExperienceReport,
  getIdeaExperienceReports,
  updateExperienceReport,
  deleteExperienceReport,
  approveExperienceReport,
  rejectExperienceReport,
  featureExperienceReport,
  getMyNotifications,
  getSingleNotification,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
  subscribeNewsletter,
  unsubscribeNewsletter,
  getNewsletterSubscriptions,
};
