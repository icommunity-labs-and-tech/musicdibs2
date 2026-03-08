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

    const body = await req.json();
    const { postId, sourceLanguage, targetLanguages: requestedLangs } = body;

    // Single post translation mode
    if (postId) {
      const { data: post, error } = await supabase
        .from("blog_posts")
        .select("*")
        .eq("id", postId)
        .single();

      if (error || !post) throw new Error("Post not found");

      const sourceLang = sourceLanguage || post.language || "es";
      const allLangs = ["es", "en", "pt"];
      const targets = requestedLangs || allLangs.filter((l: string) => l !== sourceLang);

      const results: any[] = [];

      for (const lang of targets) {
        const langName = lang === "es" ? "Spanish" : lang === "en" ? "English" : "Brazilian Portuguese";

        // Translate title, excerpt, and content
        const prompt = `Translate the following blog article to ${langName}. Return ONLY a valid JSON object with these keys:
- "title": translated title
- "excerpt": translated excerpt  
- "content": translated content (keep ALL HTML tags exactly as they are, only translate the text inside them)

IMPORTANT: Keep all HTML formatting intact. Only translate the text content. Do NOT wrap in markdown code blocks.

Title: ${post.title}

Excerpt: ${post.excerpt || ""}

Content: ${post.content || ""}`;

        const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${lovableApiKey}`,
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              { role: "system", content: "You are a professional translator specializing in music industry content. Return only valid JSON. Preserve all HTML tags in the content field." },
              { role: "user", content: prompt },
            ],
            temperature: 0.3,
          }),
        });

        const aiData = await aiResponse.json();
        let rawContent = aiData.choices?.[0]?.message?.content?.trim() || "";
        
        // Strip markdown code blocks
        rawContent = rawContent.replace(/^```(?:json)?\s*\n?/i, "").replace(/\n?```\s*$/i, "").trim();

        let translatedData: { title: string; excerpt: string; content: string };
        try {
          const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
          translatedData = JSON.parse(jsonMatch ? jsonMatch[0] : rawContent);
        } catch {
          console.error(`Failed to parse translation to ${lang}:`, rawContent.substring(0, 200));
          results.push({ language: lang, success: false, error: "Parse error" });
          continue;
        }

        // Clean content field
        if (translatedData.content) {
          translatedData.content = translatedData.content
            .replace(/^```(?:html)?\s*\n?/i, "")
            .replace(/\n?```\s*$/i, "")
            .trim();
        }

        // Build slug for target language (append language suffix)
        const baseSlug = post.slug
          .replace(/-es$/, "")
          .replace(/-en$/, "")
          .replace(/-pt$/, "");
        const translatedSlug = `${baseSlug}-${lang}`;

        // Check if translation already exists
        const { data: existing } = await supabase
          .from("blog_posts")
          .select("id")
          .eq("slug", translatedSlug)
          .eq("language", lang)
          .maybeSingle();

        const payload = {
          title: translatedData.title || post.title,
          slug: translatedSlug,
          excerpt: translatedData.excerpt || post.excerpt,
          content: translatedData.content || post.content,
          image_url: post.image_url,
          category: post.category,
          tags: post.tags,
          author: post.author,
          published: post.published,
          published_at: post.published_at,
          language: lang,
          updated_at: new Date().toISOString(),
        };

        if (existing) {
          const { error: updateError } = await supabase
            .from("blog_posts")
            .update(payload)
            .eq("id", existing.id);
          
          if (updateError) {
            results.push({ language: lang, success: false, error: updateError.message });
          } else {
            results.push({ language: lang, success: true, action: "updated", id: existing.id });
          }
        } else {
          const { data: inserted, error: insertError } = await supabase
            .from("blog_posts")
            .insert(payload)
            .select("id")
            .single();

          if (insertError) {
            results.push({ language: lang, success: false, error: insertError.message });
          } else {
            results.push({ language: lang, success: true, action: "created", id: inserted.id });
          }
        }
      }

      return new Response(JSON.stringify({ results }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Bulk translation mode (legacy)
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
        const { data: existing } = await supabase
          .from("blog_posts")
          .select("id")
          .eq("slug", post.slug)
          .eq("language", lang.code)
          .maybeSingle();

        if (existing) continue;

        const prompt = `Translate the following to ${lang.name}. Return ONLY a JSON object with "title", "excerpt", and "content" keys. Preserve all HTML in content. No markdown code blocks.

Title: ${post.title}
Excerpt: ${post.excerpt || ""}
Content: ${post.content || ""}`;

        const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${lovableApiKey}`,
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              { role: "system", content: "You are a professional translator. Return only valid JSON. Preserve HTML tags." },
              { role: "user", content: prompt },
            ],
            temperature: 0.3,
          }),
        });

        const aiData = await aiResponse.json();
        let rawContent = aiData.choices?.[0]?.message?.content?.trim() || "";
        rawContent = rawContent.replace(/^```(?:json)?\s*\n?/i, "").replace(/\n?```\s*$/i, "").trim();

        let translatedData: { title: string; excerpt: string; content?: string };
        try {
          const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
          translatedData = JSON.parse(jsonMatch ? jsonMatch[0] : rawContent);
        } catch {
          console.error(`Failed to parse translation for ${post.slug} to ${lang.code}`);
          continue;
        }

        const { error: insertError } = await supabase.from("blog_posts").insert({
          title: translatedData.title,
          slug: post.slug,
          excerpt: translatedData.excerpt || post.excerpt,
          content: translatedData.content || post.content,
          image_url: post.image_url,
          category: post.category,
          tags: post.tags,
          author: post.author,
          published: true,
          published_at: post.published_at,
          language: lang.code,
        });

        if (insertError) {
          console.error(`Insert error for ${post.slug} ${lang.code}:`, insertError);
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
