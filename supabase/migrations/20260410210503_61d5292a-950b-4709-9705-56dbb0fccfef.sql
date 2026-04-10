
-- Fix duplicate credit for user info@musicdibs.com (topup_25 counted twice)
UPDATE public.profiles SET available_credits = available_credits - 25 WHERE user_id = 'b812dde1-c71c-43f4-b594-b318ecfc01cc';

-- Mark the duplicate transaction
UPDATE public.credit_transactions 
SET description = '[DUPLICADO - corregido] ' || description
WHERE id = '6e5447ef-ee78-445e-b28c-b878a2c5ef13';
