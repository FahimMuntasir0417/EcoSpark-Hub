import { Request, Response } from "express";
import status from "http-status";
import AppError from "../../errors/AppError";
import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponse";
import { IdeaService } from "./idea.service";

import {
  ICreateIdeaAttachmentPayload,
  ICreateIdeaMediaPayload,
  ICreateIdeaPayload,
} from "./idea.interface";

const getAuthenticatedUserId = (req: Request) => {
  const userId = req.user?.userId;

  if (!userId) {
    throw new AppError(
      status.UNAUTHORIZED,
      "Unauthorized access! Please log in.",
    );
  }

  return userId;
};

const resolveAttachmentType = (
  file: Express.Multer.File,
): ICreateIdeaAttachmentPayload["fileType"] => {
  const mimeType = file.mimetype.toLowerCase();

  if (mimeType.startsWith("image/")) return "IMAGE";
  if (mimeType.startsWith("video/")) return "VIDEO";
  if (mimeType === "application/pdf") return "PDF";

  if (
    mimeType === "application/msword" ||
    mimeType ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    return "DOC";
  }

  return "OTHER";
};

const resolveMediaType = (
  file: Express.Multer.File,
): ICreateIdeaMediaPayload["type"] => {
  const mimeType = file.mimetype.toLowerCase();

  if (mimeType.startsWith("image/")) return "IMAGE";
  if (mimeType.startsWith("video/")) return "VIDEO";

  throw new AppError(
    status.BAD_REQUEST,
    "Only image or video files are allowed for media",
  );
};

const parseJsonField = <T>(value: unknown, fieldName: string): T | undefined => {
  if (typeof value !== "string" || !value.trim()) {
    return undefined;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    throw new AppError(
      status.BAD_REQUEST,
      `${fieldName} must be valid JSON string`,
    );
  }
};

const createIdea = catchAsync(async (req: Request, res: Response) => {
  const authorId = getAuthenticatedUserId(req);

  const result = await IdeaService.createIdea(
    authorId,
    req.body as ICreateIdeaPayload,
  );

  sendResponse(res, {
    httpStatusCode: status.CREATED,
    success: true,
    message: "Idea created successfully",
    data: result,
  });
});

// const getAllIdeas = catchAsync(async (req: Request, res: Response) => {
//   const result = await IdeaService.getAllIdeas(
//     req.query as Record<string, unknown>,
//   );

//   sendResponse(res, {
//     httpStatusCode: status.OK,
//     success: true,
//      message: "Ideas retrieved successfully",
//     data: result,
//   });
// });

const getAllIdeas = catchAsync(async (req: Request, res: Response) => {
  const result = await IdeaService.getAllIdeas(
    req.query as Record<string, unknown>,
  );

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Ideas retrieved successfully",
    meta: result.meta,
    data: result.data,
  });
});

const getSingleIdea = catchAsync(async (req: Request, res: Response) => {
  const result = await IdeaService.getSingleIdea(req.params.id as string);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Idea retrieved successfully",
    data: result,
  });
});

const getIdeaBySlug = catchAsync(async (req: Request, res: Response) => {
  const result = await IdeaService.getIdeaBySlug(req.params.slug as string);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Idea retrieved successfully",
    data: result,
  });
});

const updateIdea = catchAsync(async (req: Request, res: Response) => {
  const result = await IdeaService.updateIdea(
    req.params.id as string as string,
    req.body,
  );

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Idea updated successfully",
    data: result,
  });
});

const deleteIdea = catchAsync(async (req: Request, res: Response) => {
  const result = await IdeaService.deleteIdea(req.params.id as string);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Idea deleted successfully",
    data: result,
  });
});

const submitIdea = catchAsync(async (req: Request, res: Response) => {
  const actorId = getAuthenticatedUserId(req);
  const result = await IdeaService.submitIdea(req.params.id as string, actorId);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Idea submitted successfully",
    data: result,
  });
});

const approveIdea = catchAsync(async (req: Request, res: Response) => {
  const actorId = getAuthenticatedUserId(req);
  const result = await IdeaService.approveIdea(
    req.params.id as string,
    actorId,
  );

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Idea approved successfully",
    data: result,
  });
});

const rejectIdea = catchAsync(async (req: Request, res: Response) => {
  const actorId = getAuthenticatedUserId(req);
  const result = await IdeaService.rejectIdea(
    req.params.id as string,
    actorId,
    req.body,
  );

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Idea rejected successfully",
    data: result,
  });
});

