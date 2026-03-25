import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // JWT auth
    const authHeader = req.headers.get("Authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } })
    }

    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    )
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser()
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } })
    }

    const FAL_API_KEY = Deno.env.get("FAL_API_KEY")
    if (!FAL_API_KEY) {
      return new Response(JSON.stringify({ error: "FAL_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } })
    }

    const {
      artistName,
      trackTitle,
      style,
      colorPalette,
      artistRef,
      description,
    } = await req.json()

    // Construir prompt optimizado para portadas musicales
    let prompt = `Music album cover art, square 1:1 format, professional quality.`

    if (trackTitle) {
      prompt += ` The title "${trackTitle}" is displayed prominently in bold typography.`
    }
    if (artistName) {
      prompt += ` Artist name "${artistName}" appears in clear readable text.`
    }
    if (artistRef) {
      prompt += ` Visual style inspired by ${artistRef} album artwork.`
    }
    if (style) {
      prompt += ` Art style: ${style}.`
    }
    if (colorPalette) {
      prompt += ` Dominant color palette: ${colorPalette}.`
    }
    if (description) {
      prompt += ` Additional details: ${description}.`
    }

    prompt += ` High quality, visually striking, suitable for streaming platforms like Spotify and Apple Music. No watermarks.`

    console.log(`[COVER] Generating for user ${user.id}: ${prompt.slice(0, 100)}`)

    // Llamada a fal.ai — Nano Banana 2
    const falRes = await fetch(
      "https://fal.run/fal-ai/nano-banana-2",
      {
        method: "POST",
        headers: {
          "Content-Type":  "application/json",
          "Authorization": `Key ${FAL_API_KEY}`,
        },
        body: JSON.stringify({
          prompt,
          image_size:         "square_hd",
          num_inference_steps: 28,
          num_images:          1,
          enable_safety_checker: true,
        }),
      }
    )

    if (!falRes.ok) {
      const errText = await falRes.text()
      console.error("[COVER] fal.ai error:", errText)
      return new Response(
        JSON.stringify({ error: `fal.ai error: ${falRes.status}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    const falData = await falRes.json()
    const imageUrl = falData.images?.[0]?.url

    if (!imageUrl) {
      return new Response(
        JSON.stringify({ error: "No image returned from fal.ai" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    console.log(`[COVER] Generated successfully for user ${user.id}`)

    return new Response(
      JSON.stringify({ imageUrl }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )

  } catch (e) {
    console.error("[COVER] Error:", e)
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }
})
