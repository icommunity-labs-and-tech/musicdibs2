import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { SEO } from "@/components/SEO";
import { useTranslation } from "react-i18next";
import i18n from "i18next";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Calendar, ArrowRight, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import { Input } from "@/components/ui/input";

type BlogPost = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  image_url: string | null;
  category: string | null;
  tags: string[] | null;
  author: string | null;
  published_at: string | null;
};

const News = () => {
  const { t } = useTranslation();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState<number | null>(9);

  const perPageOptions: { label: string; value: number | null }[] = [
    { label: "9", value: 9 },
    { label: "15", value: 15 },
    { label: "30", value: 30 },
    { label: t("blog.all", "Todas"), value: null },
  ];

  // Map i18n language to blog language codes
  const langMap: Record<string, string> = { es: "es", en: "en", pt: "pt", "pt-BR": "pt", fr: "es", it: "es", de: "es" };
  const blogLang = langMap[i18n.language] || "es";

  useEffect(() => {
    setSelectedCategory(null);
    setCurrentPage(1);
  }, [blogLang]);

  const { data: posts, isLoading } = useQuery({
    queryKey: ["blog-posts", blogLang],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_posts")
        .select("id, title, slug, excerpt, image_url, category, tags, author, published_at, language")
        .eq("published", true)
        .eq("language", blogLang)
        .order("published_at", { ascending: false });
      if (error) throw error;
      return data as BlogPost[];
    },
  });

  const categories = posts
    ? [...new Set(posts.map((p) => p.category).filter(Boolean))]
    : [];

  const filtered = useMemo(() => posts?.filter((p) => {
    const matchesCategory = !selectedCategory || p.category === selectedCategory;
    const query = searchQuery.toLowerCase().trim();
    const matchesSearch = !query ||
      p.title.toLowerCase().includes(query) ||
      (p.excerpt?.toLowerCase().includes(query)) ||
      (p.tags?.some(tag => tag.toLowerCase().includes(query)));
    return matchesCategory && matchesSearch;
  }), [posts, selectedCategory, searchQuery]);

  const totalItems = filtered?.length || 0;
  const totalPages = perPage ? Math.ceil(totalItems / perPage) : 1;
  const paginatedPosts = perPage
    ? filtered?.slice((currentPage - 1) * perPage, currentPage * perPage)
    : filtered;

  const handleCategoryChange = (cat: string | null) => {
    setSelectedCategory(cat);
    setCurrentPage(1);
  };
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };
  const handlePerPageChange = (value: number | null) => {
    setPerPage(value);
    setCurrentPage(1);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  return (
    <div className="min-h-screen page-bg">
      <SEO
        title={t("blog.title", "Noticias")}
        description={t("blog.seo_description", "Últimas noticias y artículos de MusicDibs sobre distribución musical, blockchain y derechos de autor.")}
        path="/news"
        locale={i18n.language}
        jsonLd={[
          {
            "@context": "https://schema.org",
            "@type": "CollectionPage",
            name: t("blog.title", "Blog & Novedades"),
            description: t("blog.seo_description", "Últimas noticias y artículos de MusicDibs sobre distribución musical, blockchain y derechos de autor."),
            url: "https://musicdibs.com/news",
            isPartOf: { "@type": "WebSite", name: "MusicDibs", url: "https://musicdibs.com" },
          },
          {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Inicio", item: "https://musicdibs.com" },
              { "@type": "ListItem", position: 2, name: "Blog", item: "https://musicdibs.com/news" },
            ],
          },
        ]}
      />
      <Navbar />

      <div className="pt-32 pb-20 px-6">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 text-center bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">
            {t("blog.title", "Blog & Novedades")}
          </h1>
          <p className="text-white/60 text-center mb-12 text-lg">
            {t("blog.subtitle", "Tendencias, consejos y novedades para artistas independientes")}
          </p>

          {/* Search */}
          <div className="relative max-w-md mx-auto mb-8">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder={t("blog.searchPlaceholder", "Buscar artículos...")}
              className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/30"
            />
          </div>

          {/* Category filters */}
          {categories.length > 0 && (
            <div className="flex flex-wrap gap-2 justify-center mb-10">
              <button
                onClick={() => handleCategoryChange(null)}
                className={`px-4 py-1.5 rounded-full text-sm transition-colors ${
                  !selectedCategory
                    ? "bg-primary text-primary-foreground"
                    : "bg-white/10 text-white/70 hover:bg-white/20"
                }`}
              >
                {t("blog.all", "Todas")}
              </button>
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => handleCategoryChange(cat)}
                  className={`px-4 py-1.5 rounded-full text-sm transition-colors ${
                    selectedCategory === cat
                      ? "bg-primary text-primary-foreground"
                      : "bg-white/10 text-white/70 hover:bg-white/20"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className="bg-white/5 border border-white/10 rounded-xl overflow-hidden animate-pulse"
                >
                  <div className="h-48 bg-white/10" />
                  <div className="p-5 space-y-3">
                    <div className="h-4 bg-white/10 rounded w-1/3" />
                    <div className="h-6 bg-white/10 rounded w-full" />
                    <div className="h-4 bg-white/10 rounded w-2/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : paginatedPosts && paginatedPosts.length > 0 ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {paginatedPosts.map((post) => (
                  <Link
                    key={post.id}
                    to={`/news/${post.slug}`}
                    className="group bg-white/5 border border-white/10 rounded-xl overflow-hidden hover:bg-white/10 hover:border-white/20 transition-all duration-300 hover:-translate-y-1"
                  >
                    {post.image_url && (
                      <div className="h-48 overflow-hidden">
                        <img
                          src={post.image_url}
                          alt={post.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          loading="lazy"
                        />
                      </div>
                    )}
                    <div className="p-5">
                      <div className="flex items-center gap-3 mb-3 text-xs text-white/50">
                        {post.category && (
                          <span className="bg-primary/20 text-primary px-2 py-0.5 rounded-full">
                            {post.category}
                          </span>
                        )}
                        {post.published_at && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {formatDate(post.published_at)}
                          </span>
                        )}
                      </div>
                      <h2 className="text-lg font-semibold text-white/90 group-hover:text-white mb-2 line-clamp-2">
                        {post.title}
                      </h2>
                      {post.excerpt && (
                        <p className="text-white/50 text-sm line-clamp-3 mb-3">
                          {post.excerpt}
                        </p>
                      )}
                      {post.tags && post.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-3">
                          {post.tags.slice(0, 3).map((tag) => (
                            <span
                              key={tag}
                              className="text-[10px] text-white/40 bg-white/5 px-2 py-0.5 rounded"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                      <span className="text-primary text-sm flex items-center gap-1 group-hover:gap-2 transition-all">
                        {t("blog.readMore", "Leer más")}
                        <ArrowRight className="w-3 h-3" />
                      </span>
                    </div>
                  </Link>
                ))}
              </div>

              {/* Pagination */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-10">
                <div className="flex items-center gap-2 text-sm text-white/50">
                  <span>{t("blog.show", "Mostrar")}:</span>
                  {perPageOptions.map((opt) => (
                    <button
                      key={opt.label}
                      onClick={() => handlePerPageChange(opt.value)}
                      className={`px-3 py-1 rounded-md transition-colors ${
                        perPage === opt.value
                          ? "bg-primary text-primary-foreground"
                          : "bg-white/10 text-white/60 hover:bg-white/20"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>

                {totalPages > 1 && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="p-2 rounded-md bg-white/10 text-white/60 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter((page) => page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1)
                      .map((page, idx, arr) => (
                        <span key={page} className="flex items-center gap-1">
                          {idx > 0 && arr[idx - 1] !== page - 1 && (
                            <span className="text-white/30 px-1">…</span>
                          )}
                          <button
                            onClick={() => setCurrentPage(page)}
                            className={`w-8 h-8 rounded-md text-sm transition-colors ${
                              currentPage === page
                                ? "bg-primary text-primary-foreground"
                                : "bg-white/10 text-white/60 hover:bg-white/20"
                            }`}
                          >
                            {page}
                          </button>
                        </span>
                      ))}
                    <button
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="p-2 rounded-md bg-white/10 text-white/60 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                    <span className="text-white/40 text-sm ml-2">
                      {totalItems} {t("blog.articles", "artículos")}
                    </span>
                  </div>
                )}
              </div>
            </>
          ) : (
            <p className="text-center text-white/40 py-20">
              {t("blog.noPosts", "No hay artículos disponibles.")}
            </p>
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default News;
