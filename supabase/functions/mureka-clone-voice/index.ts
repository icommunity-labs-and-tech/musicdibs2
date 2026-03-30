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
      return new Response(JSON.stringify({ error: 'Audio file too large. Maximum 10MB.' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`[MUREKA-CLONE] User ${user.id} uploading vocal: "${name}", size: ${audioFile.size} bytes`);

    // Usar /v1/files/upload con purpose="vocal"
    const murekaForm = new FormData();
    const audioBuffer = new Uint8Array(await audioFile.arrayBuffer());
    murekaForm.append('file', new Blob([audioBuffer], { type: audioFile.type || 'audio/mpeg' }), audioFile.name);
    murekaForm.append('purpose', 'vocal');

    const murekaRes = await fetch('https://api.mureka.ai/v1/files/upload', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${MUREKA_API_KEY}` },
      body: murekaForm,
    });

    const murekaText = await murekaRes.text();
    console.log(`[MUREKA-CLONE] Files upload response (${murekaRes.status}): ${murekaText}`);

    if (!murekaRes.ok) {
      return new Response(JSON.stringify({ error: 'Mureka upload failed', details: murekaText, status: murekaRes.status }), {
        status: murekaRes.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    let murekaData: any;
    try {
      murekaData = JSON.parse(murekaText);
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON from Mureka', raw: murekaText }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // El file_id es el vocal_id que usaremos en la generación
    const murekaVocalId = murekaData.id || murekaData.file_id || murekaData.vocal_id;

    console.log(`[MUREKA-CLONE] Got vocal file_id: ${murekaVocalId}, full response: ${JSON.stringify(murekaData)}`);

    if (!murekaVocalId) {
      return new Response(JSON.stringify({ error: 'No id returned from Mureka', data: murekaData }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

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

    console.log(`[MUREKA-CLONE] Saved clone ID: ${clone.id}`);

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
