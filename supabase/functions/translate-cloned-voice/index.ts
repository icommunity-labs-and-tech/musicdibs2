import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ELEVENLABS_API_KEY = Deno.env.get('ELEVENLABS_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Auth
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Parse form data
    const formData = await req.formData();
    const audioFile = formData.get('audio') as File;
    const voiceId = formData.get('voice_id') as string;
    const targetLang = formData.get('target_lang') as string;

    if (!audioFile || !voiceId || !targetLang) {
      return new Response(JSON.stringify({ error: 'Missing required fields: audio, voice_id, target_lang' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Estimate duration from file size (approximate: 128kbps = 16KB/s)
    const estimatedDuration = audioFile.size / (128000 / 8);
    const minutes = Math.max(1, Math.ceil(estimatedDuration / 60));
    const creditsNeeded = minutes * 2;

    // Check credits
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('available_credits')
      .eq('user_id', user.id)
      .single();

    if (!profile || profile.available_credits < creditsNeeded) {
      return new Response(JSON.stringify({
        error: 'Insufficient credits',
        needed: creditsNeeded,
        current: profile?.available_credits || 0,
      }), { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Deduct credits upfront
    await supabaseAdmin
      .from('profiles')
      .update({ available_credits: profile.available_credits - creditsNeeded })
      .eq('user_id', user.id);

    await supabaseAdmin.from('credit_transactions').insert({
      user_id: user.id,
      amount: -creditsNeeded,
      type: 'voice_translation',
      description: `Voice translation to ${targetLang} (${minutes} min)`,
    });

    // Call ElevenLabs Speech-to-Speech API (multipart form)
    const elForm = new FormData();
    elForm.append('audio', audioFile);
    elForm.append('model_id', 'eleven_multilingual_sts_v2');
    elForm.append('voice_settings', JSON.stringify({
      stability: 0.5,
      similarity_boost: 0.75,
    }));
    if (targetLang) {
      elForm.append('language_code', targetLang);
    }

    const elResponse = await fetch(
      `https://api.elevenlabs.io/v1/speech-to-speech/${voiceId}`,
      {
        method: 'POST',
        headers: { 'xi-api-key': ELEVENLABS_API_KEY! },
        body: elForm,
      }
    );

    if (!elResponse.ok) {
      const errorText = await elResponse.text();
      console.error('ElevenLabs STS error:', elResponse.status, errorText);

      // Refund credits on failure
      await supabaseAdmin
        .from('profiles')
        .update({ available_credits: profile.available_credits })
        .eq('user_id', user.id);

      await supabaseAdmin.from('credit_transactions').insert({
        user_id: user.id,
        amount: creditsNeeded,
        type: 'refund',
        description: `Refund: voice translation failed (${targetLang})`,
      });

      return new Response(JSON.stringify({ error: 'Translation failed', details: errorText }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const translatedBuffer = await elResponse.arrayBuffer();

    // Upload to storage
    const fileName = `${user.id}/${Date.now()}_${targetLang}.mp3`;
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('translated-vocals')
      .upload(fileName, translatedBuffer, {
        contentType: 'audio/mpeg',
        upsert: false,
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return new Response(JSON.stringify({ error: 'Failed to save translated audio' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({
      success: true,
      audio_path: uploadData.path,
      credits_used: creditsNeeded,
      target_language: targetLang,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
