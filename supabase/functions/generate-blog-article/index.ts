import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function requireAdmin(req: Request): Promise<{ ok: true } | { ok: false; response: Response }> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return { ok: false, response: new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }) };
  }
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!);
  const token = authHeader.replace("Bearer ", "");
  const { data, error } = await supabase.auth.getClaims(token);
  if (error || !data?.claims?.sub) {
    return { ok: false, response: new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }) };
  }
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: roleRow } = await admin.from("user_roles").select("role").eq("user_id", data.claims.sub).eq("role", "admin").maybeSingle();
  if (!roleRow) {
    return { ok: false, response: new Response(JSON.stringify({ error: "Forbidden: admin role required" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }) };
  }
  return { ok: true };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const auth = await requireAdmin(req);
    if (!auth.ok) return auth.response;

    const { referenceText, section, currentTitle, currentExcerpt, currentContent, language } = await req.json();

    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY is not configured");

    const lang = language || "es";
    const langName = lang === "es" ? "español" : lang === "en" ? "inglés" : "portugués";

    let systemPrompt = "";
    let userPrompt = "";

    if (section === "title") {
      systemPrompt = `Eres un redactor experto en marketing musical y SEO. Genera SOLO un título de artículo de blog atractivo y optimizado para SEO en ${langName}. Devuelve SOLO el título, sin comillas ni explicaciones.`;
      userPrompt = `Basándote en este contenido de referencia, genera un título de blog:\n\n${referenceText || currentContent || ""}`;
    } else if (section === "excerpt") {
      systemPrompt = `Eres un redactor experto. Genera SOLO un extracto/resumen de 2-3 frases para un artículo de blog en ${langName}. Devuelve SOLO el extracto, sin comillas.`;
      userPrompt = `Título: ${currentTitle}\n\nContenido de referencia:\n${referenceText || currentContent || ""}\n\nGenera un extracto atractivo.`;
    } else if (section === "content") {
      systemPrompt = `Eres un redactor experto en la industria musical. Genera el contenido completo de un artículo de blog en ${langName} usando formato HTML. Usa etiquetas <h2>, <h3>, <p>, <ul>, <li>, <strong>, <a> según corresponda. NO incluyas el título principal (h1). El artículo debe ser informativo, bien estructurado y de al menos 800 palabras. IMPORTANTE: Devuelve SOLO el HTML puro, sin bloques de código markdown, sin \`\`\`html, sin comillas envolventes.`;
      userPrompt = `Título: ${currentTitle || "Artículo sobre música"}\nExtracto: ${currentExcerpt || ""}\n\nTexto de referencia:\n${referenceText || ""}\n\nGenera el contenido completo del artículo en HTML puro.`;
    } else {
      systemPrompt = `Eres un redactor experto en la industria musical y distribución digital. Genera un artículo de blog completo en ${langName}. 

IMPORTANTE: Responde EXACTAMENTE en formato JSON válido con estas claves:
- "title": título SEO atractivo (string)
- "excerpt": extracto de 2-3 frases (string)
- "content": contenido HTML completo del artículo (string con HTML usando h2, h3, p, ul, li, strong, a - SIN h1, SIN envolver en bloques de código markdown)
- "tags": array de 3-5 tags relevantes (array de strings)
- "category": categoría del artículo (string)

El campo "content" debe contener HTML puro como string, NO código markdown. El artículo debe tener al menos 800 palabras.
NO envuelvas la respuesta en bloques de código markdown (\`\`\`). Devuelve SOLO el JSON puro.`;
      userPrompt = `Genera un artículo de blog basado en este texto de referencia:\n\n${referenceText}`;
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 4000,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      }),
    });

    if (!response.ok) {
      const status = response.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Límite de solicitudes excedido. Inténtalo de nuevo en unos momentos." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("Anthropic error:", status, t);
      throw new Error(`Anthropic error: ${status}`);
    }

    const data = await response.json();
    let content = data.content?.[0]?.text || "";

    // Strip markdown code blocks if the AI wrapped the response
    content = content.replace(/^```(?:json|html)?\s*\n?/i, "").replace(/\n?```\s*$/i, "").trim();

    let result: any;
    if (section) {
      let value = content.trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      result = { section, value };
    } else {
      try {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          if (parsed.content) {
            parsed.content = parsed.content
              .replace(/^```(?:html)?\s*\n?/i, "")
              .replace(/\n?```\s*$/i, "")
              .trim();
          }
          result = parsed;
        } else {
          result = { title: "", excerpt: "", content, tags: [], category: "Musicdibs" };
        }
      } catch {
        result = { title: "", excerpt: "", content, tags: [], category: "Musicdibs" };
      }
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-blog-article error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
