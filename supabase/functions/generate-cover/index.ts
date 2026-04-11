import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
}

const CREDITS_COST = 1

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // ── Auth ────────────────────────────────────────────────────
    const authHeader = req.headers.get("Authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    )
    const {
      data: { user },
      error: userError,
    } = await supabaseUser.auth.getUser()
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    )

    // ── API key ─────────────────────────────────────────────────
    const FAL_API_KEY = Deno.env.get("FAL_API_KEY")
    if (!FAL_API_KEY) {
      return new Response(
        JSON.stringify({ error: "FAL_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      )
    }

    // ── Parse body ──────────────────────────────────────────────
    const {
      artistName,
      trackTitle,
      description,
      artistPhotoBase64,
      // Legacy params kept for backwards compat
      style,
      colorPalette,
      artistRef,
      referenceImageBase64,
      referenceStrength,
      referenceMode,
    } = await req.json()

    if (!artistName || !trackTitle) {
      return new Response(
        JSON.stringify({ error: "artistName and trackTitle are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      )
    }

    // ── Credit check ────────────────────────────────────────────
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("available_credits")
      .eq("user_id", user.id)
      .single()

    if (!profile || profile.available_credits < CREDITS_COST) {
      return new Response(
        JSON.stringify({
          error: "insufficient_credits",
          available: profile?.available_credits ?? 0,
          required: CREDITS_COST,
        }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      )
    }

    // ── Build prompt ────────────────────────────────────────────
    let prompt = description
      ? `${artistName} - ${trackTitle}. ${description}. Professional album cover art, high quality music artwork, modern design, square format`
      : `${artistName} - ${trackTitle}. Professional album cover art, modern music artwork, high quality design, square format`

    // Enrich with legacy fields if provided
    if (artistRef) prompt += ` Visual style inspired by ${artistRef} album artwork.`
    if (style) prompt += ` Art style: ${style}.`
    if (colorPalette) prompt += ` Dominant color palette: ${colorPalette}.`

    console.log(`[COVER] user=${user.id}, hasPhoto=${!!artistPhotoBase64}, prompt=${prompt.slice(0, 120)}…`)

    // ── Generate with Nano Banana Pro ───────────────────────────
    let imageUrl: string

    try {
      if (artistPhotoBase64) {
        // Image-to-image: edit endpoint
        const res = await fetch("https://fal.run/fal-ai/nano-banana-pro/edit", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Key ${FAL_API_KEY}`,
          },
          body: JSON.stringify({
            prompt,
            image_urls: [`data:image/jpeg;base64,${artistPhotoBase64}`],
            image_size: { width: 3000, height: 3000 },
            output_format: "png",
          }),
        })

        if (!res.ok) {
          const errText = await res.text()
          console.error("[COVER] fal.ai edit error:", errText)
          throw new Error(`fal.ai error: ${res.status}`)
        }

        const data = await res.json()
        imageUrl = data.images?.[0]?.url
        if (!imageUrl) throw new Error("No image returned from fal.ai edit")
      } else {
        // Text-to-image: base endpoint
        const res = await fetch("https://fal.run/fal-ai/nano-banana-pro", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Key ${FAL_API_KEY}`,
          },
          body: JSON.stringify({
            prompt,
            image_size: { width: 3000, height: 3000 },
            output_format: "png",
          }),
        })

        if (!res.ok) {
          const errText = await res.text()
          console.error("[COVER] fal.ai error:", errText)
          throw new Error(`fal.ai error: ${res.status}`)
        }

        const data = await res.json()
        imageUrl = data.images?.[0]?.url
        if (!imageUrl) throw new Error("No image returned from fal.ai")
      }
    } catch (genErr) {
      console.error("[COVER] Generation error:", genErr)
      const errMsg = genErr instanceof Error ? genErr.message : String(genErr)

      // Do NOT deduct credits on generation failure
      const isServiceError = /5\d{2}/.test(errMsg)
      if (isServiceError) {
        return new Response(
          JSON.stringify({
            error: "SERVICE_UNAVAILABLE",
            fallback: true,
            message: "El servicio de generación de imágenes no está disponible temporalmente. Inténtalo de nuevo en unos minutos.",
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        )
      }

      return new Response(
        JSON.stringify({ error: errMsg }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      )
    }

    // ── Upload to Storage ───────────────────────────────────────
    let storedUrl = imageUrl
    try {
      const imgRes = await fetch(imageUrl)
      if (imgRes.ok) {
        const imgBlob = await imgRes.blob()
        const fileName = `covers/${user.id}/${Date.now()}.png`
        const { error: uploadErr } = await supabaseAdmin.storage
          .from("social-promo-images")
          .upload(fileName, imgBlob, { contentType: "image/png", upsert: false })

        if (!uploadErr) {
          const { data: pubUrl } = supabaseAdmin.storage
            .from("social-promo-images")
            .getPublicUrl(fileName)
          storedUrl = pubUrl.publicUrl
        } else {
          console.warn("[COVER] Upload failed, using fal URL:", uploadErr.message)
        }
      }
    } catch (upErr) {
      console.warn("[COVER] Upload error, using fal URL:", upErr)
    }

    // ── Deduct credits (only after success) ─────────────────────
    await supabaseAdmin
      .from("profiles")
      .update({
        available_credits: profile.available_credits - CREDITS_COST,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", user.id)
      .eq("available_credits", profile.available_credits)

    await supabaseAdmin.from("credit_transactions").insert({
      user_id: user.id,
      amount: -CREDITS_COST,
      type: "usage",
      description: `Portada IA: ${trackTitle || "Sin título"}`.slice(0, 200),
    })

    console.log(`[COVER] Success for ${user.id}, ${CREDITS_COST} credit charged`)

    return new Response(
      JSON.stringify({ success: true, imageUrl: storedUrl, credits_used: CREDITS_COST }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    )
  } catch (e) {
    console.error("[COVER] Unexpected error:", e)
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    )
  }
})
