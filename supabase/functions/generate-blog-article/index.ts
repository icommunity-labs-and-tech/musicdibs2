import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { referenceText, section, currentTitle, currentExcerpt, currentContent, language } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

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
      // Generate all
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

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      const status = response.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Límite de solicitudes excedido. Inténtalo de nuevo en unos momentos." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes. Añade créditos en Settings > Workspace > Usage." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", status, t);
      throw new Error(`AI gateway error: ${status}`);
    }

    const data = await response.json();
    let content = data.choices?.[0]?.message?.content || "";

    // Strip markdown code blocks if the AI wrapped the response
    content = content.replace(/^```(?:json|html)?\s*\n?/i, "").replace(/\n?```\s*$/i, "").trim();

    let result: any;
    if (section) {
      // For individual sections, also clean up any quotes the AI might add
      let value = content.trim();
      // Remove surrounding quotes
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      result = { section, value };
    } else {
      // Parse JSON from the response
      try {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          // Clean the content field - remove any nested code blocks
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
