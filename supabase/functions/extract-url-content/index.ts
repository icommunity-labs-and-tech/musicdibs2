import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { url } = await req.json();
    if (!url) throw new Error("URL is required");

    let formattedUrl = url.trim();
    if (!formattedUrl.startsWith("http")) formattedUrl = `https://${formattedUrl}`;

    console.log("Extracting content from:", formattedUrl);

    const response = await fetch(formattedUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; MusicDibsBot/1.0)",
        "Accept": "text/html",
      },
    });

    if (!response.ok) throw new Error(`Failed to fetch URL: ${response.status}`);

    const html = await response.text();

    // Extract text content - remove scripts, styles, nav, footer, header
    let cleaned = html
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<nav[\s\S]*?<\/nav>/gi, "")
      .replace(/<footer[\s\S]*?<\/footer>/gi, "")
      .replace(/<header[\s\S]*?<\/header>/gi, "");

    // Try to find main content
    const articleMatch = cleaned.match(/<article[\s\S]*?<\/article>/i) ||
      cleaned.match(/<main[\s\S]*?<\/main>/i) ||
      cleaned.match(/<div[^>]*class="[^"]*(?:content|post|article|entry)[^"]*"[\s\S]*?<\/div>/i);

    const contentHtml = articleMatch ? articleMatch[0] : cleaned;

    // Extract title
    const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) ||
      html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
    const title = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, "").trim() : "";

    // Extract meta description
    const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([\s\S]*?)["']/i);
    const description = descMatch ? descMatch[1].trim() : "";

    // Strip HTML tags for plain text
    const textContent = contentHtml
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 10000); // Limit to avoid token overflow

    return new Response(JSON.stringify({
      title,
      description,
      content: textContent,
      url: formattedUrl,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("extract-url-content error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Failed to extract content" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
