
-- Unique partial indexes to prevent duplicate orders from webhooks or backfill
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_unique_checkout_session
  ON public.orders (stripe_checkout_session_id)
  WHERE stripe_checkout_session_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_unique_invoice_id
  ON public.orders (stripe_invoice_id)
  WHERE stripe_invoice_id IS NOT NULL AND is_renewal = false;

CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_unique_charge_id
  ON public.orders (stripe_charge_id)
  WHERE stripe_charge_id IS NOT NULL;

-- Index for faster campaign metrics lookups
CREATE INDEX IF NOT EXISTS idx_orders_campaign_id ON public.orders (campaign_id) WHERE campaign_id IS NOT NULL;

-- Index on order_attribution for campaign analysis
CREATE INDEX IF NOT EXISTS idx_order_attribution_attributed_name ON public.order_attribution (attributed_campaign_name);
