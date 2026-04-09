const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:5000/api/v1";

export interface CreateCheckoutSessionResponse {
  success: boolean;
  message: string;
  data?: {
    purchaseId: string;
    checkoutUrl: string;
    sessionId: string;
  };
}

export interface PurchaseStatusResponse {
  success: boolean;
  message: string;
  data?: {
    id: string;
    status: "PENDING" | "PAID" | "FAILED" | "REFUNDED" | "CANCELLED";
    paidAt?: string | null;
    idea?: {
      id: string;
      title: string;
      slug: string;
    };
  };
}

export const createIdeaCheckoutSession = async (ideaId: string) => {
  const response = await fetch(
    `${API_BASE_URL}/commerce/ideas/${ideaId}/checkout-session`,
    {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}),
    },
  );

  const result =
    (await response.json().catch(() => null)) as CreateCheckoutSessionResponse | null;

  if (!response.ok || !result?.data?.checkoutUrl) {
    throw new Error(result?.message ?? "Failed to create checkout session");
  }

  return result.data;
};

export const getPurchaseStatus = async (purchaseId: string) => {
  const response = await fetch(`${API_BASE_URL}/commerce/purchases/${purchaseId}`, {
    method: "GET",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
  });

  const result =
    (await response.json().catch(() => null)) as PurchaseStatusResponse | null;

  if (!response.ok || !result?.data) {
    throw new Error(result?.message ?? "Failed to fetch purchase status");
  }

  return result.data;
};
