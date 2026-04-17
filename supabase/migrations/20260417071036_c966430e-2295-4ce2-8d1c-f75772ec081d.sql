UPDATE public.api_cost_config
SET api_cost_eur = 0.0025,
    api_provider = 'Google',
    notes = COALESCE(notes, '') || ' [Actualizado: gemini-2.5-flash directo de Google. ~500 input + 1000 output tokens. $0.30/1M input + $2.50/1M output ≈ $0.0028 ≈ €0.0025]'
WHERE feature_key = 'inspiration';