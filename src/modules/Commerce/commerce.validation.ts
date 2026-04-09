import { z } from "zod";

export const createCheckoutSessionSchema = z
  .object({
    successUrl: z.string().trim().url().optional(),
    cancelUrl: z.string().trim().url().optional(),
  })
  .strict();

export const refundPurchaseSchema = z
  .object({
    reason: z.string().trim().optional(),
  })
  .strict();
