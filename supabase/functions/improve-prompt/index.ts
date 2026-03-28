import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { prompt, genre, mood, mode } = await req.json();
    if (!prompt?.trim()) {
      return new Response(JSON.stringify({ error: "prompt is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");

    const systemPrompt = `You are a music prompt engineer. Your job is to take a brief, vague music description and expand it into a vivid, detailed prompt optimized for AI music generation.

Rules:
- Keep the same language as the input (if Spanish, reply in Spanish)
- Add details about instrumentation, tempo, dynamics, texture, atmosphere
- If genre/mood context is provided, incorporate it naturally
- Keep it under 350 characters
- Do NOT add quotes or prefixes like "Improved:" — just return the improved text
- Preserve the user's core idea but make it much more descriptive and evocative`;

    const contextParts: string[] = [];
    if (genre) contextParts.push(`Genre: ${genre}`);
    if (mood) contextParts.push(`Mood: ${mood}`);
    if (mode) contextParts.push(`Mode: ${mode === 'song' ? 'Song with vocals' : 'Instrumental'}`);
    const context = contextParts.length ? `\n\nContext: ${contextParts.join(', ')}` : '';

    const res = await fetch("https://ai.lovable.dev/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `${prompt}${context}` },
        ],
        max_tokens: 500,
        temperature: 0.8,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("AI error:", errText);
      throw new Error("AI generation failed");
    }

    const data = await res.json();
    const improved = data.choices?.[0]?.message?.content?.trim();

    if (!improved) throw new Error("Empty response from AI");

    return new Response(JSON.stringify({ improved }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("improve-prompt error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
