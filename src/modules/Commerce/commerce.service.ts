import status from "http-status";
import { QueryBuilder } from "../../builder/queryBuilder";
import AppError from "../../errors/AppError";
import { prisma } from "../../lib/prisma";
import {
  ICreateCheckoutSessionPayload,
  IRefundPurchasePayload,
} from "./commerce.interface";
import { StripeCheckoutService } from "./stripe.service";

const purchaseInclude = {
  idea: {
    select: {
      id: true,
      title: true,
      slug: true,
      accessType: true,
      price: true,
      currency: true,
      deletedAt: true,
      author: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
    },
  },
  user: {
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
    },
  },
  transactions: {
    orderBy: {
      createdAt: "desc" as const,
    },
  },
} as const;

const transactionInclude = {
  purchase: {
    select: {
      id: true,
      status: true,
      amount: true,
      currency: true,
      idea: {
        select: {
          id: true,
          title: true,
          slug: true,
        },
      },
    },
  },
  user: {
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
    },
  },
} as const;

const ensurePurchaseExists = async (id: string) => {
  const purchase = await prisma.ideaPurchase.findUnique({
    where: { id },
  });

  if (!purchase) {
    throw new AppError(status.NOT_FOUND, "Purchase not found");
  }

  return purchase;
};

const createIdeaCheckoutSession = async (
  ideaId: string,
  userId: string,
  payload: ICreateCheckoutSessionPayload,
) => StripeCheckoutService.createIdeaCheckoutSession(ideaId, userId, payload);

const getAllPurchases = async (query: Record<string, unknown>) => {
  const queryBuilder = new QueryBuilder({
    query,
    searchableFields: ["paymentProvider", "providerPaymentId", "currency"],
    filterableFields: ["status", "ideaId", "userId", "paymentProvider", "currency"],
    sortableFields: ["createdAt", "updatedAt", "paidAt"],
    defaultSortBy: "createdAt",
    defaultSortOrder: "desc",
  });

  const { where, skip, take, orderBy, meta } = queryBuilder.build();

  const [data, total] = await Promise.all([
    prisma.ideaPurchase.findMany({
      where,
      skip,
      take,
      include: purchaseInclude,
      orderBy,
    }),
    prisma.ideaPurchase.count({ where }),
  ]);

  return {
    meta: {
      ...meta,
      total,
      totalPage: Math.ceil(total / meta.limit),
    },
    data,
  };
};

const getSinglePurchase = async (id: string, sessionId?: string) => {
  const existingPurchase = await ensurePurchaseExists(id);

  const reconciliationSessionId =
    sessionId ??
    (existingPurchase.status === "PENDING" &&
    existingPurchase.paymentProvider === "STRIPE" &&
    existingPurchase.providerPaymentId?.startsWith("cs_")
      ? existingPurchase.providerPaymentId
      : undefined);

  if (reconciliationSessionId) {
    await StripeCheckoutService.reconcilePendingPurchaseFromCheckoutSession(
      id,
      reconciliationSessionId,
    );
  }

  const purchase = await prisma.ideaPurchase.findUnique({
    where: { id },
    include: purchaseInclude,
  });

  if (!purchase) {
    throw new AppError(status.NOT_FOUND, "Purchase not found");
  }

  return purchase;
};

const getMyPurchases = async (userId: string, query: Record<string, unknown>) => {
  const queryBuilder = new QueryBuilder({
    query,
    searchableFields: ["paymentProvider", "providerPaymentId", "currency"],
    filterableFields: ["status", "ideaId", "paymentProvider", "currency"],
    sortableFields: ["createdAt", "updatedAt", "paidAt"],
    defaultSortBy: "createdAt",
    defaultSortOrder: "desc",
    baseWhere: {
      userId,
    },
  });

  const { where, skip, take, orderBy, meta } = queryBuilder.build();

  const [data, total] = await Promise.all([
    prisma.ideaPurchase.findMany({
      where,
      skip,
      take,
      include: purchaseInclude,
      orderBy,
    }),
    prisma.ideaPurchase.count({ where }),
  ]);

  return {
    meta: {
      ...meta,
      total,
      totalPage: Math.ceil(total / meta.limit),
    },
    data,
  };
};

const refundPurchase = async (
  id: string,
  _actorId: string,
  payload: IRefundPurchasePayload,
) => {
  const purchase = await ensurePurchaseExists(id);

  if (purchase.status !== "PAID") {
    throw new AppError(
      status.BAD_REQUEST,
      "Only paid purchases can be refunded",
    );
  }

  if (purchase.paymentProvider === "STRIPE") {
    throw new AppError(
      status.NOT_IMPLEMENTED,
      "Stripe refunds are not integrated yet",
    );
  }

  const result = await prisma.$transaction(async (tx) => {
    const updatedPurchase = await tx.ideaPurchase.update({
      where: { id },
      data: {
        status: "REFUNDED",
        refundedAt: new Date(),
      },
      include: purchaseInclude,
    });

    await tx.paymentTransaction.create({
      data: {
        purchaseId: purchase.id,
        userId: purchase.userId,
        amount: purchase.amount,
        currency: purchase.currency,
        provider: purchase.paymentProvider,
        transactionId: `refund_${purchase.id}_${Date.now()}`,
        status: "REFUNDED",
        failureReason: payload.reason,
      },
    });

    return updatedPurchase;
  });

  return result;
};

const cancelPurchase = async (id: string, userId: string) => {
  const purchase = await ensurePurchaseExists(id);

  if (purchase.userId !== userId) {
    throw new AppError(
      status.FORBIDDEN,
      "You can only cancel your own purchase",
    );
  }

  if (purchase.status !== "PENDING") {
    throw new AppError(
      status.BAD_REQUEST,
      "Only pending purchases can be cancelled",
    );
  }

  const updatedPurchase = await prisma.ideaPurchase.update({
    where: { id },
    data: {
      status: "CANCELLED",
    },
    include: purchaseInclude,
  });

  return updatedPurchase;
};

const getAllTransactions = async (query: Record<string, unknown>) => {
  const queryBuilder = new QueryBuilder({
    query,
    searchableFields: ["transactionId", "provider", "failureReason", "currency"],
    filterableFields: ["status", "purchaseId", "userId", "provider", "currency"],
    sortableFields: ["createdAt", "updatedAt"],
    defaultSortBy: "createdAt",
    defaultSortOrder: "desc",
  });

  const { where, skip, take, orderBy, meta } = queryBuilder.build();

  const [data, total] = await Promise.all([
    prisma.paymentTransaction.findMany({
      where,
      skip,
      take,
      include: transactionInclude,
      orderBy,
    }),
    prisma.paymentTransaction.count({ where }),
  ]);

  return {
    meta: {
      ...meta,
      total,
      totalPage: Math.ceil(total / meta.limit),
    },
    data,
  };
};

const getSingleTransaction = async (id: string) => {
  const transaction = await prisma.paymentTransaction.findUnique({
    where: { id },
    include: transactionInclude,
  });

  if (!transaction) {
    throw new AppError(status.NOT_FOUND, "Transaction not found");
  }

  return transaction;
};

const handleStripeWebhook = async (
  rawBody: Buffer,
  signature: string | string[] | undefined,
) => StripeCheckoutService.verifyAndHandleWebhook(rawBody, signature);

export const CommerceService = {
  createIdeaCheckoutSession,
  getAllPurchases,
  getSinglePurchase,
  getMyPurchases,
  refundPurchase,
  cancelPurchase,
  getAllTransactions,
  getSingleTransaction,
  handleStripeWebhook,
};
