import express from "express";
import { checkAuth } from "../../middlewares/checkAuth";
import { validateRequest } from "../../middlewares/validateRequest";
import { CommerceController } from "./commerce.controller";
import {
  createCheckoutSessionSchema,
  refundPurchaseSchema,
} from "./commerce.validation";

const router = express.Router();
router.use(checkAuth());

router.post(
  "/ideas/:ideaId/checkout-session",
  validateRequest(createCheckoutSessionSchema),
  CommerceController.createStripeCheckoutSession,
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

export const CommerceRoutes = router;
