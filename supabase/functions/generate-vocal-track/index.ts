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
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabaseUser = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authHeader } } });
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser(authHeader.replace('Bearer ', ''));
    if (userError || !user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const ELEVENLABS_API_KEY = Deno.env.get('ELEVENLABS_API_KEY');
    const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');
    if (!ELEVENLABS_API_KEY) return new Response(JSON.stringify({ error: 'Missing ELEVENLABS_API_KEY' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const { lyrics, voice_id, voice_name, genre, mood } = await req.json();
    if (!lyrics?.trim()) return new Response(JSON.stringify({ error: 'lyrics is required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    if (!voice_id) return new Response(JSON.stringify({ error: 'voice_id is required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const CREDITS_COST = 1;
    const { data: profile } = await supabase.from('profiles').select('available_credits').eq('user_id', user.id).single();
    if (!profile || profile.available_credits < CREDITS_COST) return new Response(JSON.stringify({ error: 'insufficient_credits' }), { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    await supabase.from('profiles').update({ available_credits: profile.available_credits - CREDITS_COST, updated_at: new Date().toISOString() }).eq('user_id', user.id);
    await supabase.from('credit_transactions').insert({ user_id: user.id, amount: -CREDITS_COST, type: 'usage', description: `Pista vocal: ${voice_name || voice_id}` });

    let formattedLyrics = lyrics.replace(/\[([^\]]+)\]/g, '\n').replace(/\n{3,}/g, '\n\n').trim();

    if (ANTHROPIC_API_KEY) {
      const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 800, messages: [{ role: 'user', content: `Format these song lyrics for text-to-speech. Remove tags like [Verse], [Chorus] but keep all original words. Add natural pauses with commas and periods. Return ONLY the formatted lyrics.\n\n${lyrics}` }] })
      });
      if (claudeRes.ok) {
        const d = await claudeRes.json();
        const f = d.content?.[0]?.text?.trim();
        if (f) formattedLyrics = f;
      }
    }

    console.log(`[VOCAL-TRACK] Generating with voice_id: ${voice_id}, lyrics: ${formattedLyrics.length} chars`);

    const ttsRes = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice_id}`, {
      method: 'POST',
      headers: { 'xi-api-key': ELEVENLABS_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: formattedLyrics,
        model_id: 'eleven_multilingual_v2',
        voice_settings: { stability: 0.4, similarity_boost: 0.85, style: 0.5, use_speaker_boost: true }
      }),
    });

    if (!ttsRes.ok) {
      const err = await ttsRes.text();
      console.error('[VOCAL-TRACK] ElevenLabs error:', err);
      const { data: p } = await supabase.from('profiles').select('available_credits').eq('user_id', user.id).single();
      if (p) {
        await supabase.from('profiles').update({ available_credits: p.available_credits + CREDITS_COST }).eq('user_id', user.id);
        await supabase.from('credit_transactions').insert({ user_id: user.id, amount: CREDITS_COST, type: 'refund', description: 'Reembolso: fallo vocal' });
      }
      return new Response(JSON.stringify({ error: 'TTS failed', details: err }), { status: ttsRes.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const audioBuffer = new Uint8Array(await ttsRes.arrayBuffer());
    const fileName = `${user.id}/vocal_${Date.now()}.mp3`;
    const { error: uploadError } = await supabase.storage.from('ai-generations').upload(fileName, audioBuffer, { contentType: 'audio/mpeg', upsert: false });
    if (uploadError) {
      console.error('[VOCAL-TRACK] Upload error:', uploadError);
      return new Response(JSON.stringify({ error: 'Upload failed' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { data: urlData } = supabase.storage.from('ai-generations').getPublicUrl(fileName);
    const audioUrl = urlData.publicUrl;

    const { data: generation } = await supabase.from('ai_generations').insert({
      user_id: user.id, type: 'vocal_track',
      prompt: `Pista vocal: ${voice_name || 'Voz clonada'} | ${genre || ''} ${mood || ''}`.trim(),
      genre: genre || null, mood: mood || null, audio_url: audioUrl, status: 'completed',
    }).select().single();

    console.log(`[VOCAL-TRACK] Done: ${generation?.id}`);

    return new Response(JSON.stringify({ success: true, audioUrl, generationId: generation?.id }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error: any) {
    console.error('[VOCAL-TRACK] Fatal:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});