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

    // ── API keys ────────────────────────────────────────────────
    const FAL_API_KEY = Deno.env.get("FAL_API_KEY")
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")

    // ── Parse body ──────────────────────────────────────────────
    const {
      artistName,
      trackTitle,
      description,
      artistPhotoBase64,
      resolution,
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

    // ── Generate image ─────────────────────────────────────────
    let imageUrl: string

    // Helper: try fal.ai
    const tryFal = async (): Promise<string | null> => {
      if (!FAL_API_KEY) return null
      try {
        const endpoint = artistPhotoBase64
          ? "https://fal.run/fal-ai/nano-banana-pro/edit"
          : "https://fal.run/fal-ai/nano-banana-pro"
        const body: any = {
          prompt,
          image_size: { width: 3000, height: 3000 },
          output_format: "png",
        }
        if (artistPhotoBase64) {
          body.image_urls = [`data:image/jpeg;base64,${artistPhotoBase64}`]
        }
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Key ${FAL_API_KEY}` },
          body: JSON.stringify(body),
        })
        if (!res.ok) {
          const errText = await res.text()
          console.error("[COVER] fal.ai error:", errText)
          return null
        }
        const data = await res.json()
        return data.images?.[0]?.url || null
      } catch (e: any) {
        console.error("[COVER] fal.ai exception:", e.message)
        return null
      }
    }

    // Helper: try Lovable AI Gateway
    const tryLovable = async (): Promise<string | null> => {
      if (!LOVABLE_API_KEY) return null
      const models = [
        "google/gemini-3.1-flash-image-preview",
        "google/gemini-3-pro-image-preview",
      ]
      for (const model of models) {
        try {
          console.log(`[COVER] Trying Lovable AI: ${model}`)
          const content: any[] = [{ type: "text", text: prompt }]
          if (artistPhotoBase64) {
            content.push({
              type: "image_url",
              image_url: { url: `data:image/jpeg;base64,${artistPhotoBase64}` },
            })
          }
          const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${LOVABLE_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model,
              messages: [{ role: "user", content }],
              modalities: ["image", "text"],
            }),
          })
          if (!res.ok) {
            console.error(`[COVER] Lovable ${model} error ${res.status}`)
            continue
          }
          const data = await res.json()
          const b64 = data.choices?.[0]?.message?.images?.[0]?.image_url?.url
          if (b64?.startsWith("data:image")) {
            // Upload base64 to storage and return URL
            const base64Data = b64.split(",")[1]
            const imgBuffer = Uint8Array.from(atob(base64Data), (c: string) => c.charCodeAt(0))
            const fileName = `covers/${user.id}/${Date.now()}_lovable.png`
            const { error: upErr } = await supabaseAdmin.storage
              .from("social-promo-images")
              .upload(fileName, imgBuffer, { contentType: "image/png", upsert: false })
            if (!upErr) {
              const { data: pubUrl } = supabaseAdmin.storage
                .from("social-promo-images")
                .getPublicUrl(fileName)
              console.log(`[COVER] Generated with Lovable AI ${model}`)
              return pubUrl.publicUrl
            }
            console.warn("[COVER] Upload of Lovable image failed:", upErr.message)
          }
        } catch (e: any) {
          console.error(`[COVER] Lovable ${model} exception:`, e.message)
        }
      }
      return null
    }

    // Try fal.ai first, then Lovable AI Gateway as fallback
    try {
      const falResult = await tryFal()
      if (falResult) {
        imageUrl = falResult
      } else {
        console.log("[COVER] fal.ai failed, trying Lovable AI fallback…")
        const lovableResult = await tryLovable()
        if (lovableResult) {
          imageUrl = lovableResult
        } else {
          throw new Error("All image generation providers failed")
        }
      }
    } catch (genErr) {
      console.error("[COVER] Generation error:", genErr)
      return new Response(
        JSON.stringify({
          error: "SERVICE_UNAVAILABLE",
          fallback: true,
          message: "El servicio de generación de imágenes no está disponible temporalmente. Inténtalo de nuevo en unos minutos.",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      )
    }

    // ── Upscale to 4096px (only when requested + fal.ai available) ──
    const wantHD = resolution === '4096'
    if (wantHD && FAL_API_KEY) {
      try {
        console.log(`[COVER] Upscaling from model output…`)
        const upRes = await fetch("https://fal.run/fal-ai/aura-sr", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Key ${FAL_API_KEY}`,
          },
          body: JSON.stringify({
            image_url: imageUrl,
            upscaling_factor: 4,
            output_format: "png",
          }),
        })

        if (upRes.ok) {
          const upData = await upRes.json()
          const upUrl = upData.image?.url
          if (upUrl) {
            imageUrl = upUrl
            console.log(`[COVER] Upscale successful`)
          } else {
            console.warn("[COVER] Upscaler returned no image, using original")
          }
        } else {
          console.warn("[COVER] Upscaler error:", upRes.status, await upRes.text())
        }
      } catch (upscaleErr) {
        console.warn("[COVER] Upscale failed, using original:", upscaleErr)
      }
    } else if (wantHD) {
      console.log("[COVER] HD requested but fal.ai unavailable, skipping upscale")
    } else {
      console.log("[COVER] Skipping upscale (resolution=1024)")
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
