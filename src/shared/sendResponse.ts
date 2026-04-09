import { Response } from "express";

interface IResponse<T> {
  httpStatusCode: number;
  success: boolean;
  message: string;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPage?: number;
  };
  data?: T;
}

export const sendResponse = <T>(res: Response, data: IResponse<T>) => {
  res.status(data.httpStatusCode).json({
    success: data.success,
    message: data.message,
    meta: data.meta,
    data: data.data,
  });
};
