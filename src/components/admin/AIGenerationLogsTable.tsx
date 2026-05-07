import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, RefreshCw, ExternalLink } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface LogRow {
  id: string;
  user_id: string | null;
  feature_key: string;
  provider: string;
  model: string;
  provider_task_id: string | null;
  status: string;
  output_url: string | null;
  estimated_cost_usd: number | null;
  user_credits_charged: number | null;
  error_message: string | null;
  request_payload: Record<string, unknown> | null;
  response_payload: Record<string, unknown> | null;
  created_at: string;
  completed_at: string | null;
}

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "secondary",
  processing: "secondary",
  completed: "default",
  failed: "destructive",
};

export function AIGenerationLogsTable() {
  const [rows, setRows] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [featureFilter, setFeatureFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<LogRow | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const runQuery = async () => {
    let q = supabase
      .from("ai_generation_logs")
      .select(
        "id,user_id,feature_key,provider,model,provider_task_id,status,output_url,estimated_cost_usd,user_credits_charged,error_message,request_payload,response_payload,created_at,completed_at"
      )
      .order("created_at", { ascending: false })
      .limit(100);
    if (statusFilter !== "all") q = q.eq("status", statusFilter);
    if (featureFilter !== "all") q = q.eq("feature_key", featureFilter);
    return await q;
  };

  const load = async () => {
    setLoading(true);
    setErrorMsg(null);
    let lastError: any = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      const { data, error } = await runQuery();
      if (!error) {
        setRows((data as LogRow[]) || []);
        setLoading(false);
        return;
      }
      lastError = error;
      // Retry only on statement timeout / transient pooler errors
      if (error.code !== "57014" && !/timeout/i.test(error.message || "")) break;
      await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
    }
    console.error("[AIGenerationLogsTable] load error", lastError);
    setErrorMsg(lastError?.message || "No se pudieron cargar los logs.");
    setRows([]);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [statusFilter, featureFilter]);

  const filtered = rows.filter((r) => {
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    return (
      r.id.toLowerCase().includes(s) ||
      (r.provider_task_id || "").toLowerCase().includes(s) ||
      (r.user_id || "").toLowerCase().includes(s) ||
      (r.error_message || "").toLowerCase().includes(s)
    );
  });

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Buscar por logId, taskId, userId, error…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm h-9"
        />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px] h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            <SelectItem value="pending">pending</SelectItem>
            <SelectItem value="processing">processing</SelectItem>
            <SelectItem value="completed">completed</SelectItem>
            <SelectItem value="failed">failed</SelectItem>
          </SelectContent>
        </Select>
        <Select value={featureFilter} onValueChange={setFeatureFilter}>
          <SelectTrigger className="w-[220px] h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las funciones</SelectItem>
            <SelectItem value="music_generation_vocal">music_generation_vocal</SelectItem>
            <SelectItem value="music_generation_instrumental">music_generation_instrumental</SelectItem>
            <SelectItem value="lyrics_generation">lyrics_generation</SelectItem>
            <SelectItem value="mastering">mastering</SelectItem>
            <SelectItem value="cover_generation">cover_generation</SelectItem>
            <SelectItem value="promo_generation">promo_generation</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
        </Button>
      </div>

      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[140px]">Fecha</TableHead>
              <TableHead>Función</TableHead>
              <TableHead>Proveedor / modelo</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Task ID</TableHead>
              <TableHead className="text-right">Coste USD</TableHead>
              <TableHead className="text-right">Créditos</TableHead>
              <TableHead>Output</TableHead>
              <TableHead>Error</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="text-xs whitespace-nowrap">
                  {new Date(r.created_at).toLocaleString()}
                </TableCell>
                <TableCell className="font-mono text-xs">{r.feature_key}</TableCell>
                <TableCell className="text-xs">{r.provider} · {r.model}</TableCell>
                <TableCell>
                  <Badge variant={STATUS_VARIANT[r.status] || "outline"}>{r.status}</Badge>
                </TableCell>
                <TableCell className="font-mono text-xs max-w-[160px] truncate" title={r.provider_task_id || ""}>
                  {r.provider_task_id || "—"}
                </TableCell>
                <TableCell className="text-right text-xs">
                  {r.estimated_cost_usd != null ? `$${Number(r.estimated_cost_usd).toFixed(4)}` : "—"}
                </TableCell>
                <TableCell className="text-right text-xs">
                  {r.user_credits_charged ?? "—"}
                </TableCell>
                <TableCell>
                  {r.output_url ? (
                    <a href={r.output_url} target="_blank" rel="noreferrer" className="text-primary text-xs inline-flex items-center gap-1">
                      Abrir <ExternalLink className="h-3 w-3" />
                    </a>
                  ) : "—"}
                </TableCell>
                <TableCell className="text-xs text-destructive max-w-[220px] truncate" title={r.error_message || ""}>
                  {r.error_message || ""}
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="sm" onClick={() => setSelected(r)}>Ver</Button>
                </TableCell>
              </TableRow>
            ))}
            {!loading && filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={10} className="text-center text-sm text-muted-foreground py-6">
                  {errorMsg
                    ? `Error: ${errorMsg}`
                    : rows.length === 0
                      ? "Aún no hay generaciones registradas. Los logs aparecerán aquí en cuanto se ejecute la primera generación KIE Suno."
                      : "Sin resultados con los filtros actuales."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalle del log</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-3 text-xs">
              <div><b>ID:</b> <span className="font-mono">{selected.id}</span></div>
              <div><b>Usuario:</b> <span className="font-mono">{selected.user_id || "—"}</span></div>
              <div><b>Feature:</b> {selected.feature_key}</div>
              <div><b>Proveedor:</b> {selected.provider} · {selected.model}</div>
              <div><b>Status:</b> {selected.status}</div>
              <div><b>Task ID:</b> <span className="font-mono">{selected.provider_task_id || "—"}</span></div>
              <div><b>Output URL:</b> {selected.output_url || "—"}</div>
              <div><b>Error:</b> {selected.error_message || "—"}</div>
              <div>
                <b>Request payload:</b>
                <pre className="bg-muted p-2 rounded mt-1 overflow-x-auto">{JSON.stringify(selected.request_payload, null, 2)}</pre>
              </div>
              <div>
                <b>Response payload:</b>
                <pre className="bg-muted p-2 rounded mt-1 overflow-x-auto">{JSON.stringify(selected.response_payload, null, 2)}</pre>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
