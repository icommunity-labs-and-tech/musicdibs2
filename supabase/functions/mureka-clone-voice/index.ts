import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser(
      authHeader.replace('Bearer ', '')
    );
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const MUREKA_API_KEY = Deno.env.get('MUREKA_API_KEY');
    if (!MUREKA_API_KEY) {
      return new Response(JSON.stringify({ error: 'Missing MUREKA_API_KEY' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const formData = await req.formData();
    const audioFile = formData.get('audio') as File | null;
    const name = formData.get('name') as string;

    if (!audioFile || !name?.trim()) {
      return new Response(JSON.stringify({ error: 'audio and name are required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (audioFile.size > 10 * 1024 * 1024) {
      return new Response(JSON.stringify({ error: 'Audio file too large. Maximum 10MB for Mureka.' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`[MUREKA-CLONE] User ${user.id} cloning voice: "${name}"`);

    // Llamar a Mureka /v1/vocal/clone
    const murekaForm = new FormData();
    const audioBuffer = new Uint8Array(await audioFile.arrayBuffer());
    murekaForm.append('file', new Blob([audioBuffer], { type: audioFile.type || 'audio/mpeg' }), audioFile.name);

    const murekaRes = await fetch('https://api.mureka.ai/v1/vocal/clone', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${MUREKA_API_KEY}` },
      body: murekaForm,
    });

    if (!murekaRes.ok) {
      const err = await murekaRes.text();
      console.error('[MUREKA-CLONE] Error:', err);
      return new Response(JSON.stringify({ error: 'Mureka cloning failed', details: err }), {
        status: murekaRes.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const murekaData = await murekaRes.json();
    const murekaVocalId = murekaData.id || murekaData.vocal_id;

    if (!murekaVocalId) {
      return new Response(JSON.stringify({ error: 'No vocal_id returned from Mureka', data: murekaData }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`[MUREKA-CLONE] Got vocal_id: ${murekaVocalId}`);

    // Guardar en BD
    const { data: clone, error: dbError } = await supabase
      .from('voice_clones')
      .insert({
        user_id: user.id,
        elevenlabs_voice_id: `mureka_${murekaVocalId}`,
        mureka_vocal_id: murekaVocalId,
        name: name.trim(),
        provider: 'mureka',
        status: 'active',
      })
      .select()
      .single();

    if (dbError) {
      return new Response(JSON.stringify({ error: 'DB error', details: dbError.message }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({
      success: true,
      clone_id: clone.id,
      mureka_vocal_id: murekaVocalId,
      name: clone.name,
      provider: 'mureka',
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error: any) {
    console.error('[MUREKA-CLONE] Fatal:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
