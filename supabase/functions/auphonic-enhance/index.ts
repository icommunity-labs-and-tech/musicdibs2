import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "../_shared/supabase-client.ts"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
}

const ROEX_BASE_URL = "https://tonn.roexaudio.com"

const ROEX_MODES: Record<string, { musicalStyle: string; desiredLoudness: string }> = {
  professional: { musicalStyle: "POP",        desiredLoudness: "MEDIUM" },
  spotify:      { musicalStyle: "POP",        desiredLoudness: "STREAMING" },
  denoise:      { musicalStyle: "POP",        desiredLoudness: "MEDIUM" },
  clarity:      { musicalStyle: "ROCK_INDIE", desiredLoudness: "MEDIUM" },
  reverb:       { musicalStyle: "POP",        desiredLoudness: "MEDIUM" },
}
const DEFAULT_MODE = { musicalStyle: "POP", desiredLoudness: "STREAMING" }
const PLACEHOLDER_URL_PATTERNS = [/example\.com\/dummy/i, /dummy_dev_preview/i]

const isPlaceholderUrl = (url: string | null | undefined) =>
  !!url && PLACEHOLDER_URL_PATTERNS.some((pattern) => pattern.test(url))

const collectHttpUrls = (value: unknown, seen = new Set<string>()) => {
  if (typeof value === "string") {
    if (/^https?:\/\//i.test(value)) seen.add(value)
    return [...seen]
  }

  if (Array.isArray(value)) {
    value.forEach((item) => collectHttpUrls(item, seen))
    return [...seen]
  }

  if (value && typeof value === "object") {
    Object.values(value as Record<string, unknown>).forEach((item) => collectHttpUrls(item, seen))
  }

  return [...seen]
}

const extractOutputUrl = (payload: any, isPreview: boolean): string | null => {
  const preferred = [
    isPreview ? payload?.previewMasterTaskResults?.download_url_mastered_preview : payload?.finalMasterTaskResults?.download_url_mastered,
    payload?.download_url_mastered_preview,
    payload?.download_url_mastered,
    payload?.downloadUrl,
    payload?.url,
  ].filter((value): value is string => typeof value === "string" && value.length > 0)

  const discovered = collectHttpUrls(payload).filter((url) => !isPlaceholderUrl(url))

  return [...preferred, ...discovered].find((url) => !isPlaceholderUrl(url)) ?? null
}

const inferAudioMeta = (sourceUrl: string, contentType: string | null) => {
  const lowerType = (contentType || "").toLowerCase()
  const urlMatch = sourceUrl.match(/\.([a-z0-9]+)(?:\?|$)/i)
  const extensionFromUrl = urlMatch?.[1]?.toLowerCase()

  if (lowerType.includes("wav")) return { contentType: "audio/wav", extension: "wav" }
  if (lowerType.includes("flac")) return { contentType: "audio/flac", extension: "flac" }
  if (lowerType.includes("ogg")) return { contentType: "audio/ogg", extension: "ogg" }
  if (lowerType.includes("aac")) return { contentType: "audio/aac", extension: "aac" }
  if (lowerType.includes("mp4") || lowerType.includes("m4a")) return { contentType: "audio/mp4", extension: "m4a" }
  if (lowerType.includes("mpeg") || lowerType.includes("mp3")) return { contentType: "audio/mpeg", extension: "mp3" }

  if (extensionFromUrl && ["mp3", "wav", "flac", "ogg", "aac", "m4a"].includes(extensionFromUrl)) {
    return {
      contentType: extensionFromUrl === "m4a" ? "audio/mp4" : `audio/${extensionFromUrl === "mp3" ? "mpeg" : extensionFromUrl}`,
      extension: extensionFromUrl,
    }
  }

  return { contentType: "audio/mpeg", extension: "mp3" }
}

const persistRemoteAudio = async ({
  supabaseAdmin,
  userId,
  productionUuid,
  sourceUrl,
  isPreview,
}: {
  supabaseAdmin: ReturnType<typeof createClient>
  userId: string
  productionUuid: string
  sourceUrl: string
  isPreview: boolean
}) => {
  if (isPlaceholderUrl(sourceUrl)) return null

  try {
    const audioRes = await fetch(sourceUrl)
    if (!audioRes.ok) {
      console.error(`[ROEX] Failed to fetch ${isPreview ? "preview" : "result"} audio: ${audioRes.status}`)
      return null
    }

    const { contentType, extension } = inferAudioMeta(sourceUrl, audioRes.headers.get("content-type"))
    if (!contentType.startsWith("audio/")) {
      console.error(`[ROEX] Invalid ${isPreview ? "preview" : "result"} content-type: ${contentType}`)
      return null
    }

    const audioBuffer = await audioRes.arrayBuffer()
    const fileName = `${isPreview ? "roex-preview" : "roex-result"}/${userId}/${productionUuid}.${extension}`

    const { error: uploadError } = await supabaseAdmin
      .storage
      .from("auphonic-temp")
      .upload(fileName, audioBuffer, {
        contentType,
        upsert: true,
      })

    if (uploadError) {
      console.error(`[ROEX] Error uploading ${isPreview ? "preview" : "result"} audio:`, uploadError)
      return null
    }

    const { data: publicData } = supabaseAdmin
      .storage
      .from("auphonic-temp")
      .getPublicUrl(fileName)

    return publicData.publicUrl
  } catch (e) {
    console.error(`[ROEX] Error persisting ${isPreview ? "preview" : "result"} audio:`, e)
    return null
  }
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
    const token = authHeader.replace("Bearer ", "")
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser(token)
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } })
    }

    const ROEX_API_KEY = Deno.env.get("ROEX_API_KEY")
    if (!ROEX_API_KEY) {
      return new Response(JSON.stringify({ error: "ROEX_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } })
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    )

    const { action, mode, audioUrl, filename, productionUuid, isPreview } = await req.json()

    const roexHeaders = {
      "Content-Type": "application/json",
      "x-api-key": ROEX_API_KEY,
    }

    const modeConfig = ROEX_MODES[mode] || DEFAULT_MODE

    // ── ACTION: STATUS (polling) ────────────────────────────
    if (action === "status") {
      if (!productionUuid) {
        return new Response(JSON.stringify({ error: "productionUuid required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } })
      }

      // RoEx requires POST to retrieve* endpoints with masteringTaskId in body
      const endpoint = isPreview
        ? `${ROEX_BASE_URL}/retrievepreviewmaster`
        : `${ROEX_BASE_URL}/retrievefinalmaster`

      const statusRes = await fetch(endpoint, {
        method: "POST",
        headers: roexHeaders,
        body: JSON.stringify({
          masteringData: { masteringTaskId: productionUuid },
        }),
      })

      // 202 = still processing; 200 = ready; 4xx/5xx = error
      const statusData = await statusRes.json().catch(() => ({}))

      let stillProcessing = statusRes.status === 202
      let done = statusRes.status === 200 && !statusData.error
      let errored = !done && !stillProcessing
      let outputUrl: string | null = done ? extractOutputUrl(statusData, !!isPreview) : null

      if (done && outputUrl) {
        const persistedUrl = await persistRemoteAudio({
          supabaseAdmin: supabaseAdmin as any,
          userId: user.id,
          productionUuid,
          sourceUrl: outputUrl,
          isPreview: !!isPreview,
        })
        if (persistedUrl) outputUrl = persistedUrl
      }

      if (done && (!outputUrl || isPlaceholderUrl(outputUrl))) {
        done = false
        errored = true
        stillProcessing = false
      }

      const progress = done ? 100 : (errored ? 0 : 50)
      const isDummyResponse = typeof statusData?.message === "string" && /dummy/i.test(statusData.message)
      const errorMessage = errored
        ? (isDummyResponse
            ? "La API de masterización está en modo DEV/sandbox y solo devuelve audio de prueba. Configura una clave de RoEx en producción para obtener previews reales."
            : (!outputUrl && statusRes.status === 200
                ? "RoEx no devolvió una preview reproducible"
                : (statusData?.message || statusData?.error_message || `RoEx ${statusRes.status}`)))
        : null

      if ((done || errored) && !isPreview) {
        await supabaseAdmin
          .from("auphonic_productions")
          .update({
            status:       done ? "done" : "error",
            output_url:   outputUrl,
            error_detail: errorMessage,
            updated_at:   new Date().toISOString(),
          })
          .eq("auphonic_uuid", productionUuid)
          .eq("user_id", user.id)

        // ── Refund credits if processing failed ──
        if (errored) {
          const CREDITS_COST = 1
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
              description: `Reembolso: fallo RoEx (${errorMessage})`.slice(0, 200),
            })
            console.log(`[ROEX] Refunded ${CREDITS_COST} credit to user ${user.id}: processing error`)
          }
        }
      }

      return new Response(JSON.stringify({
        status: done ? "SUCCESS" : (errored ? "ERROR" : "PROCESSING"),
        done,
        errored,
        outputUrl,
        progress,
        isPreview: !!isPreview,
        errorMessage,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } })
    }

    // ── ACTION: PREVIEW (free, no credits) ──────────────────
    if (action === "preview") {
      if (!audioUrl) {
        return new Response(JSON.stringify({ error: "audioUrl required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } })
      }

      const previewBody = {
        masteringData: {
          trackData: [{ trackURL: audioUrl }],
          musicalStyle: modeConfig.musicalStyle,
          desiredLoudness: modeConfig.desiredLoudness,
        },
      }

      const roexRes = await fetch(`${ROEX_BASE_URL}/masteringpreview`, {
        method: "POST",
        headers: roexHeaders,
        body: JSON.stringify(previewBody),
      })

      if (!roexRes.ok) {
        const errText = await roexRes.text()
        console.error(`[ROEX-PREVIEW] API error status=${roexRes.status} body=${errText.slice(0, 500)}`)
        return new Response(JSON.stringify({
          error: "roex_preview_error",
          upstream_status: roexRes.status,
          detail: errText.slice(0, 300),
        }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } })
      }

      const roexData = await roexRes.json()
      const previewUuid = roexData.mastering_task_id || roexData.task_id

      if (!previewUuid) {
        return new Response(JSON.stringify({ error: "No task ID from RoEx preview" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } })
      }

      console.log(`[ROEX-PREVIEW] Started: ${previewUuid} mode=${mode} user=${user.id}`)

      return new Response(JSON.stringify({
        productionUuid: previewUuid,
        status: "processing",
        isPreview: true,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } })
    }

    // ── ACTION: PROCESS (full master, charges credits) ──────
    if (action !== "process") {
      return new Response(JSON.stringify({ error: "Invalid action" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } })
    }

    if (!audioUrl) {
      return new Response(JSON.stringify({ error: "audioUrl required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } })
    }

    // ── Read credit cost from operation_pricing ──
    let CREDITS_COST = 1
    const { data: pricing } = await supabaseAdmin
      .from("operation_pricing")
      .select("credits_cost")
      .eq("operation_key", "enhance_audio")
      .maybeSingle()
    if (pricing?.credits_cost && pricing.credits_cost > 0) {
      CREDITS_COST = pricing.credits_cost
    }

    // ── Credit deduction ──────────────────────────────────────
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
      description: `Masterización RoEx (${mode || "default"})`.slice(0, 200),
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
        console.log(`[ROEX] Refunded ${CREDITS_COST} credit to user ${user.id}: ${reason}`)
      }
    }

    // RoEx uses /masteringpreview to create the task, then /retrievefinalmaster to fetch the full result
    const masteringBody = {
      masteringData: {
        trackData: [{ trackURL: audioUrl }],
        musicalStyle: modeConfig.musicalStyle,
        desiredLoudness: modeConfig.desiredLoudness,
        stereoWidth: "NORMAL",
      },
    }

    const roexRes = await fetch(`${ROEX_BASE_URL}/masteringpreview`, {
      method: "POST",
      headers: roexHeaders,
      body: JSON.stringify(masteringBody),
    })

    if (!roexRes.ok) {
      const errText = await roexRes.text()
      console.error(`[ROEX] API error status=${roexRes.status} body=${errText.slice(0, 500)}`)
      await refundCredits(`RoEx ${roexRes.status}`)

      let errorCode = "roex_error"
      let httpStatus = 502
      if (roexRes.status === 401 || roexRes.status === 403) {
        errorCode = "roex_auth_error"
        httpStatus = 500
      } else if (roexRes.status === 400 || roexRes.status === 422) {
        errorCode = "roex_invalid_audio"
        httpStatus = 400
      } else if (roexRes.status === 429) {
        errorCode = "roex_rate_limited"
        httpStatus = 429
      } else if (roexRes.status >= 500) {
        errorCode = "roex_service_unavailable"
        httpStatus = 503
      }

      return new Response(JSON.stringify({
        error: errorCode,
        upstream_status: roexRes.status,
        detail: errText.slice(0, 300),
        retryable: httpStatus >= 500 || httpStatus === 429,
      }), { status: httpStatus, headers: { ...corsHeaders, "Content-Type": "application/json" } })
    }

    const roexData = await roexRes.json()
    const newProductionUuid = roexData.mastering_task_id || roexData.task_id

    if (!newProductionUuid) {
      await refundCredits("No task ID from RoEx")
      return new Response(JSON.stringify({ error: "No task ID from RoEx" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } })
    }

    await supabaseAdmin.from("auphonic_productions").insert({
      user_id:       user.id,
      auphonic_uuid: newProductionUuid,
      mode,
      status:        "processing",
      input_url:     audioUrl,
    })

    console.log(`[ROEX] Mastering started: ${newProductionUuid} mode=${mode} user=${user.id}, ${CREDITS_COST} credit(s) charged`)

    return new Response(JSON.stringify({
      productionUuid: newProductionUuid,
      status:         "processing",
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } })

  } catch (e) {
    console.error("[ROEX] Error:", e)
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }
})
