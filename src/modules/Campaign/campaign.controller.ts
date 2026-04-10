import { Request, Response } from "express";
import status from "http-status";
import AppError from "../../errors/AppError";
import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponse";
import {
  ICreateCampaignPayload,
  IUpdateCampaignPayload,
} from "./campaign.interface";
import { CampaignService } from "./campaign.service";
import {
  createCampaignSchema,
  updateCampaignSchema,
} from "./campaign.validation";

const parseJsonField = <T>(value: unknown, fieldName: string): T | undefined => {
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

const omitUndefinedFields = <T extends Record<string, unknown>>(payload: T) => {
  return Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value !== undefined),
  ) as Partial<T>;
};

const createCampaign = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.userId;
  const file = req.file as (Express.Multer.File & { path?: string }) | undefined;

  if (!userId) {
    throw new AppError(
      status.UNAUTHORIZED,
      "Unauthorized access! No authenticated user found.",
    );
  }

  const parsedData = parseJsonField<Partial<ICreateCampaignPayload>>(
    req.body.data,
    "data",
  );

  const payload = omitUndefinedFields({
    title: req.body.title ?? parsedData?.title,
    slug: req.body.slug ?? parsedData?.slug,
    description: req.body.description ?? parsedData?.description,
    bannerImage:
      getUploadedImageUrl(file, "bannerImage") ??
      req.body.bannerImage ??
      parsedData?.bannerImage,
    isActive: req.body.isActive ?? parsedData?.isActive,
    isPublic: req.body.isPublic ?? parsedData?.isPublic,
    startDate: req.body.startDate ?? parsedData?.startDate,
    endDate: req.body.endDate ?? parsedData?.endDate,
    goalText: req.body.goalText ?? parsedData?.goalText,
    seoTitle: req.body.seoTitle ?? parsedData?.seoTitle,
    seoDescription: req.body.seoDescription ?? parsedData?.seoDescription,
  });

  const parsedPayload = createCampaignSchema.safeParse(payload);

  if (!parsedPayload.success) {
    throw parsedPayload.error;
  }

  const result = await CampaignService.createCampaign(userId, parsedPayload.data);

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
    meta: result.meta,
    data: result.data,
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
  const file = req.file as (Express.Multer.File & { path?: string }) | undefined;
  const parsedData = parseJsonField<Partial<IUpdateCampaignPayload>>(
    req.body.data,
    "data",
  );

  const payload = omitUndefinedFields({
    title: req.body.title ?? parsedData?.title,
    slug: req.body.slug ?? parsedData?.slug,
    description: req.body.description ?? parsedData?.description,
    bannerImage:
      getUploadedImageUrl(file, "bannerImage") ??
      req.body.bannerImage ??
      parsedData?.bannerImage,
    isActive: req.body.isActive ?? parsedData?.isActive,
    isPublic: req.body.isPublic ?? parsedData?.isPublic,
    startDate: req.body.startDate ?? parsedData?.startDate,
    endDate: req.body.endDate ?? parsedData?.endDate,
    goalText: req.body.goalText ?? parsedData?.goalText,
    seoTitle: req.body.seoTitle ?? parsedData?.seoTitle,
    seoDescription: req.body.seoDescription ?? parsedData?.seoDescription,
  });

  const parsedPayload = updateCampaignSchema.safeParse(payload);

  if (!parsedPayload.success) {
    throw parsedPayload.error;
  }

  const result = await CampaignService.updateCampaign(
    req.params.id,
    parsedPayload.data,
  );

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
  const result = await CampaignService.getCampaignIdeas(
    req.params.id,
    req.query as Record<string, unknown>,
  );

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Campaign ideas retrieved successfully",
    meta: result.meta,
    data: result.data,
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
