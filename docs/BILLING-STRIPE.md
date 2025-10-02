# Billing (Stripe) — stub
- Use Stripe Checkout + Customer Portal for self-serve upgrades.
- Webhook: add an endpoint to receive `checkout.session.completed` and `customer.subscription.updated` events.
- On success, write `private/license.json` with `{ license:'pro', pro:true, features:[...], expires:'...' }`.
- Verify signatures with Stripe libraries and `STRIPE_WEBHOOK_SECRET`.
