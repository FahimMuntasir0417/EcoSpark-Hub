import status from "http-status";
import { Prisma } from "../../generated/prisma/client";
import Stripe from "stripe";
import { envVars } from "../../config";
import AppError from "../../errors/AppError";
import { prisma } from "../../lib/prisma";
import { ICreateCheckoutSessionPayload } from "./commerce.interface";

const stripe = Stripe(envVars.STRIPE_SECRET_KEY);
type CheckoutSession = Awaited<
  ReturnType<typeof stripe.checkout.sessions.create>
>;

const toMinorUnit = (amount: number) => Math.round(amount * 100);

const toJson = (value: unknown) =>
  JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;

const buildSuccessUrl = (purchaseId: string, override?: string) => {
  const url = new URL(
    override ?? envVars.STRIPE_SUCCESS_URL ?? `${envVars.FRONTEND_URL}/payments/success`,
  );

  url.searchParams.set("purchaseId", purchaseId);
  url.searchParams.set("session_id", "{CHECKOUT_SESSION_ID}");

  return url.toString();
};

const buildCancelUrl = (ideaId: string, override?: string) => {
  if (override) {
    return override;
  }

  if (envVars.STRIPE_CANCEL_URL) {
    const url = new URL(envVars.STRIPE_CANCEL_URL);
    url.searchParams.set("checkout", "cancelled");
    url.searchParams.set("ideaId", ideaId);

    return url.toString();
  }

  return `${envVars.FRONTEND_URL}/ideas/${ideaId}?checkout=cancelled`;
};

const ensureIdeaCanBePurchased = async (ideaId: string) => {
  const idea = await prisma.idea.findUnique({
    where: { id: ideaId },
    select: {
      id: true,
      title: true,
      slug: true,
      accessType: true,
      price: true,
      currency: true,
      deletedAt: true,
    },
  });

  if (!idea || idea.deletedAt) {
    throw new AppError(status.NOT_FOUND, "Idea not found");
  }

  if (idea.accessType !== "PAID") {
    throw new AppError(status.BAD_REQUEST, "Only paid ideas can be purchased");
  }

  if (!idea.price || Number(idea.price) <= 0) {
    throw new AppError(status.BAD_REQUEST, "Idea price is invalid for purchase");
  }

  return idea;
};

const ensureCustomerCanPurchase = async (ideaId: string, userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
    },
  });

  if (!user) {
    throw new AppError(status.NOT_FOUND, "User not found");
  }

  const paidPurchase = await prisma.ideaPurchase.findFirst({
    where: {
      ideaId,
      userId,
      status: "PAID",
    },
    select: {
      id: true,
    },
  });

  if (paidPurchase) {
    throw new AppError(status.CONFLICT, "You already purchased this idea");
  }

  const pendingStripePurchase = await prisma.ideaPurchase.findFirst({
    where: {
      ideaId,
      userId,
      status: "PENDING",
      paymentProvider: "STRIPE",
    },
    select: {
      id: true,
    },
  });

  if (pendingStripePurchase) {
    throw new AppError(
      status.CONFLICT,
      "A pending Stripe checkout already exists for this idea",
    );
  }

  return user;
};

const markPurchasePaidFromCheckoutSession = async (
  session: CheckoutSession,
) => {
  const purchaseId = session.metadata?.purchaseId;

  if (!purchaseId) {
    return {
      ignored: true,
      reason: "Checkout session metadata does not include purchaseId",
    };
  }

  const purchase = await prisma.ideaPurchase.findUnique({
    where: { id: purchaseId },
  });

  if (!purchase) {
    throw new AppError(status.NOT_FOUND, "Purchase not found for webhook");
  }

  const providerPaymentId =
    typeof session.payment_intent === "string" ? session.payment_intent : null;
  const transactionId = providerPaymentId ?? session.id;
  const amount = Number((session.amount_total ?? 0) / 100);
  const currency = (session.currency ?? purchase.currency).toUpperCase();

  return prisma.$transaction(async (tx) => {
    const existingTransaction = await tx.paymentTransaction.findUnique({
      where: { transactionId },
    });

    if (!existingTransaction) {
      await tx.paymentTransaction.create({
        data: {
          purchaseId: purchase.id,
          userId: purchase.userId,
          amount,
          currency,
          provider: "STRIPE",
          transactionId,
          status: "PAID",
          gatewayResponse: toJson(session),
        },
      });
    }

    const updatedPurchase = await tx.ideaPurchase.update({
      where: { id: purchase.id },
      data: {
        status: "PAID",
        paidAt: purchase.paidAt ?? new Date(),
        providerPaymentId: providerPaymentId ?? purchase.providerPaymentId,
      },
    });

    return {
      ignored: false,
      status: updatedPurchase.status,
      purchaseId: updatedPurchase.id,
      transactionId,
    };
  });
};

