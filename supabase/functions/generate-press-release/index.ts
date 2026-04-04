import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const supabaseUser = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authHeader } } });
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser(authHeader.replace('Bearer ', ''));
    if (userError || !user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');
    if (!ANTHROPIC_API_KEY) return new Response(JSON.stringify({ error: 'Missing ANTHROPIC_API_KEY' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const { work_id, artist_name, work_title, work_type, genre, description, blockchain_hash, checker_url, language = 'es', artist_bio, release_date } = await req.json();
    if (!artist_name || !work_title) return new Response(JSON.stringify({ error: 'artist_name and work_title are required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const langMap: Record<string, string> = { es: 'Spanish', en: 'English', fr: 'French', pt: 'Portuguese', it: 'Italian', de: 'German' };
    const langName = langMap[language] || 'Spanish';

    const systemPrompt = `You are an expert music publicist with 20 years of experience. Write compelling press releases for independent artists in ${langName}. Be concise, engaging and newsworthy — never generic.`;

    const userPrompt = `Write a professional music press release:
Artist: ${artist_name}
Title: "${work_title}"
Type: ${work_type || 'song'}
Genre: ${genre || 'not specified'}
Description: ${description || 'not provided'}
${artist_bio ? `Bio: ${artist_bio}` : ''}
${release_date ? `Release Date: ${release_date}` : ''}
${blockchain_hash ? `Blockchain certified on Fantom: ${blockchain_hash}` : ''}
${checker_url ? `Verification: ${checker_url}` : ''}

Structure: 1) Headline (max 12 words) 2) Hook paragraph 3) Artist quote 4) Artist context 5) Release details 6) Call to action
Also provide SHORT BIO (max 60 words) and 5 HASHTAGS.

Return ONLY this JSON:
{"headline":"...","body":"...","artist_quote":"...","short_bio":"...","hashtags":["#...","#...","#...","#...","#..."]}`;

    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 1500, system: systemPrompt, messages: [{ role: 'user', content: userPrompt }] }),
    });

    if (!claudeRes.ok) {
      const err = await claudeRes.text();
      return new Response(JSON.stringify({ error: 'Claude error', details: err }), { status: claudeRes.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const claudeData = await claudeRes.json();
    const rawText = claudeData.content?.[0]?.text?.trim();
    let parsed: any;
    try { parsed = JSON.parse(rawText); }
    catch { const m = rawText.match(/\{[\s\S]*\}/); if (m) parsed = JSON.parse(m[0]); else throw new Error('Cannot parse response'); }

    const fullBody = `${parsed.headline}\n\n${parsed.body}`;
    const { data: pr } = await supabase.from('press_releases').insert({ user_id: user.id, work_id: work_id || null, title: parsed.headline, body: fullBody, short_bio: parsed.short_bio, genre: genre || null, language, status: 'draft' }).select().single();

    return new Response(JSON.stringify({ success: true, press_release_id: pr?.id, headline: parsed.headline, body: fullBody, artist_quote: parsed.artist_quote, short_bio: parsed.short_bio, hashtags: parsed.hashtags || [] }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
