
-- Drop existing policies
DROP POLICY IF EXISTS "Anyone can read active operation pricing" ON public.operation_pricing;
DROP POLICY IF EXISTS "Admins can manage operation pricing" ON public.operation_pricing;
DROP POLICY IF EXISTS "Service role full access operation_pricing" ON public.operation_pricing;

-- Drop trigger
DROP TRIGGER IF EXISTS update_operation_pricing_updated_at ON public.operation_pricing;

-- Drop function (only the one we created)
DROP FUNCTION IF EXISTS public.update_operation_pricing_updated_at();

-- Drop table
DROP TABLE IF EXISTS public.operation_pricing CASCADE;

-- Create table with is_annual_only
CREATE TABLE public.operation_pricing (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  operation_key TEXT UNIQUE NOT NULL,
  operation_name TEXT NOT NULL,
  operation_icon TEXT,
  credits_cost INTEGER NOT NULL,
  euro_cost DECIMAL(10,2) GENERATED ALWAYS AS (credits_cost * 0.60) STORED,
  category TEXT NOT NULL,
  is_annual_only BOOLEAN DEFAULT false,
  display_order INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.operation_pricing IS 'Pricing por operación mostrado en modal web';
COMMENT ON COLUMN public.operation_pricing.is_annual_only IS 'true = Solo disponible en plan anual (ej: Distribución)';

-- Indexes
CREATE INDEX idx_op_pricing_category ON public.operation_pricing(category);
CREATE INDEX idx_op_pricing_active ON public.operation_pricing(is_active);
CREATE INDEX idx_op_pricing_order ON public.operation_pricing(display_order);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_operation_pricing_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_operation_pricing_updated_at
BEFORE UPDATE ON public.operation_pricing
FOR EACH ROW EXECUTE FUNCTION public.update_operation_pricing_updated_at();

-- RLS
ALTER TABLE public.operation_pricing ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active operation pricing"
ON public.operation_pricing FOR SELECT TO authenticated, anon
USING (is_active = true);

CREATE POLICY "Admins can manage operation pricing"
ON public.operation_pricing FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role full access operation_pricing"
ON public.operation_pricing FOR ALL TO service_role
USING (true) WITH CHECK (true);

-- Insert pricing data
INSERT INTO public.operation_pricing (
  operation_key, operation_name, operation_icon, credits_cost, category, is_annual_only, display_order, is_active
) VALUES
  ('composer_lyrics', 'Compositor Letras', '📝', 0, 'gratis', false, 1, true),
  ('virtual_artists', 'Artistas Virtuales', '👤', 0, 'gratis', false, 2, true),
  ('distribute_music', 'Distribuir tu música', '🌍', 0, 'distribucion', true, 3, true),
  ('register_work', 'Registrar obra', '🛡️', 1, 'registro', false, 4, true),
  ('ai_covers', 'Portadas IA', '🖼️', 1, 'promo', false, 5, true),
  ('ai_creatives', 'Creatividades IA (1:1, 9:16, 16:9)', '🎨', 1, 'promo', false, 6, true),
  ('song_ai_voice', 'Canción con voz IA', '🎤', 2, 'musica', false, 7, true),
  ('instrumental_base', 'Base instrumental IA', '🎹', 2, 'musica', false, 8, true),
  ('random_generator', 'Generador Aleatorio', '🎲', 2, 'musica', false, 9, true),
  ('professional_mastering', 'Masterizado profesional', '✨', 3, 'audio', false, 10, true),
  ('video_fullhd', 'Videos Full HD', '🎬', 3, 'promo', false, 11, true),
  ('social_media_promo', 'Promoción RRSS', '📢', 30, 'promo', false, 12, true);
