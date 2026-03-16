import status from "http-status";
import { z } from "zod";
import type {
  TErrorResponse,
  TErrorSources,
} from "../interfaces/error.interface";

export const handleZodError = (error: z.ZodError): TErrorResponse => {
  const statusCode = status.BAD_REQUEST;
  const message = "Zod validation error";

  const errorSources: TErrorSources[] = error.issues.map((issue) => ({
    path: issue.path.length ? issue.path.join("=>") : "root",
    message: issue.message,
  }));

  return {
    statusCode,
    success: false,
    message,
    errorSources,
  };
};
