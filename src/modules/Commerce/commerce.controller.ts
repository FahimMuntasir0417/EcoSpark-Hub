import { Request, Response } from "express";
import status from "http-status";
import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponse";
import { CommerceService } from "./commerce.service";

const createStripeCheckoutSession = catchAsync(
  async (req: Request, res: Response) => {
    const userId = (req as Request & { user?: { userId: string } }).user
      ?.userId as string;

    const result = await CommerceService.createIdeaCheckoutSession(
      req.params.ideaId as string,
      userId,
      req.body,
    );

    sendResponse(res, {
      httpStatusCode: status.CREATED,
      success: true,
      message: "Stripe checkout session created successfully",
      data: result,
    });
  },
);

const getAllPurchases = catchAsync(async (req: Request, res: Response) => {
  const result = await CommerceService.getAllPurchases(
    req.query as Record<string, unknown>,
  );

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Purchases retrieved successfully",
    meta: result.meta,
    data: result.data,
  });
});

const getSinglePurchase = catchAsync(async (req: Request, res: Response) => {
  const result = await CommerceService.getSinglePurchase(
    req.params.id as string,
    ((req.query.session_id as string | undefined) ??
      (req.query.sessionId as string | undefined)) as string | undefined,
  );

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

  const result = await CommerceService.getMyPurchases(
    userId,
    req.query as Record<string, unknown>,
  );

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "My purchases retrieved successfully",
    meta: result.meta,
    data: result.data,
  });
});

const refundPurchase = catchAsync(async (req: Request, res: Response) => {
  const actorId = (req as Request & { user?: { userId: string } }).user
    ?.userId as string;

  const result = await CommerceService.refundPurchase(
    req.params.id as string,
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

  const result = await CommerceService.cancelPurchase(
    req.params.id as string,
    userId,
  );

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Purchase cancelled successfully",
    data: result,
  });
});

const getAllTransactions = catchAsync(async (req: Request, res: Response) => {
  const result = await CommerceService.getAllTransactions(
    req.query as Record<string, unknown>,
  );

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Transactions retrieved successfully",
    meta: result.meta,
    data: result.data,
  });
});

const getSingleTransaction = catchAsync(async (req: Request, res: Response) => {
  const result = await CommerceService.getSingleTransaction(
    req.params.id as string,
  );

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Transaction retrieved successfully",
    data: result,
  });
});

const stripeWebhook = catchAsync(async (req: Request, res: Response) => {
  const result = await CommerceService.handleStripeWebhook(
    req.body as Buffer,
    req.headers["stripe-signature"],
  );

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Stripe webhook processed successfully",
    data: result,
  });
});

export const CommerceController = {
  createStripeCheckoutSession,
  getAllPurchases,
  getSinglePurchase,
  getMyPurchases,
  refundPurchase,
  cancelPurchase,
  getAllTransactions,
  getSingleTransaction,
  stripeWebhook,
};
