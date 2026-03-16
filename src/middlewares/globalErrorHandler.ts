import { Request, Response } from "express";
import { TErrorResponse, TErrorSources } from "../interfaces/error.interface";
import status from "http-status";
import { handleZodError } from "../errors/handleZodError";
import AppError from "../errors/AppError";
import { z } from "zod";

export const globalErrorHandler = (
  err: unknown,
  _req: Request,
  res: Response,
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

  res.status(statusCode).json(errorResponse);
};
