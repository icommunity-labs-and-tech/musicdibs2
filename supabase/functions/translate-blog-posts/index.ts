import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY")!;

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Get all English posts
    const { data: posts, error } = await supabase
      .from("blog_posts")
      .select("*")
      .eq("language", "en")
      .eq("published", true);

    if (error) throw error;
    if (!posts || posts.length === 0) {
      return new Response(JSON.stringify({ message: "No posts to translate" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const targetLanguages = [
      { code: "es", name: "Spanish" },
      { code: "pt", name: "Brazilian Portuguese" },
    ];

    let translated = 0;

    for (const post of posts) {
      for (const lang of targetLanguages) {
        // Check if translation already exists
        const { data: existing } = await supabase
          .from("blog_posts")
          .select("id")
          .eq("slug", `${post.slug}-${lang.code}`)
          .maybeSingle();

        if (existing) continue;

        // Translate title and excerpt using AI
        const prompt = `Translate the following to ${lang.name}. Return ONLY a JSON object with "title" and "excerpt" keys. No markdown, no code blocks, just pure JSON.

Title: ${post.title}
Excerpt: ${post.excerpt || ""}`;

        const aiResponse = await fetch("https://ai-gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${lovableApiKey}`,
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              { role: "system", content: "You are a professional translator. Return only valid JSON with 'title' and 'excerpt' keys. No markdown formatting." },
              { role: "user", content: prompt },
            ],
            temperature: 0.3,
          }),
        });

        const aiData = await aiResponse.json();
        const content = aiData.choices?.[0]?.message?.content?.trim();

        let translatedData: { title: string; excerpt: string };
        try {
          // Strip markdown code blocks if present
          const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
          translatedData = JSON.parse(cleaned);
        } catch {
          console.error(`Failed to parse translation for ${post.slug} to ${lang.code}:`, content);
          continue;
        }

        // Insert translated post
        const { error: insertError } = await supabase.from("blog_posts").insert({
          title: translatedData.title,
          slug: `${post.slug}-${lang.code}`,
          excerpt: translatedData.excerpt || post.excerpt,
          content: post.content,
          image_url: post.image_url,
          category: post.category,
          tags: post.tags,
          author: post.author,
          published: true,
          published_at: post.published_at,
          language: lang.code,
        });

        if (insertError) {
          console.error(`Insert error for ${post.slug}-${lang.code}:`, insertError);
        } else {
          translated++;
        }
      }
    }

    return new Response(
      JSON.stringify({ message: `Translated ${translated} posts` }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
