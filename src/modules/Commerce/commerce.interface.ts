export interface IPurchaseIdeaPayload {
  paymentProvider: string;
  currency?: string;
}

export interface IRefundPurchasePayload {
  reason?: string;
}

export interface IPaymentWebhookPayload {
  purchaseId: string;
  transactionId: string;
  provider: string;
  status: "PAID" | "FAILED" | "REFUNDED" | "CANCELLED";
  amount?: number;
  currency?: string;
  providerPaymentId?: string;
  gatewayResponse?: Record<string, unknown>;
  failureReason?: string;
}