const archiveIdea = catchAsync(async (req: Request, res: Response) => {
  const actorId = getAuthenticatedUserId(req);
  const result = await IdeaService.archiveIdea(
    req.params.id as string as string,
    actorId,
  );

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Idea archived successfully",
    data: result,
  });
});

const publishIdea = catchAsync(async (req: Request, res: Response) => {
  const result = await IdeaService.publishIdea(req.params.id as string);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Idea published successfully",
    data: result,
  });
});

const featureIdea = catchAsync(async (req: Request, res: Response) => {
  const result = await IdeaService.featureIdea(req.params.id as string);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Idea featured successfully",
    data: result,
  });
});

const highlightIdea = catchAsync(async (req: Request, res: Response) => {
  const result = await IdeaService.highlightIdea(req.params.id as string);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Idea highlighted successfully",
    data: result,
  });
});

const updateIdeaTags = catchAsync(async (req: Request, res: Response) => {
  const result = await IdeaService.updateIdeaTags(
    req.params.id as string,
    req.body,
  );

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Idea tags updated successfully",
    data: result,
  });
});

const addIdeaAttachment = catchAsync(async (req: Request, res: Response) => {
  const file = req.file as (Express.Multer.File & { path?: string }) | undefined;

  if (!file) {
    throw new AppError(status.BAD_REQUEST, "Attachment file is required");
  }

  if (!file.path) {
    throw new AppError(status.BAD_REQUEST, "File upload failed");
  }

  const data = parseJsonField<{ title?: string }>(req.body.data, "data");

  const payload: ICreateIdeaAttachmentPayload = {
    title: req.body.title ?? data?.title,
    fileUrl: file.path,
    fileType: resolveAttachmentType(file),
    fileName: file.originalname,
    fileSizeBytes: file.size,
    mimeType: file.mimetype,
  };

  const result = await IdeaService.addIdeaAttachment(
    req.params.id as string,
    payload,
  );

  sendResponse(res, {
    httpStatusCode: status.CREATED,
    success: true,
    message: "Idea attachment added successfully",
    data: result,
  });
});

const deleteIdeaAttachment = catchAsync(async (req: Request, res: Response) => {
  const result = await IdeaService.deleteIdeaAttachment(
    req.params.id as string,
    req.params.attachmentId as string,
  );

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Idea attachment deleted successfully",
    data: result,
  });
});

const addIdeaMedia = catchAsync(async (req: Request, res: Response) => {
  const file = req.file as (Express.Multer.File & { path?: string }) | undefined;
  const data = parseJsonField<Partial<ICreateIdeaMediaPayload>>(
    req.body.data,
    "data",
  );

  const merged = {
    url: req.body.url ?? data?.url,
    type: req.body.type ?? data?.type,
    altText: req.body.altText ?? data?.altText,
    caption: req.body.caption ?? data?.caption,
    sortOrder: req.body.sortOrder ?? data?.sortOrder,
    isPrimary: req.body.isPrimary ?? data?.isPrimary,
  };

  let payload: ICreateIdeaMediaPayload;

  if (file) {
    if (!file.path) {
      throw new AppError(status.BAD_REQUEST, "File upload failed");
    }

    const derivedType = resolveMediaType(file);

    if (merged.type && merged.type !== derivedType) {
      throw new AppError(
        status.BAD_REQUEST,
        `Provided media type does not match uploaded file. Expected ${derivedType}`,
      );
    }

    payload = {
      url: file.path,
      type: derivedType,
      altText: merged.altText,
      caption: merged.caption,
      sortOrder: merged.sortOrder,
      isPrimary: merged.isPrimary,
    };
  } else {
    if (!merged.url || !merged.type) {
      throw new AppError(
        status.BAD_REQUEST,
        "Either upload a file or provide both url and type",
      );
    }

    payload = {
      url: merged.url,
      type: merged.type,
      altText: merged.altText,
      caption: merged.caption,
      sortOrder: merged.sortOrder,
      isPrimary: merged.isPrimary,
    };
  }

  const result = await IdeaService.addIdeaMedia(
    req.params.id as string,
    payload,
  );

  sendResponse(res, {
    httpStatusCode: status.CREATED,
    success: true,
    message: "Idea media added successfully",
    data: result,
  });
});

const deleteIdeaMedia = catchAsync(async (req: Request, res: Response) => {
  const result = await IdeaService.deleteIdeaMedia(
    req.params.id as string,
    req.params.mediaId as string,
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
