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

    // Get posts without content
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

    // Build the URL for each post on musicdibs.com
    // English slugs match directly, ES slugs have -es suffix, PT slugs have -pt suffix
    const getOriginalUrl = (slug: string, language: string): string | null => {
      let baseSlug = slug;
      if (language === "es" && slug.endsWith("-es")) {
        baseSlug = slug.slice(0, -3);
      } else if (language === "pt" && slug.endsWith("-pt")) {
        baseSlug = slug.slice(0, -3);
      }

      // Map language to musicdibs.com URL path
      const langPath = language === "en" ? "en" : language === "es" ? "es" : "pt";
      return `https://musicdibs.com/${langPath}/${baseSlug}/`;
    };

    let updated = 0;
    let skipped = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const post of posts || []) {
      // Skip if already has content
      if (post.content && post.content.trim().length > 50) {
        skipped++;
        continue;
      }

      const url = getOriginalUrl(post.slug, post.language);
      if (!url) {
        errors.push(`No URL for ${post.slug}`);
        failed++;
        continue;
      }

      try {
        console.log(`Fetching: ${url}`);
        const response = await fetch(url, {
          headers: {
            "User-Agent": "Mozilla/5.0 (compatible; MusicDibsBot/1.0)",
          },
        });

        if (!response.ok) {
          // Try English version as fallback for translations
          if (post.language !== "en") {
            let baseSlug = post.slug;
            if (post.language === "es" && baseSlug.endsWith("-es")) {
              baseSlug = baseSlug.slice(0, -3);
            } else if (post.language === "pt" && baseSlug.endsWith("-pt")) {
              baseSlug = baseSlug.slice(0, -3);
            }
            const enUrl = `https://musicdibs.com/en/${baseSlug}/`;
            console.log(`Trying EN fallback: ${enUrl}`);
            const enResponse = await fetch(enUrl, {
              headers: {
                "User-Agent": "Mozilla/5.0 (compatible; MusicDibsBot/1.0)",
              },
            });
            if (!enResponse.ok) {
              errors.push(`${post.slug}: HTTP ${response.status} (and EN fallback ${enResponse.status})`);
              failed++;
              continue;
            }
            const html = await enResponse.text();
            const content = extractContent(html);
            if (content) {
              const { error: updateError } = await supabase
                .from("blog_posts")
                .update({ content })
                .eq("id", post.id);
              if (updateError) {
                errors.push(`${post.slug}: DB update error: ${updateError.message}`);
                failed++;
              } else {
                updated++;
              }
            } else {
              errors.push(`${post.slug}: No content found in EN fallback HTML`);
              failed++;
            }
            continue;
          }
          errors.push(`${post.slug}: HTTP ${response.status}`);
          failed++;
          continue;
        }

        const html = await response.text();
        const content = extractContent(html);

        if (!content) {
          errors.push(`${post.slug}: No content found in HTML`);
          failed++;
          continue;
        }

        const { error: updateError } = await supabase
          .from("blog_posts")
          .update({ content })
          .eq("id", post.id);

        if (updateError) {
          errors.push(`${post.slug}: DB update error: ${updateError.message}`);
          failed++;
        } else {
          updated++;
          console.log(`Updated: ${post.slug} (${content.length} chars)`);
        }

        // Small delay to be respectful
        await new Promise((r) => setTimeout(r, 500));
      } catch (e) {
        errors.push(`${post.slug}: ${e.message}`);
        failed++;
      }
    }

    return new Response(
      JSON.stringify({
        message: `Updated ${updated}, skipped ${skipped}, failed ${failed}`,
        total: posts?.length || 0,
        updated,
        skipped,
        failed,
        errors: errors.slice(0, 20),
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("Error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function extractContent(html: string): string | null {
  // Extract content from <div class="post-content">...</div>
  const match = html.match(/<div class="post-content">([\s\S]*?)<\/div>\s*\n?\s*<div class="fusion-meta-info"/);
  if (match) {
    return cleanContent(match[1]);
  }

  // Alternative pattern
  const match2 = html.match(/<div class="post-content">([\s\S]*?)<\/div>\s*\n?\s*<\/div>\s*\n?\s*<div class="fusion-meta-info"/);
  if (match2) {
    return cleanContent(match2[1]);
  }

  // Broader fallback: find post-content div
  const startIdx = html.indexOf('<div class="post-content">');
  if (startIdx === -1) return null;
  
  const contentStart = startIdx + '<div class="post-content">'.length;
  // Find the closing </div> that's followed by fusion-meta-info
  const metaIdx = html.indexOf('fusion-meta-info', contentStart);
  if (metaIdx === -1) return null;
  
  // Find the last </div> before fusion-meta-info
  let endIdx = metaIdx;
  while (endIdx > contentStart && html.substring(endIdx - 6, endIdx) !== '</div>') {
    endIdx--;
  }
  if (endIdx <= contentStart) return null;
  
  const rawContent = html.substring(contentStart, endIdx - 6);
  return cleanContent(rawContent);
}

function cleanContent(html: string): string {
  let content = html.trim();
  
  // Remove empty paragraphs with &nbsp;
  content = content.replace(/<p>&nbsp;<\/p>/g, "");
  
  // Clean up excessive whitespace but keep structure
  content = content.replace(/\n{3,}/g, "\n\n");
  
  // Remove WordPress-specific classes but keep the HTML structure
  content = content.replace(/ class="wp-[^"]*"/g, "");
  
  // Clean links to keep them functional - convert musicdibs.com internal links
  // Keep external links as-is
  
  return content.trim();
}
