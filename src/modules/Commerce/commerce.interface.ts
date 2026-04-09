export interface ICreateCheckoutSessionPayload {
  successUrl?: string;
  cancelUrl?: string;
}

export interface IRefundPurchasePayload {
  reason?: string;
}
