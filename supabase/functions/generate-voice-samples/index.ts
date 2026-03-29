import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SAMPLE_PROMPTS: Record<string, string> = {
  'female-pop':     'bright female pop vocals, melodic, clear tone, upbeat pop song, 30 seconds',
  'female-rb':      'warm female R&B soul vocals, expressive, soulful, smooth R&B, 30 seconds',
  'female-latin':   'female urban latin vocals, reggaeton style, powerful, latin urban, 30 seconds',
  'female-ballad':  'soft emotional female vocals, ballad style, intimate, tender melody, 30 seconds',
  'female-rock':    'powerful female rock vocals, edgy, intense, rock song, 30 seconds',
  'male-pop':       'smooth male pop vocals, modern, polished, contemporary pop, 30 seconds',
  'male-trap':      'deep male trap vocals, urban hip-hop style, melodic rap, trap beat, 30 seconds',
  'male-latin':     'male latin urban vocals, reggaeton and trap latino style, 30 seconds',
  'male-rock':      'powerful male rock vocals, gritty, energetic, rock anthem, 30 seconds',
  'male-ballad':    'deep emotional male vocals, crooner ballad style, romantic, 30 seconds',
  'male-flamenco':  'male flamenco vocals, spanish style, deep and passionate, 30 seconds',
  'child-young':    'young fresh vocals, youthful pop style, energetic, upbeat, 30 seconds',
  'choir':          'choir vocals, harmonic, multiple voices, epic choral, 30 seconds',
  'vintage-crooner':'old crooner male vocalist, vintage 1950s style, charming, nostalgic, 30 seconds',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const ELEVENLABS_API_KEY = Deno.env.get('ELEVENLABS_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    if (!ELEVENLABS_API_KEY) {
      return new Response(JSON.stringify({ error: 'Missing ELEVENLABS_API_KEY' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {};
    const { voice_id: targetId, force = false } = body;

    let query = supabase.from('voice_profiles').select('*').eq('active', true);
    if (targetId) query = query.eq('id', targetId);
    if (!force && !targetId) query = query.is('sample_url', null);

    const { data: profiles, error: profilesError } = await query;
    if (profilesError) throw profilesError;
    if (!profiles?.length) {
      return new Response(JSON.stringify({ message: 'No profiles to generate', generated: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const results: any[] = [];

    for (const profile of profiles) {
      try {
        const prompt = SAMPLE_PROMPTS[profile.id] || `${profile.prompt_tag}, 30 seconds`;

        const elRes = await fetch('https://api.elevenlabs.io/v1/music', {
          method: 'POST',
          headers: {
            'xi-api-key': ELEVENLABS_API_KEY,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ prompt, duration_seconds: 30 }),
        });

        if (!elRes.ok) {
          const err = await elRes.text();
          results.push({ id: profile.id, status: 'error', error: err });
          continue;
        }

        // ElevenLabs Music API returns raw binary audio
        const audioBuffer = new Uint8Array(await elRes.arrayBuffer());

        const fileName = `${profile.id}.mp3`;
        const { error: uploadError } = await supabase.storage
          .from('voice-samples')
          .upload(fileName, audioBuffer, { contentType: 'audio/mpeg', upsert: true });

        if (uploadError) {
          results.push({ id: profile.id, status: 'error', error: uploadError.message });
          continue;
        }

        const { data: urlData } = supabase.storage.from('voice-samples').getPublicUrl(fileName);

        await supabase.from('voice_profiles').update({
          sample_url: urlData.publicUrl,
          sample_generated_at: new Date().toISOString(),
        }).eq('id', profile.id);

        results.push({ id: profile.id, status: 'ok', url: urlData.publicUrl });
        await new Promise(r => setTimeout(r, 1000));

      } catch (err: any) {
        results.push({ id: profile.id, status: 'error', error: err.message });
      }
    }

    return new Response(JSON.stringify({
      generated: results.filter(r => r.status === 'ok').length,
      errors: results.filter(r => r.status === 'error').length,
      results,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
