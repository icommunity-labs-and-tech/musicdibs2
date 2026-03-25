import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
}

const AUPHONIC_MODES: Record<string, {
  label: string
  algorithms: Record<string, any>
}> = {
  professional: {
    label: "Sonar profesional",
    algorithms: {
      leveler: true,
      levelerstrength: 80,
      compressor_music: "medium",
      msclassifier: "music",
      normloudness: true,
      loudnesstarget: -14,
      maxpeak: -1,
      filtering: true,
      filtermethod: "autoeq",
      denoise: false,
    },
  },
  spotify: {
    label: "Listo para Spotify",
    algorithms: {
      leveler: true,
      levelerstrength: 70,
      compressor_music: "soft",
      msclassifier: "music",
      normloudness: true,
      loudnesstarget: -14,
      maxpeak: -1,
      filtering: true,
      filtermethod: "hipfilter",
      denoise: false,
    },
  },
  denoise: {
    label: "Limpiar ruido de fondo",
    algorithms: {
      leveler: false,
      normloudness: true,
      loudnesstarget: -14,
      maxpeak: -1,
      filtering: true,
      filtermethod: "hipfilter",
      denoise: true,
      denoisemethod: "music",
      denoiseamount: 12,
    },
  },
  clarity: {
    label: "Más brillo y claridad",
    algorithms: {
      leveler: true,
      levelerstrength: 60,
      compressor_music: "soft",
      msclassifier: "music",
      normloudness: true,
      loudnesstarget: -14,
      maxpeak: -1,
      filtering: true,
      filtermethod: "bwe",
      denoise: false,
    },
  },
  reverb: {
    label: "Quitar eco de habitación",
    algorithms: {
      leveler: false,
      normloudness: true,
      loudnesstarget: -14,
      maxpeak: -1,
      filtering: true,
      filtermethod: "hipfilter",
      denoise: true,
      denoisemethod: "dynamic",
      denoiseamount: 6,
      deverbamount: 12,
    },
  },
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

    const AUPHONIC_API_KEY = Deno.env.get("AUPHONIC_API_KEY")
    if (!AUPHONIC_API_KEY) {
      return new Response(JSON.stringify({ error: "AUPHONIC_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } })
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    )

    const { action, mode, audioUrl, filename, productionUuid } = await req.json()

    // ── ACTION: STATUS ──────────────────────────────────────
    if (action === "status") {
      if (!productionUuid) {
        return new Response(JSON.stringify({ error: "productionUuid required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } })
      }

      const statusRes = await fetch(
        `https://auphonic.com/api/production/${productionUuid}.json`,
        { headers: { "Authorization": `Bearer ${AUPHONIC_API_KEY}` } }
      )
      const statusData = await statusRes.json()
      const prod = statusData.data

      const done    = prod.status_string === "Done"
      const errored = prod.status_string === "Error"

      let outputUrl: string | null = null
      if (done && prod.output_files?.length > 0) {
        const mp3 = prod.output_files.find((f: any) =>
          f.download_url?.endsWith(".mp3")
        )
        outputUrl = mp3?.download_url || prod.output_files[0]?.download_url || null
      }

      if (done || errored) {
        await supabaseAdmin
          .from("auphonic_productions")
          .update({
            status:       done ? "done" : "error",
            output_url:   outputUrl,
            error_detail: errored ? (prod.error_message || "Auphonic processing error") : null,
            updated_at:   new Date().toISOString(),
          })
          .eq("auphonic_uuid", productionUuid)
          .eq("user_id", user.id)
      }

      // Re-upload resultado a Supabase Storage para URL pública estable
      if (done && outputUrl) {
        try {
          const audioRes = await fetch(outputUrl, {
            headers: { "Authorization": `Bearer ${AUPHONIC_API_KEY}` }
          })
          if (audioRes.ok) {
            const audioBuffer = await audioRes.arrayBuffer()
            const fileName = `auphonic-result/${user.id}/${productionUuid}.mp3`

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
          console.error("[AUPHONIC] Error re-uploading result:", e)
        }
      }

      return new Response(JSON.stringify({
        status:    prod.status_string,
        done,
        errored,
        outputUrl,
        progress:  prod.status_progress ?? 0,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } })
    }

    // ── ACTION: PROCESS ─────────────────────────────────────
    if (action !== "process") {
      return new Response(JSON.stringify({ error: "Invalid action" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } })
    }

    const modeConfig = AUPHONIC_MODES[mode]
    if (!modeConfig) {
      return new Response(JSON.stringify({ error: `Invalid mode: ${mode}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } })
    }

    if (!audioUrl) {
      return new Response(JSON.stringify({ error: "audioUrl required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } })
    }

    const productionBody = {
      input_file:   audioUrl,
      metadata:     { title: filename || "MusicDibs Enhancement" },
      algorithms:   modeConfig.algorithms,
      output_files: [{ format: "mp3", bitrate: "192" }],
      action:       "start",
    }

    const auphRes = await fetch("https://auphonic.com/api/productions.json", {
      method: "POST",
      headers: {
        "Content-Type":  "application/json",
        "Authorization": `Bearer ${AUPHONIC_API_KEY}`,
      },
      body: JSON.stringify(productionBody),
    })

    if (!auphRes.ok) {
      const errText = await auphRes.text()
      console.error("[AUPHONIC] API error:", errText)
      return new Response(JSON.stringify({ error: `Auphonic error: ${auphRes.status}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } })
    }

    const auphData = await auphRes.json()
    const newProductionUuid = auphData.data?.uuid

    if (!newProductionUuid) {
      return new Response(JSON.stringify({ error: "No production UUID from Auphonic" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } })
    }

    await supabaseAdmin.from("auphonic_productions").insert({
      user_id:       user.id,
      auphonic_uuid: newProductionUuid,
      mode,
      status:        "processing",
      input_url:     audioUrl,
    })

    console.log(`[AUPHONIC] Production started: ${newProductionUuid} mode=${mode} user=${user.id}`)

    return new Response(JSON.stringify({
      productionUuid: newProductionUuid,
      status:         "processing",
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } })

  } catch (e) {
    console.error("[AUPHONIC] Error:", e)
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }
})
