/* TokPulse — © Hardonia. MIT. */
# Billing (Stripe) — stub
- Use Stripe Checkout + Customer Portal for self-serve upgrades.
- Webhook: receive `checkout.session.completed` and `customer.subscription.updated`.
- On success, write `private/license.json` with `{ license:'pro', pro:true, features:[...], expires:'...' }`.
- Verify signatures with Stripe SDK and `STRIPE_WEBHOOK_SECRET`.
