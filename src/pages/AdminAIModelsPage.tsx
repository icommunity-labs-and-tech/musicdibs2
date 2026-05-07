import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Save, Plus, Trash2, FlaskConical, CheckCircle2, XCircle } from "lucide-react";

interface Setting {
  id: string;
  feature_key: string;
  provider: string;
  model: string;
  is_active: boolean;
  is_enabled: boolean;
  priority: number;
  cost_usd_estimate: number | null;
  user_credits_cost: number | null;
  fallback_provider: string | null;
  fallback_model: string | null;
  notes: string | null;
}

const FEATURES = [
  { key: "music_generation_vocal", label: "Música — Canción con voz" },
  { key: "music_generation_instrumental", label: "Música — Instrumental" },
  { key: "lyrics_generation", label: "Letras" },
  { key: "mastering", label: "Mastering" },
  { key: "cover_generation", label: "Portadas" },
  { key: "promo_generation", label: "Promo material" },
];

const PROVIDERS = [
  "elevenlabs", "kie_suno", "lyria", "gemini", "anthropic",
  "fal", "stability", "runway", "auphonic", "roex",
];

export default function AdminAIModelsPage() {
  const [settings, setSettings] = useState<Setting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [testing, setTesting] = useState<string | null>(null);
  const [edits, setEdits] = useState<Record<string, Partial<Setting>>>({});

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("ai_provider_settings")
      .select("*")
      .order("feature_key")
      .order("priority");
    if (error) {
      toast.error("Error cargando configuración");
    } else {
      setSettings((data as Setting[]) || []);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const grouped = useMemo(() => {
    const map: Record<string, Setting[]> = {};
    for (const s of settings) {
      (map[s.feature_key] ||= []).push(s);
    }
    return map;
  }, [settings]);

  const getValue = <K extends keyof Setting>(s: Setting, field: K): Setting[K] => {
    return (edits[s.id]?.[field] ?? s[field]) as Setting[K];
  };

  const setEdit = (id: string, patch: Partial<Setting>) => {
    setEdits((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  };

  const isDirty = (id: string) => !!edits[id];

  const handleSave = async (s: Setting) => {
    const patch = edits[s.id];
    if (!patch) return;
    setSaving(s.id);
    const { error } = await supabase
      .from("ai_provider_settings")
      .update({
        provider: patch.provider ?? s.provider,
        model: patch.model ?? s.model,
        is_enabled: patch.is_enabled ?? s.is_enabled,
        priority: patch.priority ?? s.priority,
        cost_usd_estimate: patch.cost_usd_estimate ?? s.cost_usd_estimate,
        // user_credits_cost is informational only — real charges come from operation_pricing.
        fallback_provider: patch.fallback_provider ?? s.fallback_provider,
        fallback_model: patch.fallback_model ?? s.fallback_model,
        notes: patch.notes ?? s.notes,
      })
      .eq("id", s.id);
    if (error) {
      toast.error(`Error: ${error.message}`);
    } else {
      toast.success("Guardado");
      setEdits((prev) => {
        const next = { ...prev };
        delete next[s.id];
        return next;
      });
      await load();
    }
    setSaving(null);
  };

  const handleActivate = async (s: Setting) => {
    setSaving(s.id);
    // Deactivate all other rows for this feature, activate this one
    const { error: e1 } = await supabase
      .from("ai_provider_settings")
      .update({ is_active: false })
      .eq("feature_key", s.feature_key);
    if (e1) {
      toast.error(`Error: ${e1.message}`);
      setSaving(null);
      return;
    }
    const { error: e2 } = await supabase
      .from("ai_provider_settings")
      .update({ is_active: true })
      .eq("id", s.id);
    if (e2) {
      toast.error(`Error: ${e2.message}`);
    } else {
      toast.success(`Activado: ${s.provider} / ${s.model}`);
      await load();
    }
    setSaving(null);
  };

  const handleAdd = async (featureKey: string) => {
    const { error } = await supabase.from("ai_provider_settings").insert({
      feature_key: featureKey,
      provider: "kie_suno",
      model: "V4_5",
      is_active: false,
      is_enabled: true,
      priority: 99,
    });
    if (error) toast.error(`Error: ${error.message}`);
    else { toast.success("Variante añadida"); await load(); }
  };

  const handleDelete = async (s: Setting) => {
    if (s.is_active) {
      toast.error("No puedes eliminar el proveedor activo. Activa otro primero.");
      return;
    }
    if (!confirm(`¿Eliminar ${s.provider} / ${s.model}?`)) return;
    const { error } = await supabase.from("ai_provider_settings").delete().eq("id", s.id);
    if (error) toast.error(`Error: ${error.message}`);
    else { toast.success("Eliminado"); await load(); }
  };

  const handleTest = async (s: Setting) => {
    setTesting(s.id);
    const { data, error } = await supabase.functions.invoke("ai-provider-test", {
      body: { settingId: s.id },
    });
    if (error) {
      toast.error(`Test falló: ${error.message}`);
    } else if (data?.ok === false) {
      toast.error(`Test KO: ${data?.error || data?.message || "Sin detalles"}`);
    } else {
      toast.success(`Test OK · ${s.provider}/${s.model}`);
      console.log("[ai-provider-test]", data);
    }
    setTesting(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Proveedores de IA</h1>
        <p className="text-sm text-muted-foreground">
          Selecciona qué proveedor y modelo se usa en cada función del AI Studio.
          Solo puede haber un proveedor activo por función. Las claves API están en variables de entorno y nunca se exponen al frontend.
        </p>
      </div>

      {FEATURES.map((feat) => {
        const rows = grouped[feat.key] || [];
        const activeRow = rows.find((r) => r.is_active);
        return (
          <Card key={feat.key}>
            <CardHeader className="flex flex-row items-center justify-between gap-4">
              <div>
                <CardTitle className="text-base">{feat.label}</CardTitle>
                <p className="text-xs text-muted-foreground font-mono mt-1">{feat.key}</p>
                {activeRow && (
                  <Badge variant="default" className="mt-2">
                    Activo: {activeRow.provider} · {activeRow.model}
                  </Badge>
                )}
              </div>
              <Button size="sm" variant="outline" onClick={() => handleAdd(feat.key)}>
                <Plus className="h-4 w-4 mr-1" /> Añadir variante
              </Button>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[80px]">Activo</TableHead>
                      <TableHead className="w-[60px]">Habilit.</TableHead>
                      <TableHead className="w-[140px]">Proveedor</TableHead>
                      <TableHead className="w-[180px]">Modelo</TableHead>
                      <TableHead className="w-[140px]">Fallback prov.</TableHead>
                      <TableHead className="w-[160px]">Fallback modelo</TableHead>
                      <TableHead className="w-[90px]">Coste USD</TableHead>
                      <TableHead className="w-[90px]">Créd. usuario</TableHead>
                      <TableHead className="w-[70px]">Prioridad</TableHead>
                      <TableHead className="w-[200px]">Notas</TableHead>
                      <TableHead className="w-[170px]">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((s) => (
                      <TableRow key={s.id} className={!getValue(s, "is_enabled") ? "opacity-50" : ""}>
                        <TableCell>
                          {s.is_active ? (
                            <Badge variant="default" className="gap-1">
                              <CheckCircle2 className="h-3 w-3" /> ON
                            </Badge>
                          ) : (
                            <Button size="sm" variant="outline" onClick={() => handleActivate(s)} disabled={saving === s.id}>
                              Activar
                            </Button>
                          )}
                        </TableCell>
                        <TableCell>
                          <Switch
                            checked={!!getValue(s, "is_enabled")}
                            onCheckedChange={(v) => setEdit(s.id, { is_enabled: v })}
                          />
                        </TableCell>
                        <TableCell>
                          <Select
                            value={String(getValue(s, "provider") || "")}
                            onValueChange={(v) => setEdit(s.id, { provider: v })}
                          >
                            <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {PROVIDERS.map((p) => (
                                <SelectItem key={p} value={p}>{p}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Input
                            value={String(getValue(s, "model") || "")}
                            onChange={(e) => setEdit(s.id, { model: e.target.value })}
                            className="h-8 font-mono text-xs"
                          />
                        </TableCell>
                        <TableCell>
                          <Select
                            value={String(getValue(s, "fallback_provider") || "__none")}
                            onValueChange={(v) => setEdit(s.id, { fallback_provider: v === "__none" ? null : v })}
                          >
                            <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__none">— ninguno —</SelectItem>
                              {PROVIDERS.map((p) => (
                                <SelectItem key={p} value={p}>{p}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Input
                            value={String(getValue(s, "fallback_model") || "")}
                            onChange={(e) => setEdit(s.id, { fallback_model: e.target.value || null })}
                            className="h-8 font-mono text-xs"
                            placeholder="—"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="0.0001"
                            value={String(getValue(s, "cost_usd_estimate") ?? "")}
                            onChange={(e) => setEdit(s.id, { cost_usd_estimate: e.target.value === "" ? null : parseFloat(e.target.value) })}
                            className="h-8 w-20"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={String(getValue(s, "user_credits_cost") ?? "")}
                            onChange={(e) => setEdit(s.id, { user_credits_cost: e.target.value === "" ? null : parseInt(e.target.value) })}
                            className="h-8 w-20"
                            placeholder="—"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={String(getValue(s, "priority") ?? 1)}
                            onChange={(e) => setEdit(s.id, { priority: parseInt(e.target.value) || 1 })}
                            className="h-8 w-16"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={String(getValue(s, "notes") || "")}
                            onChange={(e) => setEdit(s.id, { notes: e.target.value || null })}
                            className="h-8 text-xs"
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              size="sm"
                              variant={isDirty(s.id) ? "default" : "ghost"}
                              disabled={!isDirty(s.id) || saving === s.id}
                              onClick={() => handleSave(s)}
                              title="Guardar"
                            >
                              {saving === s.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleTest(s)}
                              disabled={testing === s.id}
                              title="Test de conexión"
                            >
                              {testing === s.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <FlaskConical className="h-4 w-4" />}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDelete(s)}
                              disabled={s.is_active}
                              title={s.is_active ? "No puedes eliminar el activo" : "Eliminar"}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {rows.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={11} className="text-center text-sm text-muted-foreground py-6">
                          Sin proveedores configurados. Pulsa "Añadir variante".
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
