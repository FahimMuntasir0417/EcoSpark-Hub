import { NextFunction, Request, Response } from "express";
import { ZodType } from "zod";

const parseJsonBodyString = (body: unknown) => {
  if (typeof body !== "string") {
    return body;
  }

  const trimmedBody = body.trim();

  if (!trimmedBody) {
    return body;
  }

  const firstCharacter = trimmedBody[0];

  if (firstCharacter !== "{" && firstCharacter !== "[") {
    return body;
  }

  try {
    return JSON.parse(trimmedBody);
  } catch {
    return body;
  }
};

export const validateRequest = (zodSchema: ZodType) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const normalizedBody = parseJsonBodyString(req.body);
    const parsedResult = zodSchema.safeParse(normalizedBody);

    if (!parsedResult.success) {
      return next(parsedResult.error);
    }

    req.body = parsedResult.data;

    return next();
  };
};
