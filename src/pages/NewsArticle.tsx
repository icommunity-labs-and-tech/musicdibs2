import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { SEO } from "@/components/SEO";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Calendar, ArrowLeft, Tag } from "lucide-react";
import { useTranslation } from "react-i18next";

const NewsArticle = () => {
  const { slug } = useParams<{ slug: string }>();
  const { t } = useTranslation();

  const { data: post, isLoading } = useQuery({
    queryKey: ["blog-post", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_posts")
        .select("*")
        .eq("slug", slug!)
        .eq("published", true)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!slug,
  });

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  };

  return (
    <div className="min-h-screen page-bg">
      <SEO
        title={post?.title || "Artículo"}
        description={post?.excerpt || ""}
        path={`/news/${slug}`}
      />
      <Navbar />

      <div className="pt-32 pb-20 px-6">
        <div className="max-w-3xl mx-auto">
          <Link
            to="/news"
            className="inline-flex items-center gap-2 text-white/50 hover:text-white text-sm mb-8 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            {t("blog.backToNews", "Volver a noticias")}
          </Link>

          {isLoading ? (
            <div className="animate-pulse space-y-4">
              <div className="h-8 bg-white/10 rounded w-3/4" />
              <div className="h-4 bg-white/10 rounded w-1/3" />
              <div className="h-64 bg-white/10 rounded-xl" />
              <div className="space-y-2">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="h-4 bg-white/10 rounded" />
                ))}
              </div>
            </div>
          ) : post ? (
            <article>
              <div className="flex items-center gap-3 mb-4 text-sm text-white/50">
                {post.category && (
                  <span className="bg-primary/20 text-primary px-3 py-1 rounded-full text-xs">
                    {post.category}
                  </span>
                )}
                {post.published_at && (
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    {formatDate(post.published_at)}
                  </span>
                )}
                {post.author && <span>· {post.author}</span>}
              </div>

              <h1 className="text-3xl md:text-4xl font-bold mb-6 bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">
                {post.title}
              </h1>

              {post.image_url && (
                <img
                  src={post.image_url}
                  alt={post.title}
                  className="w-full rounded-xl mb-8 max-h-[400px] object-cover"
                />
              )}

              {post.content ? (
                <div
                  className="prose prose-invert prose-lg max-w-none 
                    prose-headings:text-white/90 prose-p:text-white/70 prose-a:text-primary
                    prose-strong:text-white/80 prose-li:text-white/70"
                  dangerouslySetInnerHTML={{ __html: post.content }}
                />
              ) : post.excerpt ? (
                <p className="text-white/70 text-lg leading-relaxed">
                  {post.excerpt}
                </p>
              ) : null}

              {post.tags && post.tags.length > 0 && (
                <div className="mt-10 pt-6 border-t border-white/10">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Tag className="w-4 h-4 text-white/40" />
                    {post.tags.map((tag: string) => (
                      <span
                        key={tag}
                        className="text-xs text-white/40 bg-white/5 px-3 py-1 rounded-full"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </article>
          ) : (
            <p className="text-center text-white/40 py-20">
              {t("blog.notFound", "Artículo no encontrado.")}
            </p>
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default NewsArticle;
