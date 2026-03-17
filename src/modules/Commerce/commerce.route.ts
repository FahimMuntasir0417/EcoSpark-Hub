import express from "express";
import { validateRequest } from "../../middlewares/validateRequest";
import { CommerceController } from "./commerce.controller";
import {
  paymentWebhookSchema,
  purchaseIdeaSchema,
  refundPurchaseSchema,
} from "./commerce.validation";

const router = express.Router();

router.post(
  "/ideas/:ideaId/purchase",
  validateRequest(purchaseIdeaSchema),
  CommerceController.purchaseIdea,
);

router.get("/purchases", CommerceController.getAllPurchases);
router.get("/purchases/:id", CommerceController.getSinglePurchase);
router.get("/users/me/purchases", CommerceController.getMyPurchases);

router.patch(
  "/purchases/:id/refund",
  validateRequest(refundPurchaseSchema),
  CommerceController.refundPurchase,
);

router.patch("/purchases/:id/cancel", CommerceController.cancelPurchase);

router.get("/transactions", CommerceController.getAllTransactions);
router.get("/transactions/:id", CommerceController.getSingleTransaction);

router.post(
  "/payments/webhook",
  validateRequest(paymentWebhookSchema),
  CommerceController.paymentWebhook,
);

export const CommerceRoutes = router;
