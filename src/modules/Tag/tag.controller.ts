import { Request, Response } from "express";
import status from "http-status";
import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponse";
import { TagService } from "./tag.service";

const createTag = catchAsync(async (req: Request, res: Response) => {
  const result = await TagService.createTag(req.body);

  sendResponse(res, {
    httpStatusCode: status.CREATED,
    success: true,
    message: "Tag created successfully",
    data: result,
  });
});

const getAllTags = catchAsync(async (req: Request, res: Response) => {
  const result = await TagService.getAllTags(
    req.query as Record<string, unknown>,
  );

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Tags retrieved successfully",
    meta: result.meta,
    data: result.data,
  });
});

const getSingleTag = catchAsync(async (req: Request, res: Response) => {
  const result = await TagService.getSingleTag(req.params.id as string);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Tag retrieved successfully",
    data: result,
  });
});

const getTagBySlug = catchAsync(async (req: Request, res: Response) => {
  const result = await TagService.getTagBySlug(req.params.slug as string);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Tag retrieved successfully",
    data: result,
  });
});

const updateTag = catchAsync(async (req: Request, res: Response) => {
  const result = await TagService.updateTag(req.params.id as string, req.body);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Tag updated successfully",
    data: result,
  });
});

const deleteTag = catchAsync(async (req: Request, res: Response) => {
  await TagService.deleteTag(req.params.id as string);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Tag deleted successfully",
    data: null,
  });
});

export const TagController = {
  createTag,
  getAllTags,
  getSingleTag,
  getTagBySlug,
  updateTag,
  deleteTag,
};
