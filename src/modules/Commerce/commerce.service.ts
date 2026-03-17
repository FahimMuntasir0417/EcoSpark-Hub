import status from "http-status";
import AppError from "../../errors/AppError";
import { prisma } from "../../lib/prisma";
import {
  IPaymentWebhookPayload,
  IPurchaseIdeaPayload,
  IRefundPurchasePayload,
} from "./commerce.interface";

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

const purchaseIdea = async (
  ideaId: string,
  userId: string,
  payload: IPurchaseIdeaPayload,
) => {
  const idea = await prisma.idea.findUnique({
    where: { id: ideaId },
  });

  if (!idea || idea.deletedAt) {
    throw new AppError(status.NOT_FOUND, "Idea not found");
  }

  if (idea.accessType !== "PAID") {
    throw new AppError(status.BAD_REQUEST, "Only paid ideas can be purchased");
  }

  if (!idea.price || Number(idea.price) <= 0) {
    throw new AppError(
      status.BAD_REQUEST,
      "Idea price is invalid for purchase",
    );
  }

  const existingActivePurchase = await prisma.ideaPurchase.findFirst({
    where: {
      ideaId,
      userId,
      status: {
        in: ["PENDING", "PAID"],
      },
    },
  });

  if (existingActivePurchase) {
    throw new AppError(
      status.CONFLICT,
      "An active purchase already exists for this idea",
    );
  }

  const purchase = await prisma.ideaPurchase.create({
    data: {
      ideaId,
      userId,
      amount: idea.price,
      currency: payload.currency ?? idea.currency,
      paymentProvider: payload.paymentProvider,
      status: "PENDING",
    },
    include: purchaseInclude,
  });

  return purchase;
};

const getAllPurchases = async () => {
  return prisma.ideaPurchase.findMany({
    include: purchaseInclude,
    orderBy: {
      createdAt: "desc",
    },
  });
};

const getSinglePurchase = async (id: string) => {
  const purchase = await prisma.ideaPurchase.findUnique({
    where: { id },
    include: purchaseInclude,
  });

  if (!purchase) {
    throw new AppError(status.NOT_FOUND, "Purchase not found");
  }

  return purchase;
};

const getMyPurchases = async (userId: string) => {
  return prisma.ideaPurchase.findMany({
    where: { userId },
    include: purchaseInclude,
    orderBy: {
      createdAt: "desc",
    },
  });
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

const getAllTransactions = async () => {
  return prisma.paymentTransaction.findMany({
    include: transactionInclude,
    orderBy: {
      createdAt: "desc",
    },
  });
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

const paymentWebhook = async (payload: IPaymentWebhookPayload) => {
  const purchase = await prisma.ideaPurchase.findUnique({
    where: { id: payload.purchaseId },
  });

  if (!purchase) {
    throw new AppError(status.NOT_FOUND, "Purchase not found");
  }

  const existingTransaction = await prisma.paymentTransaction.findUnique({
    where: {
      transactionId: payload.transactionId,
    },
  });

  if (existingTransaction) {
    return existingTransaction;
  }

  const result = await prisma.$transaction(async (tx) => {
    const transaction = await tx.paymentTransaction.create({
      data: {
        purchaseId: purchase.id,
        userId: purchase.userId,
        amount: payload.amount ?? purchase.amount,
        currency: payload.currency ?? purchase.currency,
        provider: payload.provider,
        transactionId: payload.transactionId,
        status: payload.status,
        gatewayResponse: payload.gatewayResponse,
        failureReason: payload.failureReason,
      },
      include: transactionInclude,
    });

    await tx.ideaPurchase.update({
      where: { id: purchase.id },
      data: {
        status: payload.status,
        paidAt: payload.status === "PAID" ? new Date() : purchase.paidAt,
        refundedAt:
          payload.status === "REFUNDED" ? new Date() : purchase.refundedAt,
        providerPaymentId:
          payload.providerPaymentId ?? purchase.providerPaymentId,
      },
    });

    return transaction;
  });

  return result;
};

export const CommerceService = {
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
