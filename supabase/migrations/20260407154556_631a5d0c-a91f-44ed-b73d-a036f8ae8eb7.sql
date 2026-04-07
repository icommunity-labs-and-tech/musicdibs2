
-- =============================================
-- PHASE 1: New tables for orders, campaigns, attribution
-- =============================================

-- 1) orders table — canonical reporting for all purchases
CREATE TABLE IF NOT EXISTS public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  stripe_checkout_session_id text NULL,
  stripe_invoice_id text NULL,
  stripe_payment_intent_id text NULL,
  stripe_charge_id text NULL,
  stripe_subscription_id text NULL,
  order_source text NULL DEFAULT 'stripe',
  order_status text NOT NULL DEFAULT 'paid',
  product_type text NOT NULL,
  product_code text NULL,
  product_label text NULL,
  billing_interval text NULL,
  quantity integer NOT NULL DEFAULT 1,
  amount_gross numeric(12,2) NOT NULL DEFAULT 0,
  amount_net numeric(12,2) NULL,
  currency text NOT NULL DEFAULT 'eur',
  is_subscription boolean NOT NULL DEFAULT false,
  is_renewal boolean NOT NULL DEFAULT false,
  is_first_purchase boolean NOT NULL DEFAULT false,
  coupon_code text NULL,
  promotion_code text NULL,
  campaign_id uuid NULL,
  attributed_campaign_name text NULL,
  utm_source text NULL,
  utm_medium text NULL,
  utm_campaign text NULL,
  utm_content text NULL,
  utm_term text NULL,
  referrer text NULL,
  landing_path text NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  paid_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_paid_at ON public.orders(paid_at);
CREATE INDEX IF NOT EXISTS idx_orders_product_type ON public.orders(product_type);
CREATE INDEX IF NOT EXISTS idx_orders_product_code ON public.orders(product_code);
CREATE INDEX IF NOT EXISTS idx_orders_is_renewal ON public.orders(is_renewal);
CREATE INDEX IF NOT EXISTS idx_orders_coupon_code ON public.orders(coupon_code);
CREATE INDEX IF NOT EXISTS idx_orders_promotion_code ON public.orders(promotion_code);
CREATE INDEX IF NOT EXISTS idx_orders_attributed_campaign ON public.orders(attributed_campaign_name);
CREATE INDEX IF NOT EXISTS idx_orders_utm_campaign ON public.orders(utm_campaign);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access orders"
  ON public.orders FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "Admins can read all orders"
  ON public.orders FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 2) marketing_campaigns table
CREATE TABLE IF NOT EXISTS public.marketing_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  type text NULL,
  owner text NULL,
  cost numeric(12,2) NOT NULL DEFAULT 0,
  start_date date NULL,
  end_date date NULL,
  coupon_code text NULL,
  utm_source text NULL,
  utm_medium text NULL,
  utm_campaign text NULL,
  notes text NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.marketing_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access marketing_campaigns"
  ON public.marketing_campaigns FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "Admins can manage marketing_campaigns"
  ON public.marketing_campaigns FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- 3) user_attribution table (first-touch)
CREATE TABLE IF NOT EXISTS public.user_attribution (
  user_id uuid PRIMARY KEY,
  first_source text NULL,
  first_medium text NULL,
  first_campaign text NULL,
  first_content text NULL,
  first_term text NULL,
  first_referrer text NULL,
  first_landing_path text NULL,
  first_coupon_seen text NULL,
  attributed_campaign_name text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_attribution ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access user_attribution"
  ON public.user_attribution FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "Users can insert own attribution"
  ON public.user_attribution FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can read own attribution"
  ON public.user_attribution FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can read all attribution"
  ON public.user_attribution FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 4) order_attribution table
CREATE TABLE IF NOT EXISTS public.order_attribution (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  campaign_id uuid NULL REFERENCES public.marketing_campaigns(id),
  attribution_model text NOT NULL DEFAULT 'first_touch',
  attributed_campaign_name text NULL,
  source text NULL,
  medium text NULL,
  campaign text NULL,
  content text NULL,
  coupon_code text NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_order_attribution_order_id ON public.order_attribution(order_id);
CREATE INDEX IF NOT EXISTS idx_order_attribution_campaign_id ON public.order_attribution(campaign_id);

ALTER TABLE public.order_attribution ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access order_attribution"
  ON public.order_attribution FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "Admins can read order_attribution"
  ON public.order_attribution FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));
