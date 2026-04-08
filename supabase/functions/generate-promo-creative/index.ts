import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

const CREDITS_COST = 1

const ASPECT_RATIOS: Record<string, string> = {
  feed: "1:1",
  story: "9:16",
  youtube: "16:9",
}

const FORMAT_LABELS: Record<string, string> = {
  feed: "Instagram Feed",
  story: "Instagram Stories",
  youtube: "YouTube Thumbnail",
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders })
  }

  try {
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
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser()
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

    const FAL_API_KEY = Deno.env.get("FAL_API_KEY")
    if (!FAL_API_KEY) {
      return new Response(
        JSON.stringify({ error: "FAL_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      )
    }

    const { description, format, photo_base64 } = await req.json()

    if (!description || !format) {
      return new Response(
        JSON.stringify({ error: "description and format are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      )
    }

    const aspectRatio = ASPECT_RATIOS[format]
    if (!aspectRatio) {
      return new Response(
        JSON.stringify({ error: `Invalid format: ${format}. Must be feed, story, or youtube` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      )
    }

    // Credit check
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

    const prompt = `${description}. Professional social media content, high quality, modern design, ${FORMAT_LABELS[format]}`

    console.log(`[PROMO-CREATIVE] user=${user.id} format=${format} hasPhoto=${!!photo_base64} prompt=${prompt.slice(0, 120)}…`)

    // Generate image
    let imageUrl: string

    try {
      const endpoint = photo_base64
        ? "https://fal.run/fal-ai/nano-banana-pro/edit"
        : "https://fal.run/fal-ai/nano-banana-pro"

      const body: Record<string, unknown> = {
        prompt,
        aspect_ratio: aspectRatio,
        output_format: "png",
      }

      if (photo_base64) {
        body.image_urls = [`data:image/jpeg;base64,${photo_base64}`]
      }

      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Key ${FAL_API_KEY}`,
        },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const errText = await res.text()
        console.error("[PROMO-CREATIVE] fal.ai error:", errText)
        throw new Error(`fal.ai error: ${res.status}`)
      }

      const data = await res.json()
      imageUrl = data.images?.[0]?.url
      if (!imageUrl) throw new Error("No image returned from fal.ai")
    } catch (genErr) {
      console.error("[PROMO-CREATIVE] Generation error:", genErr)
      const errMsg = genErr instanceof Error ? genErr.message : String(genErr)

      if (/5\d{2}/.test(errMsg)) {
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

    // Upload to Storage
    let storedUrl = imageUrl
    try {
      const imgRes = await fetch(imageUrl)
      if (imgRes.ok) {
        const imgBlob = await imgRes.blob()
        const fileName = `creatives/${user.id}/${format}_${Date.now()}.png`
        const { error: uploadErr } = await supabaseAdmin.storage
          .from("social-promo-images")
          .upload(fileName, imgBlob, { contentType: "image/png", upsert: false })

        if (!uploadErr) {
          const { data: pubUrl } = supabaseAdmin.storage
            .from("social-promo-images")
            .getPublicUrl(fileName)
          storedUrl = pubUrl.publicUrl
        } else {
          console.warn("[PROMO-CREATIVE] Upload failed, using fal URL:", uploadErr.message)
        }
      }
    } catch (upErr) {
      console.warn("[PROMO-CREATIVE] Upload error, using fal URL:", upErr)
    }

    // Deduct credits only after success
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
      description: `Creatividad ${FORMAT_LABELS[format]}`.slice(0, 200),
    })

    console.log(`[PROMO-CREATIVE] Success for ${user.id}, format=${format}, ${CREDITS_COST} credit charged`)

    return new Response(
      JSON.stringify({
        success: true,
        image_url: storedUrl,
        format,
        aspect_ratio: aspectRatio,
        credits_used: CREDITS_COST,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    )
  } catch (e) {
    console.error("[PROMO-CREATIVE] Unexpected error:", e)
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    )
  }
})
