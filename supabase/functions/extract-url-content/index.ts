import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Block private, loopback, link-local, and metadata IP ranges
function isBlockedHostname(hostname: string): boolean {
  // Block common metadata and internal hostnames
  const blockedHosts = [
    "metadata.google.internal",
    "metadata.google",
    "kubernetes.default",
  ];
  if (blockedHosts.includes(hostname.toLowerCase())) return true;

  // Block IP-based hostnames in private/reserved ranges
  const ipPatterns = [
    /^127\./, // loopback
    /^10\./, // class A private
    /^192\.168\./, // class C private
    /^172\.(1[6-9]|2[0-9]|3[01])\./, // class B private
    /^169\.254\./, // link-local / cloud metadata
    /^0\./, // current network
    /^100\.(6[4-9]|[7-9]\d|1[0-1]\d|12[0-7])\./, // carrier-grade NAT
    /^::1$/, // IPv6 loopback
    /^fc00:/i, // IPv6 ULA
    /^fe80:/i, // IPv6 link-local
    /^fd/i, // IPv6 ULA
    /^localhost$/i,
  ];
  return ipPatterns.some((r) => r.test(hostname));
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Require authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2.57.2");
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { url } = await req.json();
    if (!url || typeof url !== "string") throw new Error("URL is required");

    let formattedUrl = url.trim();
    if (formattedUrl.length > 2048) throw new Error("URL too long");
    if (!formattedUrl.startsWith("http")) formattedUrl = `https://${formattedUrl}`;

    // Validate URL and block dangerous schemes/hosts
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(formattedUrl);
    } catch {
      throw new Error("Invalid URL format");
    }

    // Only allow http/https
    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      throw new Error("Only HTTP/HTTPS URLs are allowed");
    }

    // Block private/internal hostnames
    if (isBlockedHostname(parsedUrl.hostname)) {
      return new Response(JSON.stringify({ error: "Access to internal/private URLs is blocked" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Extracting content from:", formattedUrl);

    const response = await fetch(formattedUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; MusicDibsBot/1.0)",
        "Accept": "text/html",
      },
      redirect: "manual", // Don't follow redirects to prevent SSRF via redirect
    });

    // If redirect, validate the redirect target too
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get("Location");
      if (location) {
        try {
          const redirectUrl = new URL(location, formattedUrl);
          if (isBlockedHostname(redirectUrl.hostname) || !["http:", "https:"].includes(redirectUrl.protocol)) {
            return new Response(JSON.stringify({ error: "Redirect to internal/private URL blocked" }), {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
        } catch {
          // Invalid redirect URL
        }
      }
      throw new Error("URL redirected — please provide the final URL directly");
    }

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
      .slice(0, 10000);

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
