import { Request, Response } from "express";
import status from "http-status";
import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponse";
import { IdeaService } from "./idea.service";

const createIdea = catchAsync(async (req: Request, res: Response) => {
  const userId = (req as Request & { user?: { userId: string } }).user
    ?.userId as string;
  const result = await IdeaService.createIdea(userId, req.body);

  sendResponse(res, {
    httpStatusCode: status.CREATED,
    success: true,
    message: "Idea created successfully",
    data: result,
  });
});

const getAllIdeas = catchAsync(async (req: Request, res: Response) => {
  const result = await IdeaService.getAllIdeas(
    req.query as Record<string, unknown>,
  );

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Ideas retrieved successfully",
    data: result,
  });
});

const getSingleIdea = catchAsync(async (req: Request, res: Response) => {
  const result = await IdeaService.getSingleIdea(req.params.id);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Idea retrieved successfully",
    data: result,
  });
});

const getIdeaBySlug = catchAsync(async (req: Request, res: Response) => {
  const result = await IdeaService.getIdeaBySlug(req.params.slug);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Idea retrieved successfully",
    data: result,
  });
});

const updateIdea = catchAsync(async (req: Request, res: Response) => {
  const result = await IdeaService.updateIdea(req.params.id, req.body);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Idea updated successfully",
    data: result,
  });
});

const deleteIdea = catchAsync(async (req: Request, res: Response) => {
  const result = await IdeaService.deleteIdea(req.params.id);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Idea deleted successfully",
    data: result,
  });
});

const submitIdea = catchAsync(async (req: Request, res: Response) => {
  const actorId = (req as Request & { user?: { userId: string } }).user
    ?.userId as string;
  const result = await IdeaService.submitIdea(req.params.id, actorId);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Idea submitted successfully",
    data: result,
  });
});

const approveIdea = catchAsync(async (req: Request, res: Response) => {
  const actorId = (req as Request & { user?: { userId: string } }).user
    ?.userId as string;
  const result = await IdeaService.approveIdea(req.params.id, actorId);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Idea approved successfully",
    data: result,
  });
});

const rejectIdea = catchAsync(async (req: Request, res: Response) => {
  const actorId = (req as Request & { user?: { userId: string } }).user
    ?.userId as string;
  const result = await IdeaService.rejectIdea(req.params.id, actorId, req.body);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Idea rejected successfully",
    data: result,
  });
});

const archiveIdea = catchAsync(async (req: Request, res: Response) => {
  const actorId = (req as Request & { user?: { userId: string } }).user
    ?.userId as string;
  const result = await IdeaService.archiveIdea(req.params.id, actorId);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Idea archived successfully",
    data: result,
  });
});

const publishIdea = catchAsync(async (req: Request, res: Response) => {
  const result = await IdeaService.publishIdea(req.params.id);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Idea published successfully",
    data: result,
  });
});

const featureIdea = catchAsync(async (req: Request, res: Response) => {
  const result = await IdeaService.featureIdea(req.params.id);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Idea featured successfully",
    data: result,
  });
});

const highlightIdea = catchAsync(async (req: Request, res: Response) => {
  const result = await IdeaService.highlightIdea(req.params.id);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Idea highlighted successfully",
    data: result,
  });
});

const updateIdeaTags = catchAsync(async (req: Request, res: Response) => {
  const result = await IdeaService.updateIdeaTags(req.params.id, req.body);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Idea tags updated successfully",
    data: result,
  });
});

const addIdeaAttachment = catchAsync(async (req: Request, res: Response) => {
  const result = await IdeaService.addIdeaAttachment(req.params.id, req.body);

  sendResponse(res, {
    httpStatusCode: status.CREATED,
    success: true,
    message: "Idea attachment added successfully",
    data: result,
  });
});

const deleteIdeaAttachment = catchAsync(async (req: Request, res: Response) => {
  const result = await IdeaService.deleteIdeaAttachment(
    req.params.id,
    req.params.attachmentId,
  );

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Idea attachment deleted successfully",
    data: result,
  });
});

const addIdeaMedia = catchAsync(async (req: Request, res: Response) => {
  const result = await IdeaService.addIdeaMedia(req.params.id, req.body);

  sendResponse(res, {
    httpStatusCode: status.CREATED,
    success: true,
    message: "Idea media added successfully",
    data: result,
  });
});

const deleteIdeaMedia = catchAsync(async (req: Request, res: Response) => {
  const result = await IdeaService.deleteIdeaMedia(
    req.params.id,
    req.params.mediaId,
  );

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Idea media deleted successfully",
    data: result,
  });
});

export const IdeaController = {
  createIdea,
  getAllIdeas,
  getSingleIdea,
  getIdeaBySlug,
  updateIdea,
  deleteIdea,
  submitIdea,
  approveIdea,
  rejectIdea,
  archiveIdea,
  publishIdea,
  featureIdea,
  highlightIdea,
  updateIdeaTags,
  addIdeaAttachment,
  deleteIdeaAttachment,
  addIdeaMedia,
  deleteIdeaMedia,
};
