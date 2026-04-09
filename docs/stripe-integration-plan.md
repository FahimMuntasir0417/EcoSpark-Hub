# Stripe Integration Plan

## Recommended approach

Use **Stripe Checkout Sessions** for the first implementation.

Why this fits the current project:

- The repo is an Express + Prisma backend with no local frontend app to host Stripe Elements.
- You already have `IdeaPurchase` and `PaymentTransaction` models in [`prisma/schema/commerce.prisma`](../prisma/schema/commerce.prisma).
- The current commerce flow already treats payment as a server-side purchase lifecycle, so Stripe Checkout is the lowest-risk path.

## Current gaps in the project

1. [`src/modules/Commerce/commerce.service.ts`](../src/modules/Commerce/commerce.service.ts) creates generic `PENDING` purchases, but it never creates a real payment session with a gateway.
2. [`src/modules/Commerce/commerce.route.ts`](../src/modules/Commerce/commerce.route.ts) exposes `/payments/webhook` as a normal JSON endpoint with Zod validation. Stripe webhooks must use the **raw request body** for signature verification.
3. [`src/app.ts`](../src/app.ts) applies `express.json()` globally before the app routes. That breaks `stripe.webhooks.constructEvent(...)` unless the webhook route is mounted with `express.raw({ type: "application/json" })` before JSON parsing touches the body.
4. [`src/config/index.ts`](../src/config/index.ts) does not yet load Stripe keys or redirect URLs.

## Draft file added

First draft service file:

- [`drafts/stripe-checkout.service.ts`](../drafts/stripe-checkout.service.ts)

What it covers:

- Creates a Stripe Checkout Session for a paid idea
- Creates the local `IdeaPurchase` record before redirecting to Stripe
- Stores `purchaseId`, `ideaId`, and `userId` in Checkout metadata
- Verifies the Stripe webhook signature
- Marks purchases as `PAID` or `FAILED`
- Creates `PaymentTransaction` rows idempotently by `transactionId`

What it does **not** wire yet:

- Route/controller registration
- Raw-body webhook mounting in `app.ts`
- Stripe dependency install
- Refund synchronization from Stripe
- Retry flow for abandoned pending checkouts

## Files to change for the real implementation

1. `package.json`
   Add the `stripe` dependency.

2. `src/config/index.ts`
   Add:
   - `STRIPE_SECRET_KEY`
   - `STRIPE_WEBHOOK_SECRET`
   - `STRIPE_PUBLISHABLE_KEY`
   - optional `STRIPE_SUCCESS_URL`
   - optional `STRIPE_CANCEL_URL`

3. `src/app.ts`
   Add a dedicated Stripe webhook route with `express.raw({ type: "application/json" })` before the global `express.json()` middleware.

4. `src/modules/Commerce/commerce.route.ts`
   Replace the generic purchase route with a Stripe-specific checkout-session route, and remove Zod validation from the Stripe webhook route.

5. `src/modules/Commerce/commerce.controller.ts`
   Add:
   - `createStripeCheckoutSession`
   - `stripeWebhook`

6. `src/modules/Commerce/commerce.service.ts`
   Either:
   - merge in the draft service logic
   - or call into a new `stripe.service.ts`

7. `src/modules/Commerce/commerce.validation.ts`
   Replace the current purchase body shape with redirect URL overrides or remove the body completely if the backend owns the success/cancel URLs.

8. `prisma/schema/commerce.prisma`
   Recommended next-step schema additions:
   - `providerCheckoutSessionId String? @unique`
   - `providerCustomerId String?`

## Implementation sequence

1. Install Stripe and expose the new env vars.
2. Add a raw Stripe webhook endpoint in `app.ts`.
3. Add `POST /api/v1/commerce/ideas/:ideaId/checkout-session`.
4. Create a local purchase record before creating the Stripe Checkout Session.
5. Redirect the frontend to `session.url`.
6. On `checkout.session.completed` and `checkout.session.async_payment_succeeded`, mark the purchase as `PAID`.
7. On `checkout.session.async_payment_failed`, mark the purchase as `FAILED`.
8. Add refund support by calling Stripe refunds first, then reconciling the local purchase and transaction records.
9. Add a small success-page status endpoint so the frontend can confirm the purchase after redirect.

## Notes on retries and idempotency

- Stripe recommends creating a new Checkout Session for each payment attempt.
- Your current schema can support a first implementation, but it is better to store `providerCheckoutSessionId` so you can safely expire or replace abandoned sessions.
- Transaction idempotency should be tied to Stripe IDs such as `payment_intent` or `refund.id`, not random local timestamps.

## Test checklist

1. Create checkout session for a `PAID` idea.
2. Confirm the user is redirected to Stripe Checkout.
3. Complete a successful test payment.
4. Confirm the webhook updates `IdeaPurchase.status` to `PAID`.
5. Confirm a single `PaymentTransaction` row is created.
6. Retry webhook delivery and verify no duplicate transaction is inserted.
7. Test a failed or cancelled checkout path.
8. Test refund flow after the payment path is stable.

## Official Stripe references

- Checkout Sessions API: https://docs.stripe.com/api/checkout/sessions
- Metadata: https://docs.stripe.com/metadata
- Webhook signature verification: https://docs.stripe.com/webhooks/signature
- Refund API: https://docs.stripe.com/api/refunds/create
