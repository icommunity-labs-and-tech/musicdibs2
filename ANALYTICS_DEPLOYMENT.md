# MusicDibs Analytics — Technical Architecture & Deployment Guide

> Last updated: 2026-04-07

---

## 1. Architecture Overview

### Core Tables

| Table | Purpose |
|---|---|
| `orders` | Canonical record of every purchase (checkout, renewal, backfill) |
| `order_attribution` | Per-order attribution data (UTM, campaign, coupon) |
| `user_attribution` | First-touch attribution saved at signup |
| `marketing_campaigns` | Campaign catalog (name, UTM, cost, dates) |
| `marketing_metrics` | Manual monthly inputs (ad spend, COGS, burn, cash) |
| `profiles` | User profile with credits, plan, stripe_customer_id |
| `credit_transactions` | Ledger of all credit movements |

### Key Indexes on `orders`

| Index | Type | Purpose |
|---|---|---|
| `idx_orders_unique_checkout_session` | UNIQUE partial (WHERE NOT NULL) | Prevent duplicate checkout orders |
| `idx_orders_unique_invoice_id` | UNIQUE partial (WHERE NOT NULL AND NOT renewal) | Prevent duplicate invoice orders |
| `idx_orders_unique_charge_id` | UNIQUE partial (WHERE NOT NULL) | Prevent duplicate charge orders |
| `idx_orders_user_id` | B-tree | Fast user lookup |
| `idx_orders_paid_at` | B-tree | Time-range queries |
| `idx_orders_product_type` | B-tree | Product filtering |
| `idx_orders_campaign_id` | B-tree partial | Campaign joins |

---

## 2. Data Flows

### 2.1 Attribution → Checkout → Webhook → Orders

```
1. User lands with UTMs → captureAttribution() → localStorage (30-day TTL)
2. User registers → attribution saved to `user_attribution` table
3. User buys → create-credit-checkout sends attribution as Stripe metadata
4. Stripe fires checkout.session.completed → stripe-webhook:
   a. Credits added to profile
   b. Order created in `orders` with UTM/coupon from session metadata
   c. `order_attribution` record created
   d. Campaign matched by utm_campaign or coupon_code
   e. Emails enqueued (purchase confirmation, team notification)
5. Renewals: invoice.payment_succeeded (billing_reason=subscription_cycle)
   → Credits reset, renewal order created with is_renewal=true
```

### 2.2 Backfill Flow

```
Admin panel → adminApi.backfillOrdersFromStripe(dry_run, limit)
  → admin-action (action: backfill_orders_from_stripe)
    → Fetches Stripe invoices + charges (paginated)
    → Deduplicates: skips if stripe_invoice_id or stripe_charge_id exists
    → Resolves user: stripe_customer_id → profiles, fallback email → auth.users
    → Classifies product_type from price_id map, else "legacy_unknown"
    → Sets is_first_purchase by chronological order of paid_at per user
    → Metadata includes: backfill=true, backfill_source, resolved_user_via
    → Returns summary: { inserted, skipped, errors, by_source, by_resolution }
```

### 2.3 Admin Metrics

```
AdminMetricsPage → get_saas_metrics action:
  - Stripe API: active subs → MRR, ARR, plan breakdown, churn
  - Orders table: revenue by product type, AOV, customer counts
  - Profiles: user counts, plan distribution
  - credit_transactions: usage metrics
  - marketing_metrics: manual inputs (ad spend, COGS)
  - Computed: CAC, LTV, ARPU, NRR, Quick Ratio, Payback Period

AdminCampaignMetricsPage → get_campaign_metrics + get_campaign_detail:
  - Joins orders with marketing_campaigns
  - Groups by attributed_campaign_name
  - Normalizes null/empty/unattributed → "Sin atribución"
```

---

## 3. Historical Data Limitations

- **Revenue data** (amount, date, product type): Reasonably complete via backfill from Stripe charges/invoices.
- **Attribution data** (UTMs, campaign, coupon): Only available for orders created after the attribution system was deployed. Historical backfilled orders have `utm_*` fields as NULL.
- **"Sin atribución" label**: Applied in the UI via `normalizeAttribution()` for any null/empty/unattributed campaign values.
- **is_first_purchase**: Computed at backfill time using chronological ordering of all charges per user.

---

## 4. RLS Security Matrix

| Table | Admin Read | Admin Write | Service Role | User |
|---|---|---|---|---|
| `orders` | ✅ SELECT | ❌ | ✅ ALL | ❌ |
| `order_attribution` | ✅ SELECT | ❌ | ✅ ALL | ❌ |
| `user_attribution` | ✅ SELECT | ❌ | ✅ ALL | INSERT own, SELECT own |
| `marketing_campaigns` | ✅ ALL | ✅ ALL | ✅ ALL | ❌ |
| `marketing_metrics` | ✅ ALL | ✅ ALL | ✅ ALL | ❌ |
| `audit_log` | ✅ SELECT | ❌ | ✅ INSERT | ❌ |
| `profiles` | via user_id | ❌ | ✅ (implicit) | Own profile only |

---

## 5. Edge Functions — Analytics Critical Path

