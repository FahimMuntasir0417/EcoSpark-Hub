import status from "http-status";
import Stripe from "stripe";
import type { Prisma } from "../src/generated/prisma/client";
import AppError from "../src/errors/AppError";
import { prisma } from "../src/lib/prisma";

/*
  Draft only.
  Move this into src/modules/Commerce/stripe.service.ts after:
  1. installing the stripe package
  2. adding Stripe env vars to src/config/index.ts
  3. wiring a raw-body webhook route before express.json()
*/

const requireEnv = (name: string) => {
  const value = process.env[name];

  if (!value) {
    throw new AppError(
      status.INTERNAL_SERVER_ERROR,
      `Missing required environment variable: ${name}`,
    );
  }

  return value;
};

const stripe = new Stripe(requireEnv("STRIPE_SECRET_KEY"));

const FRONTEND_URL = requireEnv("FRONTEND_URL");
const STRIPE_WEBHOOK_SECRET = requireEnv("STRIPE_WEBHOOK_SECRET");

interface CreateIdeaCheckoutSessionInput {
  ideaId: string;
  userId: string;
  successUrl?: string;
  cancelUrl?: string;
}

const toMinorUnit = (amount: number) => Math.round(amount * 100);

const toJson = (value: unknown) =>
  JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;

const buildDefaultSuccessUrl = (purchaseId: string) =>
  `${FRONTEND_URL}/payments/success?purchaseId=${purchaseId}&session_id={CHECKOUT_SESSION_ID}`;

const buildDefaultCancelUrl = (ideaId: string) =>
  `${FRONTEND_URL}/ideas/${ideaId}?checkout=cancelled`;

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
      name: true,
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
    throw new AppError(
      status.CONFLICT,
      "You already purchased this idea",
    );
  }

  const pendingPurchase = await prisma.ideaPurchase.findFirst({
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

  if (pendingPurchase) {
    throw new AppError(
      status.CONFLICT,
      "A pending Stripe checkout already exists for this idea",
    );
  }

  return user;
};

const markPurchasePaidFromCheckoutSession = async (
  session: Stripe.Checkout.Session,
) => {
  const purchaseId = session.metadata?.purchaseId;

  if (!purchaseId) {
    return {
      ignored: true,
      reason: "checkout session metadata does not include purchaseId",
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
  session: Stripe.Checkout.Session,
) => {
  const purchaseId = session.metadata?.purchaseId;

  if (!purchaseId) {
    return {
      ignored: true,
      reason: "checkout session metadata does not include purchaseId",
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

export const StripeCheckoutDraftService = {
  async createIdeaCheckoutSession(input: CreateIdeaCheckoutSessionInput) {
    const idea = await ensureIdeaCanBePurchased(input.ideaId);
    const user = await ensureCustomerCanPurchase(input.ideaId, input.userId);

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

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      success_url: input.successUrl ?? buildDefaultSuccessUrl(purchase.id),
      cancel_url: input.cancelUrl ?? buildDefaultCancelUrl(idea.id),
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

    if (!session.url) {
      throw new AppError(
        status.BAD_GATEWAY,
        "Stripe did not return a checkout URL",
      );
    }

    return {
      purchaseId: purchase.id,
      checkoutUrl: session.url,
      sessionId: session.id,
      publishableKeyHint: "Return your Stripe publishable key from a public config endpoint if needed.",
    };
  },

  async verifyAndHandleWebhook(rawBody: Buffer | string, signature: string) {
    const event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      STRIPE_WEBHOOK_SECRET,
    );

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;

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
        const session = event.data.object as Stripe.Checkout.Session;

        return {
          received: true,
          eventType: event.type,
          result: await markPurchasePaidFromCheckoutSession(session),
        };
      }

      case "checkout.session.async_payment_failed": {
        const session = event.data.object as Stripe.Checkout.Session;

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
  },
};
