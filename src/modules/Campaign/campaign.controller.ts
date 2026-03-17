import { Request, Response } from "express";
import status from "http-status";
import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponse";
import { CampaignService } from "./campaign.service";

const createCampaign = catchAsync(async (req: Request, res: Response) => {
  const userId = (req as Request & { user?: { userId: string } }).user
    ?.userId as string;
  const result = await CampaignService.createCampaign(userId, req.body);

  sendResponse(res, {
    httpStatusCode: status.CREATED,
    success: true,
    message: "Campaign created successfully",
    data: result,
  });
});

const getAllCampaigns = catchAsync(async (req: Request, res: Response) => {
  const result = await CampaignService.getAllCampaigns(
    req.query as Record<string, unknown>,
  );

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Campaigns retrieved successfully",
    data: result,
  });
});

const getSingleCampaign = catchAsync(async (req: Request, res: Response) => {
  const result = await CampaignService.getSingleCampaign(req.params.id);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Campaign retrieved successfully",
    data: result,
  });
});

const getCampaignBySlug = catchAsync(async (req: Request, res: Response) => {
  const result = await CampaignService.getCampaignBySlug(req.params.slug);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Campaign retrieved successfully",
    data: result,
  });
});

const updateCampaign = catchAsync(async (req: Request, res: Response) => {
  const result = await CampaignService.updateCampaign(req.params.id, req.body);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Campaign updated successfully",
    data: result,
  });
});

const updateCampaignStatus = catchAsync(async (req: Request, res: Response) => {
  const result = await CampaignService.updateCampaignStatus(
    req.params.id,
    req.body,
  );

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Campaign status updated successfully",
    data: result,
  });
});

const deleteCampaign = catchAsync(async (req: Request, res: Response) => {
  const result = await CampaignService.deleteCampaign(req.params.id);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Campaign deleted successfully",
    data: result,
  });
});

const getCampaignIdeas = catchAsync(async (req: Request, res: Response) => {
  const result = await CampaignService.getCampaignIdeas(req.params.id);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Campaign ideas retrieved successfully",
    data: result,
  });
});

export const CampaignController = {
  createCampaign,
  getAllCampaigns,
  getSingleCampaign,
  getCampaignBySlug,
  updateCampaign,
  updateCampaignStatus,
  deleteCampaign,
  getCampaignIdeas,
};
