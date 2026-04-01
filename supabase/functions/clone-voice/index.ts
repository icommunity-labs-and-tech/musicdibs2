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

    const ELEVENLABS_API_KEY = Deno.env.get('ELEVENLABS_API_KEY');
    if (!ELEVENLABS_API_KEY) {
      return new Response(JSON.stringify({ error: 'Missing ELEVENLABS_API_KEY' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Parsear multipart form
    const formData = await req.formData();
    const audioFile = formData.get('audio') as File | null;
    const name = formData.get('name') as string;
    const description = formData.get('description') as string || '';
    const removeNoise = formData.get('remove_background_noise') === 'true';

    if (!audioFile || !name?.trim()) {
      return new Response(JSON.stringify({ error: 'audio and name are required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Validar tamaño (máx 25MB)
    if (audioFile.size > 25 * 1024 * 1024) {
      return new Response(JSON.stringify({ error: 'Audio file too large. Maximum 25MB.' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Validar formato
    const allowedTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav', 'audio/mp4', 'audio/m4a', 'audio/webm', 'audio/ogg', 'audio/aac', 'audio/flac', 'audio/x-m4a', 'video/webm'];
    if (!allowedTypes.includes(audioFile.type) && !audioFile.name.match(/\.(mp3|wav|m4a|mp4|webm|ogg|aac|flac)$/i)) {
      return new Response(JSON.stringify({ error: 'Invalid audio format. Use MP3, WAV, M4A or WebM.' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`[CLONE-VOICE] User ${user.id} cloning voice: "${name}", size: ${audioFile.size} bytes`);

    // 1. Subir audio a Storage para referencia futura
    const storagePath = `${user.id}/${Date.now()}_${audioFile.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const audioBuffer = new Uint8Array(await audioFile.arrayBuffer());

    const { error: storageError } = await supabase.storage
      .from('voice-clone-samples')
      .upload(storagePath, audioBuffer, {
        contentType: audioFile.type || 'audio/mpeg',
        upsert: false,
      });

    if (storageError) {
      console.error('[CLONE-VOICE] Storage error:', storageError);
      // No bloqueamos — continuamos con ElevenLabs igualmente
    }

    // 2. Llamar a ElevenLabs IVC API
    const elForm = new FormData();
    elForm.append('name', name.trim());
    elForm.append('description', description || `Voice clone for ${name}`);
    elForm.append('files', new Blob([audioBuffer], { type: audioFile.type || 'audio/mpeg' }), audioFile.name);
    elForm.append('remove_background_noise', String(removeNoise));
    elForm.append('labels', JSON.stringify({ use_case: 'music', platform: 'musicdibs' }));

    const elRes = await fetch('https://api.elevenlabs.io/v1/voices/add', {
      method: 'POST',
      headers: { 'xi-api-key': ELEVENLABS_API_KEY },
      body: elForm,
    });

    if (!elRes.ok) {
      const err = await elRes.text();
      console.error('[CLONE-VOICE] ElevenLabs error:', err);
      return new Response(JSON.stringify({ error: 'ElevenLabs cloning failed', details: err }), {
        status: elRes.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const elData = await elRes.json();
    const voiceId = elData.voice_id;

    if (!voiceId) {
      return new Response(JSON.stringify({ error: 'No voice_id returned from ElevenLabs' }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`[CLONE-VOICE] ElevenLabs voice created: ${voiceId}`);

    // 3. Guardar en BD
    const { data: clone, error: dbError } = await supabase
      .from('voice_clones')
      .insert({
        user_id: user.id,
        elevenlabs_voice_id: voiceId,
        name: name.trim(),
        description: description || null,
        sample_storage_path: storageError ? null : storagePath,
        remove_background_noise: removeNoise,
        status: 'active',
      })
      .select()
      .single();

    if (dbError) {
      console.error('[CLONE-VOICE] DB error:', dbError);
      return new Response(JSON.stringify({ error: 'Failed to save voice clone', details: dbError.message }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`[CLONE-VOICE] Saved clone ID: ${clone.id}`);

    return new Response(JSON.stringify({
      success: true,
      clone_id: clone.id,
      voice_id: voiceId,
      name: clone.name,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error: any) {
    console.error('[CLONE-VOICE] Fatal error:', error);
    return new Response(JSON.stringify({ error: error.message || 'Internal server error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
