import { Request, Response } from "express";
import status from "http-status";
import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponse";
import { CommerceService } from "./commerce.service";

const purchaseIdea = catchAsync(async (req: Request, res: Response) => {
  const userId = (req as Request & { user?: { userId: string } }).user
    ?.userId as string;

  const result = await CommerceService.purchaseIdea(
    req.params.ideaId,
    userId,
    req.body,
  );

  sendResponse(res, {
    httpStatusCode: status.CREATED,
    success: true,
    message: "Idea purchase created successfully",
    data: result,
  });
});

const getAllPurchases = catchAsync(async (_req: Request, res: Response) => {
  const result = await CommerceService.getAllPurchases();

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Purchases retrieved successfully",
    data: result,
  });
});

const getSinglePurchase = catchAsync(async (req: Request, res: Response) => {
  const result = await CommerceService.getSinglePurchase(req.params.id);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Purchase retrieved successfully",
    data: result,
  });
});

const getMyPurchases = catchAsync(async (req: Request, res: Response) => {
  const userId = (req as Request & { user?: { userId: string } }).user
    ?.userId as string;

  const result = await CommerceService.getMyPurchases(userId);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "My purchases retrieved successfully",
    data: result,
  });
});

const refundPurchase = catchAsync(async (req: Request, res: Response) => {
  const actorId = (req as Request & { user?: { userId: string } }).user
    ?.userId as string;

  const result = await CommerceService.refundPurchase(
    req.params.id,
    actorId,
    req.body,
  );

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Purchase refunded successfully",
    data: result,
  });
});

const cancelPurchase = catchAsync(async (req: Request, res: Response) => {
  const userId = (req as Request & { user?: { userId: string } }).user
    ?.userId as string;

  const result = await CommerceService.cancelPurchase(req.params.id, userId);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Purchase cancelled successfully",
    data: result,
  });
});

const getAllTransactions = catchAsync(async (_req: Request, res: Response) => {
  const result = await CommerceService.getAllTransactions();

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Transactions retrieved successfully",
    data: result,
  });
});

const getSingleTransaction = catchAsync(async (req: Request, res: Response) => {
  const result = await CommerceService.getSingleTransaction(req.params.id);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Transaction retrieved successfully",
    data: result,
  });
});

const paymentWebhook = catchAsync(async (req: Request, res: Response) => {
  const result = await CommerceService.paymentWebhook(req.body);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Payment webhook processed successfully",
    data: result,
  });
});

export const CommerceController = {
  purchaseIdea,
  getAllPurchases,
  getSinglePurchase,
  getMyPurchases,
  refundPurchase,
  cancelPurchase,
  getAllTransactions,
  getSingleTransaction,
  paymentWebhook,
};
