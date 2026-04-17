import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

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
      "Content-Type":  "application/json",
      "Authorization": `Bearer ${ROEX_API_KEY}`,
    }

    const modeConfig = ROEX_MODES[mode] || DEFAULT_MODE

    // ── ACTION: STATUS ──────────────────────────────────────
    if (action === "status") {
      if (!productionUuid) {
        return new Response(JSON.stringify({ error: "productionUuid required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } })
      }

      const endpoint = isPreview
        ? `${ROEX_BASE_URL}/masteringpreview/${productionUuid}`
        : `${ROEX_BASE_URL}/mastering/${productionUuid}`

      const statusRes = await fetch(endpoint, { headers: roexHeaders })
      const statusData = await statusRes.json()

      const roexStatus = String(statusData.status || statusData.task_status || "").toUpperCase()
      const done    = roexStatus === "SUCCESS"
      const errored = roexStatus === "ERROR" || roexStatus === "FAILED"
      const progress = done ? 100 : (errored ? 0 : 50)

      let outputUrl: string | null = statusData.output_file_url || statusData.outputUrl || null

      if ((done || errored) && !isPreview) {
        await supabaseAdmin
          .from("auphonic_productions")
          .update({
            status:       done ? "done" : "error",
            output_url:   outputUrl,
            error_detail: errored ? (statusData.error_message || statusData.message || "RoEx processing error") : null,
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
              description: `Reembolso: fallo RoEx (${statusData.error_message || "error"})`.slice(0, 200),
            })
            console.log(`[ROEX] Refunded ${CREDITS_COST} credit to user ${user.id}: processing error`)
          }
        }
      }

      // Re-upload result to Supabase Storage for stable public URL (only for full process, not preview)
      if (done && outputUrl && !isPreview) {
        try {
          const audioRes = await fetch(outputUrl)
          if (audioRes.ok) {
            const audioBuffer = await audioRes.arrayBuffer()
            const fileName = `roex-result/${user.id}/${productionUuid}.mp3`

            const { error: uploadError } = await supabaseAdmin
              .storage
              .from("auphonic-temp")
              .upload(fileName, audioBuffer, {
                contentType: "audio/mpeg",
                upsert: true,
              })

            if (!uploadError) {
              const { data: publicData } = supabaseAdmin
                .storage
                .from("auphonic-temp")
                .getPublicUrl(fileName)

              outputUrl = publicData.publicUrl

              await supabaseAdmin
                .from("auphonic_productions")
                .update({ output_url: outputUrl })
                .eq("auphonic_uuid", productionUuid)
            }
          }
        } catch (e) {
          console.error("[ROEX] Error re-uploading result:", e)
        }
      }

      return new Response(JSON.stringify({
        status: roexStatus,
        done,
        errored,
        outputUrl,
        progress,
        isPreview: !!isPreview,
        errorMessage: errored ? (statusData.error_message || statusData.message || null) : null,
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

    // ── ACTION: PROCESS ─────────────────────────────────────
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

    const masteringBody = {
      masteringData: {
        trackData: [{ trackURL: audioUrl }],
        musicalStyle: modeConfig.musicalStyle,
        desiredLoudness: modeConfig.desiredLoudness,
        stereoWidth: "NORMAL",
      },
    }

    const roexRes = await fetch(`${ROEX_BASE_URL}/mastering`, {
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
