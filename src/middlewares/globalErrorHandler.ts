import { NextFunction, Request, Response } from "express";
import { TErrorResponse, TErrorSources } from "../interfaces/error.interface";
import status from "http-status";
import { handleZodError } from "../errors/handleZodError";
import AppError from "../errors/AppError";
import { Prisma } from "../generated/prisma/client";
import multer from "multer";
import { z } from "zod";
import { deleteFileFromCloudinary } from "../config/cloudinary.config";

type TNormalizedError = {
  statusCode: number;
  message: string;
  errorSources: TErrorSources[];
  stack?: string;
};

const rollbackUploadedFile = async (req: Request) => {
  const uploadedFilePaths = new Set<string>();
  const singleFile = req.file as { path?: string } | undefined;

  if (singleFile?.path) {
    uploadedFilePaths.add(singleFile.path);
  }

  const files = req.files as
    | Array<{ path?: string }>
    | Record<string, Array<{ path?: string }>>
    | undefined;

  if (Array.isArray(files)) {
    for (const file of files) {
      if (file?.path) {
        uploadedFilePaths.add(file.path);
      }
    }
  } else if (files && typeof files === "object") {
    for (const fileList of Object.values(files)) {
      for (const file of fileList) {
        if (file?.path) {
          uploadedFilePaths.add(file.path);
        }
      }
    }
  }

  if (uploadedFilePaths.size === 0) {
    return;
  }

  for (const filePath of uploadedFilePaths) {
    try {
      await deleteFileFromCloudinary(filePath);
    } catch (cleanupError) {
      console.error("Failed to rollback uploaded file:", cleanupError);
    }
  }
};

const normalizePrismaKnownError = (
  err: Prisma.PrismaClientKnownRequestError,
) : TNormalizedError => {
  let statusCode: number = status.INTERNAL_SERVER_ERROR;
  let message = "Database request failed";
  let errorSources: TErrorSources[] = [
    {
      path: "",
      message,
    },
  ];

  if (err.code === "P2002") {
    const target = Array.isArray(err.meta?.target)
      ? err.meta.target.join(", ")
      : "field";

    statusCode = status.CONFLICT;
    message = `${target} already exists`;
    errorSources = [
      {
        path: target,
        message,
      },
    ];
  } else if (err.code === "P2003") {
    const field =
      typeof err.meta?.field_name === "string" ? err.meta.field_name : "field";

    statusCode = status.BAD_REQUEST;
    message = `Invalid reference for ${field}`;
    errorSources = [
      {
        path: field,
        message,
      },
    ];
  } else if (err.code === "P2025") {
    statusCode = status.NOT_FOUND;
    message = "Record not found";
    errorSources = [
      {
        path: "",
        message,
      },
    ];
  }

  return {
    statusCode,
    message,
    errorSources,
    stack: err.stack,
  };
};

const normalizePrismaUnknownError = (
  err: Prisma.PrismaClientUnknownRequestError,
): TNormalizedError => {
  const message = "Unknown database error occurred";

  return {
    statusCode: status.INTERNAL_SERVER_ERROR,
    message,
    errorSources: [
      {
        path: "",
        message,
      },
    ],
    stack: err.stack,
  };
};

export const globalErrorHandler = async (
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
) => {
  let errorSources: TErrorSources[] = [];
  let statusCode: number = status.INTERNAL_SERVER_ERROR;
  let message: string = "Something went wrong";
  let stack: string | undefined = undefined;

  if (err instanceof z.ZodError) {
    const simplifiedError = handleZodError(err);

    statusCode = simplifiedError.statusCode || status.INTERNAL_SERVER_ERROR;

    message = simplifiedError.message;
    errorSources = simplifiedError.errorSources;
    stack = err.stack;
  } else if (err instanceof Prisma.PrismaClientKnownRequestError) {
    const simplifiedError = normalizePrismaKnownError(err);

    statusCode = simplifiedError.statusCode;
    message = simplifiedError.message;
    errorSources = simplifiedError.errorSources;
    stack = simplifiedError.stack;
  } else if (err instanceof Prisma.PrismaClientUnknownRequestError) {
    const simplifiedError = normalizePrismaUnknownError(err);

    statusCode = simplifiedError.statusCode;
    message = simplifiedError.message;
    errorSources = simplifiedError.errorSources;
    stack = simplifiedError.stack;
  } else if (err instanceof multer.MulterError) {
    statusCode = status.BAD_REQUEST;
    message =
      err.code === "LIMIT_FILE_SIZE"
        ? "File size exceeds 10MB limit"
        : err.message;
    stack = err.stack;
    errorSources = [
      {
        path: "",
        message,
      },
    ];
  } else if (err instanceof Error && err.message === "Invalid file type") {
    statusCode = status.BAD_REQUEST;
    message =
      "Invalid file type. Allowed: jpg, png, gif, webp, pdf, doc, docx, mp4, webm, mov";
    stack = err.stack;
    errorSources = [
      {
        path: "",
        message,
      },
    ];
  } else if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
    stack = err.stack;
    errorSources = [
      {
        path: "",
        message: err.message,
      },
    ];
  } else if (err instanceof Error) {
    message = err.message;
    stack = err.stack;
    errorSources = [
      {
        path: "",
        message: err.message,
      },
    ];
  }

  const errorResponse: TErrorResponse = {
    success: false,
    message: message,
    errorSources,
    error: process.env.NODE_ENV === "development" ? err : undefined,
    stack: process.env.NODE_ENV === "development" ? stack : undefined,
  };

  await rollbackUploadedFile(req);

  res.status(statusCode).json(errorResponse);
};
