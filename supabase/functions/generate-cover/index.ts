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

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    )

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
      referenceImageBase64,
      referenceStrength,
      referenceMode,
    } = await req.json()

    // ── Credit deduction ──────────────────────────────────────
    const CREDITS_COST = 2
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("available_credits")
      .eq("user_id", user.id)
      .single()

    if (!profile || profile.available_credits < CREDITS_COST) {
      return new Response(JSON.stringify({ error: "insufficient_credits", available: profile?.available_credits ?? 0, required: CREDITS_COST }), {
        status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" }
      })
    }

    await supabaseAdmin.from("profiles").update({
      available_credits: profile.available_credits - CREDITS_COST,
      updated_at: new Date().toISOString(),
    }).eq("user_id", user.id).eq("available_credits", profile.available_credits)

    await supabaseAdmin.from("credit_transactions").insert({
      user_id: user.id,
      amount: -CREDITS_COST,
      type: "usage",
      description: `Portada IA: ${trackTitle || "Sin título"}${referenceMode && referenceMode !== 'none' ? ` (${referenceMode})` : ''}`.slice(0, 200),
    })

    const refundCredits = async (reason: string) => {
      const { data: p } = await supabaseAdmin.from("profiles").select("available_credits").eq("user_id", user.id).single()
      if (p) {
        await supabaseAdmin.from("profiles").update({
          available_credits: p.available_credits + CREDITS_COST,
          updated_at: new Date().toISOString(),
        }).eq("user_id", user.id)
        await supabaseAdmin.from("credit_transactions").insert({
          user_id: user.id,
          amount: CREDITS_COST,
          type: "refund",
          description: `Reembolso: ${reason}`.slice(0, 200),
        })
        console.log(`[COVER] Refunded ${CREDITS_COST} credits to user ${user.id}: ${reason}`)
      }
    }

    // ── Build prompt ──────────────────────────────────────────
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

    // Context based on reference mode
    if (referenceMode === 'artist') {
      prompt += ` Professional album cover incorporating the artist photo as a central element, high-end design, commercial quality, studio photography aesthetic.`
    } else if (referenceMode === 'reference') {
      prompt += ` Inspired by the reference cover aesthetic but completely unique and original, same visual style but different execution and elements.`
    }

    prompt += ` High quality, visually striking, suitable for streaming platforms like Spotify and Apple Music. No watermarks.`

    console.log(`[COVER] Generating for user ${user.id}, mode=${referenceMode || 'none'}: ${prompt.slice(0, 100)}`)

    // ── Determine endpoint and params ─────────────────────────
    const hasReferenceImage = referenceImageBase64 && referenceMode && referenceMode !== 'none'

    let falEndpoint: string
    const falBody: Record<string, unknown> = {
      prompt,
      image_size: "square_hd",
      num_inference_steps: 28,
      num_images: 1,
      enable_safety_checker: true,
    }

    if (hasReferenceImage) {
      // Image-to-image mode
      falEndpoint = "https://fal.run/fal-ai/flux-pro/v1.1/image-to-image"

      // Convert base64 to data URL for fal.ai
      falBody.image_url = `data:image/jpeg;base64,${referenceImageBase64}`

      // strength in fal.ai = how much to change (1 = completely new, 0 = keep original)
      // Our referenceStrength = how much to keep the original (0.2-0.9)
      // So we invert: fal strength = 1 - referenceStrength
      const strength = Math.max(0.1, Math.min(0.9, 1 - (referenceStrength || 0.5)))
      falBody.strength = strength

      console.log(`[COVER] Image-to-image mode, strength=${strength}`)
    } else {
      // Text-to-image mode (original behavior)
      falEndpoint = "https://fal.run/fal-ai/nano-banana-2"
    }

    const falRes = await fetch(falEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Key ${FAL_API_KEY}`,
      },
      body: JSON.stringify(falBody),
    })

    if (!falRes.ok) {
      const errText = await falRes.text()
      console.error("[COVER] fal.ai error:", errText)
      await refundCredits(`fal.ai error: ${falRes.status}`)
      return new Response(
        JSON.stringify({ error: `fal.ai error: ${falRes.status}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    const falData = await falRes.json()
    const imageUrl = falData.images?.[0]?.url

    if (!imageUrl) {
      await refundCredits("No image returned from fal.ai")
      return new Response(
        JSON.stringify({ error: "No image returned from fal.ai" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    console.log(`[COVER] Generated successfully for user ${user.id}, ${CREDITS_COST} credits charged`)

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
