import { Request, Response } from "express";
import status from "http-status";
import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponse";
import { AnalyticsService } from "./analytics.service";

const getMemberAnalytics = catchAsync(async (req: Request, res: Response) => {
  const result = await AnalyticsService.getMemberAnalytics(req.user!.userId);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Member analytics retrieved successfully",
    data: result,
  });
});

const getScientistAnalytics = catchAsync(async (req: Request, res: Response) => {
  const result = await AnalyticsService.getScientistAnalytics(req.user!.userId);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Scientist analytics retrieved successfully",
    data: result,
  });
});

const getAdminAnalytics = catchAsync(async (_req: Request, res: Response) => {
  const result = await AnalyticsService.getAdminAnalytics();

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Admin analytics retrieved successfully",
    data: result,
  });
});

export const AnalyticsController = {
  getMemberAnalytics,
  getScientistAnalytics,
  getAdminAnalytics,
};