const markPurchaseFailedFromCheckoutSession = async (
  session: CheckoutSession,
) => {
  const purchaseId = session.metadata?.purchaseId;

  if (!purchaseId) {
    return {
      ignored: true,
      reason: "Checkout session metadata does not include purchaseId",
    };
  }

  const purchase = await prisma.ideaPurchase.findUnique({
    where: { id: purchaseId },
  });

  if (!purchase) {
    throw new AppError(status.NOT_FOUND, "Purchase not found for webhook");
  }

  const transactionId = `failed_${session.id}`;

  return prisma.$transaction(async (tx) => {
    const existingTransaction = await tx.paymentTransaction.findUnique({
      where: { transactionId },
    });

    if (!existingTransaction) {
      await tx.paymentTransaction.create({
        data: {
          purchaseId: purchase.id,
          userId: purchase.userId,
          amount: Number((session.amount_total ?? 0) / 100),
          currency: (session.currency ?? purchase.currency).toUpperCase(),
          provider: "STRIPE",
          transactionId,
          status: "FAILED",
          gatewayResponse: toJson(session),
          failureReason: "Stripe checkout payment failed",
        },
      });
    }

    const updatedPurchase = await tx.ideaPurchase.update({
      where: { id: purchase.id },
      data: {
        status: "FAILED",
      },
    });

    return {
      ignored: false,
      status: updatedPurchase.status,
      purchaseId: updatedPurchase.id,
      transactionId,
    };
  });
};

const createIdeaCheckoutSession = async (
  ideaId: string,
  userId: string,
  payload: ICreateCheckoutSessionPayload,
) => {
  const idea = await ensureIdeaCanBePurchased(ideaId);
  const user = await ensureCustomerCanPurchase(ideaId, userId);

  const purchase = await prisma.ideaPurchase.create({
    data: {
      ideaId: idea.id,
      userId: user.id,
      amount: idea.price!,
      currency: idea.currency.toUpperCase(),
      paymentProvider: "STRIPE",
      status: "PENDING",
    },
  });

  let session: CheckoutSession;

  try {
    session = await stripe.checkout.sessions.create({
      mode: "payment",
      success_url: buildSuccessUrl(purchase.id, payload.successUrl),
      cancel_url: buildCancelUrl(idea.id, payload.cancelUrl),
      client_reference_id: purchase.id,
      customer_email: user.email,
      submit_type: "pay",
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: idea.currency.toLowerCase(),
            unit_amount: toMinorUnit(Number(idea.price)),
            product_data: {
              name: idea.title,
              description: `Paid access for idea ${idea.slug}`,
            },
          },
        },
      ],
      metadata: {
        purchaseId: purchase.id,
        ideaId: idea.id,
        userId: user.id,
      },
      payment_intent_data: {
        metadata: {
          purchaseId: purchase.id,
          ideaId: idea.id,
          userId: user.id,
        },
      },
    });
  } catch (error) {
    await prisma.ideaPurchase.update({
      where: { id: purchase.id },
      data: {
        status: "FAILED",
      },
    });

    throw error;
  }

  if (!session.url) {
    await prisma.ideaPurchase.update({
      where: { id: purchase.id },
      data: {
        status: "FAILED",
      },
    });

    throw new AppError(status.BAD_GATEWAY, "Stripe did not return a checkout URL");
  }

  return {
    purchaseId: purchase.id,
    checkoutUrl: session.url,
    sessionId: session.id,
    publishableKey: envVars.STRIPE_PUBLISHABLE_KEY ?? null,
  };
};

const verifyAndHandleWebhook = async (
  rawBody: Buffer,
  signature: string | string[] | undefined,
) => {
  if (!signature || Array.isArray(signature)) {
    throw new AppError(status.BAD_REQUEST, "Missing Stripe signature header");
  }

  const event = stripe.webhooks.constructEvent(
    rawBody,
    signature,
    envVars.STRIPE_WEBHOOK_SECRET,
  );

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as CheckoutSession;

      if (session.payment_status !== "paid") {
        return {
          received: true,
          ignored: true,
          eventType: event.type,
          reason: "Checkout completed, but payment is not settled yet",
        };
      }

      return {
        received: true,
        eventType: event.type,
        result: await markPurchasePaidFromCheckoutSession(session),
      };
    }

    case "checkout.session.async_payment_succeeded": {
      const session = event.data.object as CheckoutSession;

      return {
        received: true,
        eventType: event.type,
        result: await markPurchasePaidFromCheckoutSession(session),
      };
    }

    case "checkout.session.async_payment_failed": {
      const session = event.data.object as CheckoutSession;

      return {
        received: true,
        eventType: event.type,
        result: await markPurchaseFailedFromCheckoutSession(session),
      };
    }

    default:
      return {
        received: true,
        ignored: true,
        eventType: event.type,
      };
  }
};

export const StripeCheckoutService = {
  createIdeaCheckoutSession,
  verifyAndHandleWebhook,
};
