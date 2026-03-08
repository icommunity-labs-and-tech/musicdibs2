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
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const body = await req.json().catch(() => ({}));
    const limit = body.limit || 5;
    const lang = body.language || null;

    let query = supabase
      .from("blog_posts")
      .select("id, slug, language, title, content")
      .eq("published", true)
      .is("content", null)
      .limit(limit);

    if (lang) {
      query = query.eq("language", lang);
    }

    const { data: posts, error } = await query;
    if (error) throw error;

    const getOriginalUrl = (slug: string, language: string): string => {
      let baseSlug = slug;
      if (language === "es" && slug.endsWith("-es")) {
        baseSlug = slug.slice(0, -3);
      } else if (language === "pt" && slug.endsWith("-pt")) {
        baseSlug = slug.slice(0, -3);
      }
      const langPath = language === "en" ? "en" : language === "es" ? "es" : "pt";
      return `https://musicdibs.com/${langPath}/${baseSlug}/`;
    };

    let updated = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const post of posts || []) {
      const url = getOriginalUrl(post.slug, post.language);

      try {
        console.log(`Fetching: ${url}`);
        let response = await fetch(url, {
          headers: { "User-Agent": "Mozilla/5.0 (compatible; MusicDibsBot/1.0)" },
        });

        // Fallback to EN version for non-EN posts
        if (!response.ok && post.language !== "en") {
          let baseSlug = post.slug;
          if (post.language === "es" && baseSlug.endsWith("-es")) baseSlug = baseSlug.slice(0, -3);
          else if (post.language === "pt" && baseSlug.endsWith("-pt")) baseSlug = baseSlug.slice(0, -3);
          const enUrl = `https://musicdibs.com/en/${baseSlug}/`;
          console.log(`Fallback EN: ${enUrl}`);
          response = await fetch(enUrl, {
            headers: { "User-Agent": "Mozilla/5.0 (compatible; MusicDibsBot/1.0)" },
          });
        }

        if (!response.ok) {
          errors.push(`${post.slug}: HTTP ${response.status}`);
          failed++;
          continue;
        }

        const html = await response.text();
        const content = extractContent(html);

        if (!content) {
          errors.push(`${post.slug}: No content found`);
          failed++;
          continue;
        }

        const { error: updateError } = await supabase
          .from("blog_posts")
          .update({ content })
          .eq("id", post.id);

        if (updateError) {
          errors.push(`${post.slug}: ${updateError.message}`);
          failed++;
        } else {
          updated++;
          console.log(`Updated: ${post.slug} (${content.length} chars)`);
        }

        await new Promise((r) => setTimeout(r, 300));
      } catch (e) {
        errors.push(`${post.slug}: ${e.message}`);
        failed++;
      }
    }

    return new Response(
      JSON.stringify({ updated, failed, remaining: (posts?.length || 0) - updated - failed, errors }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function extractContent(html: string): string | null {
  const startMarker = '<div class="post-content">';
  const startIdx = html.indexOf(startMarker);
  if (startIdx === -1) return null;

  const contentStart = startIdx + startMarker.length;
  const metaIdx = html.indexOf('fusion-meta-info', contentStart);
  if (metaIdx === -1) return null;

  // Walk backward from fusion-meta-info to find the closing </div>
  const searchArea = html.substring(contentStart, metaIdx);
  const lastDivClose = searchArea.lastIndexOf('</div>');
  if (lastDivClose === -1) return null;

  const rawContent = searchArea.substring(0, lastDivClose);
  return cleanContent(rawContent);
}

function cleanContent(html: string): string {
  let c = html.trim();
  c = c.replace(/<p>\s*&nbsp;\s*<\/p>/g, "");
  c = c.replace(/\n{3,}/g, "\n\n");
  c = c.replace(/ class="wp-[^"]*"/g, "");
  // Remove target and rel attributes from links for cleanliness
  c = c.replace(/ target="_blank"/g, "");
  c = c.replace(/ rel="[^"]*"/g, "");
  return c.trim();
}
