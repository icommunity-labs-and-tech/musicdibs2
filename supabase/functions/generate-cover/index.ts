import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
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
      artistPhotoBase64,
      referenceImageBase64,
      referenceStrength,
      referenceMode,
    } = await req.json()

    // ── Credit deduction ──────────────────────────────────────
    const CREDITS_COST = referenceMode === 'photomontage' ? 4 : 2
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

    prompt += ` High quality, visually striking, suitable for streaming platforms like Spotify and Apple Music. No watermarks.`

    console.log(`[COVER] Generating for user ${user.id}, mode=${referenceMode || 'none'}: ${prompt.slice(0, 100)}`)

    // ── Helper: generate with fal.ai ─────────────────────────
    const generateWithFal = async (
      falPrompt: string,
      imageBase64: string | null,
      strength: number,
    ): Promise<string> => {
      const falBody: Record<string, unknown> = {
        prompt: falPrompt,
        image_size: "square_hd",
        num_inference_steps: 28,
        num_images: 1,
        enable_safety_checker: true,
      }

      let endpoint: string
      if (imageBase64) {
        endpoint = "https://fal.run/fal-ai/flux/dev/image-to-image"
        falBody.image_url = `data:image/jpeg;base64,${imageBase64}`
        falBody.strength = Math.max(0.1, Math.min(0.9, strength))
        console.log(`[COVER] Image-to-image, strength=${falBody.strength}`)
      } else {
        endpoint = "https://fal.run/fal-ai/flux-pro/v1.1"
      }

      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Key ${FAL_API_KEY}`,
        },
        body: JSON.stringify(falBody),
      })

      if (!res.ok) {
        const errText = await res.text()
        console.error("[COVER] fal.ai error:", errText)
        throw new Error(`fal.ai error: ${res.status}`)
      }

      const data = await res.json()
      const url = data.images?.[0]?.url
      if (!url) throw new Error("No image returned from fal.ai")
      return url
    }

    // ── Helper: face-swap with Replicate ─────────────────────
    const faceSwapWithReplicate = async (
      targetImageUrl: string,
      sourceImageBase64: string,
    ): Promise<string> => {
      const REPLICATE_API_KEY = Deno.env.get("REPLICATE_API_KEY")
      if (!REPLICATE_API_KEY) throw new Error("REPLICATE_API_KEY not configured")

      const sourceDataUrl = `data:image/jpeg;base64,${sourceImageBase64}`

      const prediction = await fetch("https://api.replicate.com/v1/predictions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${REPLICATE_API_KEY}`,
          "Content-Type": "application/json",
          "Prefer": "wait",
        },
        body: JSON.stringify({
          version: "cdingram/face-swap:d1d6ea8c8be89d664a07a457526f7128109dee7c4b04131d5ecbfb4c82a30a56",
          input: {
            target_image: targetImageUrl,
            swap_image: sourceDataUrl,
          },
        }),
      })

      const predictionData = await prediction.json()

      // If "Prefer: wait" returned a completed prediction
      if (predictionData.status === "succeeded" && predictionData.output) {
        return predictionData.output
      }

      // Otherwise poll
      let attempts = 0
      const maxAttempts = 30
      while (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 2000))
        const statusRes = await fetch(
          `https://api.replicate.com/v1/predictions/${predictionData.id}`,
          { headers: { "Authorization": `Bearer ${REPLICATE_API_KEY}` } },
        )
        const statusData = await statusRes.json()
        if (statusData.status === "succeeded") return statusData.output
        if (statusData.status === "failed") throw new Error("Face-swap failed: " + (statusData.error || "unknown"))
        attempts++
      }
      throw new Error("Face-swap timeout")
    }

    // ── Generate based on mode ───────────────────────────────
    let imageUrl: string

    try {
      if (referenceMode === 'photomontage' && artistPhotoBase64 && referenceImageBase64) {
        // Step 1: Generate base with reference style
        const basePrompt = prompt + ` Person facing camera in iconic pose, dramatic lighting, professional album cover composition. Inspired by the reference style but unique execution.`
        const baseImageUrl = await generateWithFal(basePrompt, referenceImageBase64, 0.4)
        console.log(`[COVER] Photomontage step 1 complete`)

        // Step 2: Face-swap
        imageUrl = await faceSwapWithReplicate(baseImageUrl, artistPhotoBase64)
        console.log(`[COVER] Photomontage step 2 complete`)

      } else if (referenceMode === 'artist' && artistPhotoBase64) {
        const artistPrompt = prompt + ` Professional album cover incorporating the artist photo, high-end design, commercial quality, studio photography aesthetic.`
        const strength = 1 - (referenceStrength || 0.5)
        imageUrl = await generateWithFal(artistPrompt, artistPhotoBase64, strength)

      } else if (referenceMode === 'reference' && referenceImageBase64) {
        const refPrompt = prompt + ` Inspired by the reference cover aesthetic but completely unique and original, same visual style but different execution and elements.`
        const strength = 1 - (referenceStrength || 0.5)
        imageUrl = await generateWithFal(refPrompt, referenceImageBase64, strength)

      } else {
        imageUrl = await generateWithFal(prompt, null, 0)
      }
    } catch (genErr) {
      console.error("[COVER] Generation error:", genErr)
      await refundCredits(`Generation failed: ${genErr instanceof Error ? genErr.message : String(genErr)}`)
      return new Response(
        JSON.stringify({ error: genErr instanceof Error ? genErr.message : "Generation failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
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
