import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser(
      authHeader.replace("Bearer ", "")
    )
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } })
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } })
    }

    const {
      description,
      genre,
      mood,
      style,
      language,
      rhymeScheme,
      structure,
      artistRefs,
      pov,
      theme,
      regenerateSection,
      existingLyrics,
    } = await req.json()

    const systemPrompt = `Eres un compositor profesional de letras musicales con 20 años de experiencia.
Generas letras originales, creativas y de alta calidad en cualquier idioma y género.

REGLAS DE FORMATO:
- Usa etiquetas claras: [Verso 1], [Coro], [Verso 2], [Puente], [Outro], etc.
- Cada verso tiene entre 4 y 8 líneas
- El coro se repite y debe ser memorable y pegadizo
- Mantén coherencia temática y narrativa entre secciones
- Respeta el esquema de rima indicado en TODOS los versos

ANÁLISIS DE SÍLABAS:
- Después de cada línea, añade entre paréntesis el número de sílabas
- Ejemplo: "Camino solo por la ciudad (9)"
- Intenta mantener sílabas similares entre líneas del mismo patrón

ESQUEMAS DE RIMA:
- ABAB: líneas alternas riman entre sí
- AABB: pares de líneas consecutivas riman
- ABCB: solo riman la 2ª y 4ª línea
- Libre: sin rima obligatoria, prioriza fluidez y emoción

Devuelve SOLO la letra con sus etiquetas y el conteo de sílabas.
No añadas explicaciones, comentarios ni introducciones.`

    let userPrompt = `Compón una letra musical con estas características:\n\n`

    if (description) userPrompt += `DESCRIPCIÓN: ${description}\n`
    if (genre)       userPrompt += `GÉNERO: ${genre}\n`
    if (mood)        userPrompt += `MOOD/TONO: ${mood}\n`
    if (style)       userPrompt += `ESTILO LÍRICO: ${style}\n`
    if (language)    userPrompt += `IDIOMA: ${language}\n`
    if (rhymeScheme) userPrompt += `ESQUEMA DE RIMA: ${rhymeScheme}\n`
    if (theme)       userPrompt += `TEMA CENTRAL: ${theme}\n`
    if (pov)         userPrompt += `PUNTO DE VISTA: ${pov}\n`

    if (artistRefs?.length > 0) {
      userPrompt += `REFERENCIAS DE ARTISTAS: Escribe con el estilo de ${artistRefs.join(", ")}\n`
    }

    if (structure) {
      userPrompt += `ESTRUCTURA: ${structure}\n`
    } else {
      userPrompt += `ESTRUCTURA: Verso 1 + Coro + Verso 2 + Coro + Puente + Coro final\n`
    }

    if (regenerateSection && existingLyrics) {
      userPrompt = `Tengo esta letra:\n\n${existingLyrics}\n\n` +
        `Regenera SOLO la sección [${regenerateSection}] manteniendo el resto intacto.\n` +
        `Mantén el mismo esquema de rima, idioma y estilo.\n` +
        `Devuelve la letra COMPLETA con la sección regenerada.`
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    })

    if (!response.ok) {
      const errText = await response.text()
      console.error("[LYRICS] AI gateway error:", response.status, errText)

      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Demasiadas solicitudes, espera un momento." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } })
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos de IA agotados. Recarga en Ajustes > Workspace > Uso." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } })
      }

      return new Response(JSON.stringify({ error: "Error al generar letra" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } })
    }

    const data = await response.json()
    const lyrics = data.choices?.[0]?.message?.content || ""

    console.log(`[LYRICS] Generated for user ${user.id}, ${lyrics.length} chars`)

    // Guardar en BBDD
    try {
      const supabaseAdmin = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      )
      await supabaseAdmin.from("lyrics_generations").insert({
        user_id:      user.id,
        description,
        theme,
        genre,
        mood,
        style,
        language,
        rhyme_scheme: rhymeScheme,
        structure,
        artist_refs:  artistRefs,
        pov,
        lyrics,
      })
    } catch (e) {
      console.error("[LYRICS] Error saving to DB:", e)
    }

    return new Response(
      JSON.stringify({ lyrics }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )

  } catch (e) {
    console.error("[LYRICS] Error:", e)
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }
})
