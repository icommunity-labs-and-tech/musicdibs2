import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const BASE_URL = "https://musicdibs.com";

const STATIC_ROUTES = [
  { path: "/", priority: "1.0", changefreq: "weekly" },
  { path: "/faq", priority: "0.7", changefreq: "monthly" },
  { path: "/contact", priority: "0.6", changefreq: "monthly" },
  { path: "/distribution", priority: "0.8", changefreq: "monthly" },
  { path: "/marketing", priority: "0.7", changefreq: "monthly" },
  { path: "/partners", priority: "0.7", changefreq: "monthly" },
  { path: "/news", priority: "0.8", changefreq: "daily" },
  { path: "/verify", priority: "0.5", changefreq: "monthly" },
  { path: "/legal-validity", priority: "0.5", changefreq: "monthly" },
  { path: "/sla", priority: "0.3", changefreq: "yearly" },
  { path: "/privacy", priority: "0.3", changefreq: "yearly" },
  { path: "/terms", priority: "0.3", changefreq: "yearly" },
  { path: "/cookies", priority: "0.3", changefreq: "yearly" },
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch published blog post slugs
    const { data: posts } = await supabase
      .from("blog_posts")
      .select("slug, updated_at, language")
      .eq("published", true)
      .order("published_at", { ascending: false });

    const today = new Date().toISOString().split("T")[0];

    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
`;

    // Static routes
    for (const route of STATIC_ROUTES) {
      xml += `  <url>
    <loc>${BASE_URL}${route.path}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${route.changefreq}</changefreq>
    <priority>${route.priority}</priority>
  </url>
`;
    }

    // Blog posts (only unique slugs — avoid duplicating per language)
    const seenSlugs = new Set<string>();
    if (posts) {
      for (const post of posts) {
        if (seenSlugs.has(post.slug)) continue;
        seenSlugs.add(post.slug);
        const lastmod = post.updated_at
          ? post.updated_at.split("T")[0]
          : today;
        xml += `  <url>
    <loc>${BASE_URL}/news/${post.slug}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>
`;
      }
    }

    xml += `</urlset>`;

    return new Response(xml, {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (error) {
    console.error("Sitemap generation error:", error);
    return new Response("Error generating sitemap", {
      status: 500,
      headers: corsHeaders,
    });
  }
});
