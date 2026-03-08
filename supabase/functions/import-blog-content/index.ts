import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Mapping from DB slug (EN) to actual musicdibs.com slug
const SLUG_MAP: Record<string, string> = {
  "what-is-an-oac-on-youtube-and-how-to-set-it-up": "what-is-an-official-artist-channel-oac-on-youtube-and-how-to-set-it-up",
  "apple-music-for-artists-how-to-claim-your-profile": "apple-music-for-artists-how-to-claim-your-profile-and-make-the-most-of-it",
  "work-made-with-ai-or-by-ai-legal-difference": "work-made-with-ai-or-by-ai-understand-the-legal-difference-and-how-to-register-your-creation",
  "musicdibs-launches-new-music-distribution-feature": "musicdibs-launches-its-new-music-distribution-feature-protect-and-release-your-music-from-one-single-place",
  "interview-with-alba-mbengue": "interview-with-alba-mbengue-growth-without-losing-its-essence",
  "over-400-artists-demand-copyright-protection-ai": "over-400-artists-demand-copyright-protection-amid-the-rise-of-ai",
  "interview-with-kyra-new-stage": "interview-with-kyra-how-her-new-stage-is-born",
  "legal-validity-of-registering-on-musicdibs": "what-is-the-legal-validity-of-registering-your-song-on-musicdibs",
  "interview-caracazador": "interview-to-caracazador-the-art-of-making-pop-from-the-intimate",
  "dibs-listed-on-biconomy": "dibs-is-listed-on-biconomy-a-new-milestone-for-musicdibs",
  "winners-of-musicdibs-awards": "the-winners-of-the-musicdibs-awards-are-here",
  "interview-alcala-norte": "interview-with-alcala-norte-from-small-venues-to-conquering-festivals",
  "protect-music-in-the-metaverse": "how-to-protect-your-music-in-the-metaverse-copyrights-and-new-opportunities",
  "dibs-token-listed-march-1": "the-dibs-token-will-be-listed-on-march-1",
  "common-mistakes-registering-music-copyrights": "the-most-common-mistakes-when-registering-music-copyrights-and-how-to-avoid-them",
  "interview-zpu-25-years-hip-hop": "interview-with-zpu-25-years-of-hip-hop-and-personal-growth",
  "interview-sofos-redefining-urban-music": "sofos-a-decade-redefining-urban-music",
  "dibs-token-presale-success": "success-in-the-dibs-token-presale-announcement-of-the-public-sale",
  "interview-dlyro": "dlyro-the-artist-who-transforms-emotions-into-music",
  "dibs-token-purchase-guide": "guia-de-compra-de-token-dibs",
  "musicdibs-at-merge-madrid": "musicdibs-will-be-at-merge-madrid-the-worlds-leading-web3-event",
  "musicdibs-dibs-token-new-era-web3": "musicdibs-dibs-token-the-new-era-of-music-protection-in-web3",
  "how-to-reserve-dibs-tokens": "how-to-reserve-your-dibs-tokens-on-musicdibs-step-by-step-guide",
  "launching-dibs-token-artists-fans": "we-are-launching-the-dibs-token-for-artists-and-fans-participate-and-get-200-free-tokens-upon-registration",
  "intellectual-property-vs-copyright": "are-intellectual-property-and-copyright-the-same-thing",
  "importance-of-personal-branding-musicians": "the-importance-of-personal-branding-for-musicians-and-artists",
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
    const limit = body.limit || 10;
    const lang = body.language || null;

    let query = supabase
      .from("blog_posts")
      .select("id, slug, language, title, content")
      .eq("published", true)
      .is("content", null)
      .limit(limit);

    if (lang) query = query.eq("language", lang);

    const { data: posts, error } = await query;
    if (error) throw error;

    let updated = 0;
    let failed = 0;
    const errors: string[] = [];
    const results: string[] = [];

    for (const post of posts || []) {
      // Get the base EN slug (strip -es or -pt suffix)
      let baseSlug = post.slug;
      if (post.language === "es" && baseSlug.endsWith("-es")) baseSlug = baseSlug.slice(0, -3);
      else if (post.language === "pt" && baseSlug.endsWith("-pt")) baseSlug = baseSlug.slice(0, -3);

      // Apply slug mapping
      const mappedSlug = SLUG_MAP[baseSlug] || baseSlug;

      // Try native language first, then EN fallback
      const langPath = post.language === "en" ? "en" : post.language === "es" ? "es" : "pt";
      const urls = [
        `https://musicdibs.com/${langPath}/${mappedSlug}/`,
        ...(post.language !== "en" ? [`https://musicdibs.com/en/${mappedSlug}/`] : []),
      ];

      let content: string | null = null;

      for (const url of urls) {
        try {
          console.log(`Fetching: ${url}`);
          const response = await fetch(url, {
            headers: { "User-Agent": "Mozilla/5.0 (compatible; MusicDibsBot/1.0)" },
          });
          if (!response.ok) continue;

          const html = await response.text();
          content = extractContent(html);
          if (content) {
            console.log(`Found content from ${url} (${content.length} chars)`);
            break;
          }
        } catch (e) {
          console.error(`Fetch error for ${url}: ${e.message}`);
        }
      }

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
        results.push(`${post.slug}: ${content.length} chars`);
      }

      await new Promise((r) => setTimeout(r, 300));
    }

    return new Response(
      JSON.stringify({ updated, failed, total: posts?.length || 0, results, errors }),
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
  c = c.replace(/ target="_blank"/g, "");
  c = c.replace(/ rel="[^"]*"/g, "");
  return c.trim();
}
