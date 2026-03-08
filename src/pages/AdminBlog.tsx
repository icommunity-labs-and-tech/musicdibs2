import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AIArticleGenerator from "@/components/AIArticleGenerator";
import {
  Plus,
  Pencil,
  Trash2,
  LogOut,
  ArrowLeft,
  Save,
  Eye,
  EyeOff,
  Newspaper,
  Search,
  BarChart3,
} from "lucide-react";

type BlogPost = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string | null;
  image_url: string | null;
  category: string | null;
  tags: string[] | null;
  author: string | null;
  published: boolean | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

const emptyPost = {
  title: "",
  slug: "",
  excerpt: "",
  content: "",
  image_url: "",
  category: "Musicdibs",
  tags: "",
  author: "MusicDibs",
  published: false,
  published_at: "",
};

const AdminBlog = () => {
  const [editing, setEditing] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(emptyPost);
  const [filter, setFilter] = useState<"all" | "published" | "scheduled" | "draft">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Auth check
  useEffect(() => {
    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/admin");
        return;
      }
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id)
        .eq("role", "admin")
        .maybeSingle();
      if (!roleData) navigate("/admin");
    };
    check();
  }, [navigate]);

  const { data: posts, isLoading } = useQuery({
    queryKey: ["admin-blog-posts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_posts")
        .select("*")
        .order("published_at", { ascending: false });
      if (error) throw error;
      return data as BlogPost[];
    },
  });

  const getPostStatus = (post: BlogPost): "published" | "scheduled" | "draft" => {
    if (!post.published) return "draft";
    if (post.published_at && new Date(post.published_at) > new Date()) return "scheduled";
    return "published";
  };

  const filteredPosts = posts?.filter((p) => {
    const matchesFilter = filter === "all" || getPostStatus(p) === filter;
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = !q ||
      p.title.toLowerCase().includes(q) ||
      (p.excerpt?.toLowerCase().includes(q)) ||
      (p.category?.toLowerCase().includes(q)) ||
      (p.tags?.some(tag => tag.toLowerCase().includes(q)));
    return matchesFilter && matchesSearch;
  });

  const slugify = (text: string) =>
    text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)+/g, "");

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        title: form.title,
        slug: form.slug || slugify(form.title),
        excerpt: form.excerpt || null,
        content: form.content || null,
        image_url: form.image_url || null,
        category: form.category || null,
        tags: form.tags ? form.tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
        author: form.author || "MusicDibs",
        published: form.published,
        published_at: form.published ? (form.published_at || new Date().toISOString()) : null,
        updated_at: new Date().toISOString(),
      };

      if (editing) {
        const { error } = await supabase
          .from("blog_posts")
          .update(payload)
          .eq("id", editing);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("blog_posts")
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast({ title: "Guardado", description: "Post guardado correctamente." });
      queryClient.invalidateQueries({ queryKey: ["admin-blog-posts"] });
      setEditing(null);
      setCreating(false);
      setForm(emptyPost);
    },
    onError: (err: any) => {
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("blog_posts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Eliminado", description: "Post eliminado." });
      queryClient.invalidateQueries({ queryKey: ["admin-blog-posts"] });
    },
  });

  const startEdit = (post: BlogPost) => {
    setCreating(false);
    setEditing(post.id);
    setForm({
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt || "",
      content: post.content || "",
      image_url: post.image_url || "",
      category: post.category || "Musicdibs",
      tags: post.tags?.join(", ") || "",
      author: post.author || "MusicDibs",
      published: post.published || false,
      published_at: post.published_at?.slice(0, 10) || "",
    });
  };

  const startCreate = () => {
    setEditing(null);
    setCreating(true);
    setForm(emptyPost);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/admin");
  };

  const showForm = editing || creating;

  return (
    <div className="min-h-screen page-bg">
      {/* Header */}
      <header className="border-b border-white/10 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Newspaper className="w-6 h-6 text-primary" />
            <h1 className="text-xl font-bold">Blog CMS</h1>
            <span className="text-xs text-white/40 bg-white/5 px-2 py-0.5 rounded">
              {posts?.length || 0} posts
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate("/admin/ab-tests")} className="gap-1 text-black border-white/20">
              <BarChart3 className="w-4 h-4" /> A/B Tests
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate("/news")} className="gap-1 text-black border-white/20">
              <Eye className="w-4 h-4" /> Ver blog
            </Button>
            <Button variant="ghost" size="sm" onClick={handleLogout} className="gap-1 text-white/50">
              <LogOut className="w-4 h-4" /> Salir
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {showForm ? (
          <div className="max-w-3xl mx-auto">
            <button
              onClick={() => {
                setEditing(null);
                setCreating(false);
                setForm(emptyPost);
              }}
              className="flex items-center gap-2 text-white/50 hover:text-white text-sm mb-6"
            >
              <ArrowLeft className="w-4 h-4" /> Volver a la lista
            </button>

            <div className="bg-white/5 border border-white/10 rounded-xl p-6 space-y-5">
              <h2 className="text-lg font-semibold">
                {editing ? "Editar artículo" : "Nuevo artículo"}
              </h2>

              <AIArticleGenerator
                form={form}
                setForm={setForm}
                slugify={slugify}
                isEditing={!!editing}
                currentPostId={editing}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-white/70">Título *</Label>
                  <Input
                    value={form.title}
                    onChange={(e) => {
                      setForm({
                        ...form,
                        title: e.target.value,
                        slug: editing ? form.slug : slugify(e.target.value),
                      });
                    }}
                    className="bg-white/5 border-white/10 text-white"
                  />
                </div>
                <div>
                  <Label className="text-white/70">Slug</Label>
                  <Input
                    value={form.slug}
                    onChange={(e) => setForm({ ...form, slug: e.target.value })}
                    className="bg-white/5 border-white/10 text-white"
                  />
                </div>
              </div>

              <div>
                <Label className="text-white/70">Extracto</Label>
                <Textarea
                  value={form.excerpt}
                  onChange={(e) => setForm({ ...form, excerpt: e.target.value })}
                  rows={3}
                  className="bg-white/5 border-white/10 text-white"
                />
              </div>

              <div>
                <Label className="text-white/70">Contenido (HTML)</Label>
                <Textarea
                  value={form.content}
                  onChange={(e) => setForm({ ...form, content: e.target.value })}
                  rows={12}
                  className="bg-white/5 border-white/10 text-white font-mono text-sm"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-white/70">URL de imagen</Label>
                  <Input
                    value={form.image_url}
                    onChange={(e) => setForm({ ...form, image_url: e.target.value })}
                    className="bg-white/5 border-white/10 text-white"
                    placeholder="https://..."
                  />
                </div>
                <div>
                  <Label className="text-white/70">Categoría</Label>
                  <Input
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="bg-white/5 border-white/10 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-white/70">Tags (separados por coma)</Label>
                  <Input
                    value={form.tags}
                    onChange={(e) => setForm({ ...form, tags: e.target.value })}
                    className="bg-white/5 border-white/10 text-white"
                    placeholder="Musicdibs, Blockchain"
                  />
                </div>
                <div>
                  <Label className="text-white/70">Autor</Label>
                  <Input
                    value={form.author}
                    onChange={(e) => setForm({ ...form, author: e.target.value })}
                    className="bg-white/5 border-white/10 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-white/70">Fecha de publicación</Label>
                  <Input
                    type="date"
                    value={form.published_at}
                    onChange={(e) => setForm({ ...form, published_at: e.target.value })}
                    className="bg-white/5 border-white/10 text-white"
                  />
                </div>
                <div className="flex flex-col gap-2 pt-6">
                  <div className="flex items-center gap-3">
                    <Switch
                      checked={form.published}
                      onCheckedChange={(v) => setForm({ ...form, published: v })}
                    />
                    <Label className="text-white/70">
                      {form.published
                        ? form.published_at && new Date(form.published_at) > new Date()
                          ? "⏰ Programado"
                          : "Publicado"
                        : "Borrador"}
                    </Label>
                  </div>
                  {form.published && form.published_at && new Date(form.published_at) > new Date() && (
                    <p className="text-xs text-amber-400">
                      Se publicará automáticamente el {new Date(form.published_at).toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" })}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  onClick={() => saveMutation.mutate()}
                  disabled={saveMutation.isPending || !form.title}
                  className="gap-2"
                >
                  <Save className="w-4 h-4" />
                  {saveMutation.isPending ? "Guardando..." : "Guardar"}
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setEditing(null);
                    setCreating(false);
                    setForm(emptyPost);
                  }}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <>
             <div className="flex flex-col gap-4 mb-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Artículos</h2>
                <Button onClick={startCreate} className="gap-2">
                  <Plus className="w-4 h-4" /> Nuevo artículo
                </Button>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                  <Input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar por título, categoría o tags..."
                    className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/30"
                  />
                </div>
                <div className="flex gap-2">
                  {([
                    { key: "all", label: "Todos" },
                    { key: "published", label: "Publicados" },
                    { key: "scheduled", label: "⏰ Programados" },
                    { key: "draft", label: "Borradores" },
                  ] as const).map((f) => (
                    <button
                      key={f.key}
                      onClick={() => setFilter(f.key)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                        filter === f.key
                          ? "bg-primary text-primary-foreground"
                          : "bg-white/5 text-white/50 hover:bg-white/10 hover:text-white/70"
                      }`}
                    >
                      {f.label}
                      {f.key === "all" && ` (${posts?.length || 0})`}
                      {f.key !== "all" && ` (${posts?.filter((p) => getPostStatus(p) === f.key).length || 0})`}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {isLoading ? (
              <div className="text-center py-20 text-white/40">Cargando...</div>
            ) : filteredPosts && filteredPosts.length > 0 ? (
              <div className="space-y-2">
                {filteredPosts.map((post) => (
                  <div
                    key={post.id}
                    className="flex items-center gap-4 bg-white/5 border border-white/10 rounded-lg px-4 py-3 hover:bg-white/[0.07] transition-colors"
                  >
                    {post.image_url && (
                      <img
                        src={post.image_url}
                        alt=""
                        className="w-12 h-12 rounded object-cover flex-shrink-0"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-medium text-white/90 truncate">
                          {post.title}
                        </h3>
                        {post.published ? (
                          post.published_at && new Date(post.published_at) > new Date() ? (
                            <span className="text-xs text-amber-400 flex-shrink-0">⏰</span>
                          ) : (
                            <Eye className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />
                          )
                        ) : (
                          <EyeOff className="w-3.5 h-3.5 text-white/30 flex-shrink-0" />
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-white/40">
                        <span>{post.category}</span>
                        {post.published_at && (
                          <>
                            <span>·</span>
                            <span>
                              {new Date(post.published_at).toLocaleDateString("es-ES")}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => startEdit(post)}
                        className="h-8 w-8 text-white/50 hover:text-white"
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          if (confirm("¿Eliminar este artículo?")) {
                            deleteMutation.mutate(post.id);
                          }
                        }}
                        className="h-8 w-8 text-white/50 hover:text-red-400"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-20">
                <p className="text-white/40 mb-4">No hay artículos aún.</p>
                <Button onClick={startCreate} className="gap-2">
                  <Plus className="w-4 h-4" /> Crear el primero
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default AdminBlog;
