import { z } from "zod";

export const purchaseIdeaSchema = z
  .object({
    paymentProvider: z.string().trim().min(1, "paymentProvider is required"),
    currency: z.string().trim().optional(),
  })
  .strict();

export const refundPurchaseSchema = z
  .object({
    reason: z.string().trim().optional(),
  })
  .strict();

export const paymentWebhookSchema = z
  .object({
    purchaseId: z.string().cuid("Invalid purchaseId"),
    transactionId: z.string().trim().min(1, "transactionId is required"),
    provider: z.string().trim().min(1, "provider is required"),
    status: z.enum(["PAID", "FAILED", "REFUNDED", "CANCELLED"]),
    amount: z.number().nonnegative().optional(),
    currency: z.string().trim().optional(),
    providerPaymentId: z.string().trim().optional(),
    gatewayResponse: z.record(z.string(), z.unknown()).optional(),
    failureReason: z.string().trim().optional(),
  })
  .strict();