| Function | Role | Key Dependencies |
|---|---|---|
| `create-credit-checkout` | Creates Stripe checkout with attribution metadata | STRIPE_SECRET_KEY |
| `stripe-webhook` | Processes payments, creates orders, resets credits | STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET |
| `admin-action` | All admin operations including metrics, backfill | STRIPE_SECRET_KEY (for metrics) |
| `check-subscription` | Verifies active subscription status | STRIPE_SECRET_KEY |
| `customer-portal` | Stripe billing portal session | STRIPE_SECRET_KEY |

### Environment Variables / Secrets Required

| Secret | Used By |
|---|---|
| `STRIPE_SECRET_KEY` | checkout, webhook, admin-action, check-subscription, customer-portal |
| `STRIPE_WEBHOOK_SECRET` | stripe-webhook (signature validation) |
| `SUPABASE_URL` | All functions |
| `SUPABASE_ANON_KEY` | All functions (user auth) |
| `SUPABASE_SERVICE_ROLE_KEY` | webhook, admin-action (privileged ops) |
| `RESEND_API_KEY` | Email sending (process-email-queue) |
| `MAILERLITE_API_KEY` | Marketing automation sync |

---

## 6. Migration to External Supabase

### Pre-Migration Checklist

- [ ] All 72 migrations in `supabase/migrations/` applied in order
- [ ] Edge functions deployed (54 functions in `supabase/functions/`)
- [ ] All secrets configured (see table above)
- [ ] Stripe webhook endpoint updated to new Supabase URL
- [ ] `supabase/config.toml` applied (verify_jwt settings)
- [ ] Storage buckets created (14 buckets, see config)
- [ ] Database functions created (handle_new_user, has_role, decrement_credits, etc.)
- [ ] Database triggers recreated (handle_new_user on auth.users, MailerLite sync triggers)
- [ ] PGMQ extension enabled (for email queue)
- [ ] Vault secrets configured (email_queue_service_role_key)

### Post-Migration Validation

- [ ] Auth flow works (signup, login, password reset)
- [ ] Profile creation trigger fires on new signup
- [ ] Stripe checkout creates session correctly
- [ ] Stripe webhook receives and processes events
- [ ] Credits are added on successful payment
- [ ] Renewal credits reset correctly
- [ ] Admin panel loads metrics
- [ ] Campaign attribution flows through correctly

---

## 7. QA Checklist — Pre-Production

### Payment Flows

| Test | Expected Result |
|---|---|
| **New purchase (monthly)** | Checkout → credits added → order created → email sent |
| **New purchase (annual)** | Checkout → credits added → plan=Annual → distribution email |
| **Individual credit** | One-time payment → +1 credit → order with product_type=single |
| **Top-up (with active sub)** | Payment → credits added → order with product_type=topup |
| **Top-up (no sub)** | Error: "Top-ups require an active subscription" |
| **Subscription renewal** | invoice.payment_succeeded → credits reset → renewal order |
| **Payment failure** | invoice.payment_failed → failure email to user + admin |
| **Cancellation** | subscription.deleted → plan reset to Free → MailerLite sync |
| **Upgrade/downgrade** | Plan switch → proration → credits updated |

### Attribution Flows

| Test | Expected Result |
|---|---|
| **UTM landing → purchase** | UTMs in localStorage → sent to checkout → stored in order |
| **Coupon purchase** | coupon_code in order + matched to campaign if exists |
| **No attribution purchase** | order created with null UTMs, shows as "Sin atribución" |
| **Campaign detail view** | Shows orders grouped by campaign, ROI calculated |

### Admin Panel

| Test | Expected Result |
|---|---|
| **Metrics page loads** | KPIs, charts, Stripe data displayed |
| **Campaign page loads** | Campaign list with metrics, "Sin atribución" normalized |
| **Period filter (week/month/year)** | Data scoped correctly |
| **CSV export** | Downloads valid CSV for each dataset |
| **Backfill (dry run)** | Returns summary without inserting |
| **Backfill (real)** | Idempotent, skips existing, correct product types |

### Security

| Test | Expected Result |
|---|---|
| **Non-admin accesses admin API** | 403 Forbidden |
| **Webhook without signature** | 400 Bad Request |
| **User tries to modify credits** | RLS blocks update |
| **Duplicate webhook event** | Unique index prevents double order |

---

## 8. Files Reference

### Frontend (Analytics)
- `src/pages/AdminMetricsPage.tsx` — SaaS metrics dashboard
- `src/pages/AdminCampaignMetricsPage.tsx` — Campaign analytics
- `src/components/admin/metrics/` — KPI grid, charts, forms
- `src/components/admin/HistoricalDataNotice.tsx` — Data quality notice + normalizeAttribution()
- `src/services/adminApi.ts` — Admin API client
- `src/lib/attribution.ts` — Client-side UTM capture

### Backend (Edge Functions)
- `supabase/functions/create-credit-checkout/` — Checkout session creation
- `supabase/functions/stripe-webhook/` — Payment event processing
- `supabase/functions/admin-action/` — All admin operations (1930 lines)

### Database
- 72 migrations in `supabase/migrations/`
- Key tables: orders, order_attribution, user_attribution, marketing_campaigns
