import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import { toast } from 'sonner';
import { Save, Loader2, Crown } from 'lucide-react';

const PAGE_SIZE = 10;

const CATEGORY_LABELS: Record<string, string> = {
  gratis: 'Gratis',
  distribucion: 'Distribución',
  registro: 'Registro',
  audio: 'Audio',
  musica: 'Música',
  promo: 'Promoción',
};

interface OperationRow {
  operation_key: string;
  operation_name: string;
  operation_icon: string | null;
  credits_cost: number;
  euro_cost: number | null;
  category: string;
  is_annual_only: boolean | null;
  display_order: number;
  is_active: boolean | null;
  description: string | null;
}

export default function AdminFeatureCostsPage() {
  const [rows, setRows] = useState<OperationRow[]>([]);
  const [editing, setEditing] = useState<Record<string, Partial<OperationRow>>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const load = async () => {
    const { data, error } = await supabase
      .from('operation_pricing')
      .select('operation_key, operation_name, operation_icon, credits_cost, euro_cost, category, is_annual_only, display_order, is_active, description')
      .order('display_order');
    if (error) {
      toast.error('Error cargando precios');
      return;
    }
    setRows((data as OperationRow[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleChange = (key: string, field: keyof OperationRow, value: string | number) => {
    setEditing(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        [field]: field === 'credits_cost' || field === 'display_order' ? parseInt(String(value)) || 0 : value,
      },
    }));
  };

  const handleSave = async (row: OperationRow) => {
    const changes = editing[row.operation_key];
    if (!changes) return;

    setSaving(row.operation_key);
    const { error } = await supabase
      .from('operation_pricing')
      .update({
        operation_name: (changes.operation_name ?? row.operation_name),
        credits_cost: (changes.credits_cost ?? row.credits_cost),
        category: (changes.category ?? row.category),
        operation_icon: (changes.operation_icon ?? row.operation_icon),
        description: (changes.description ?? row.description),
      })
      .eq('operation_key', row.operation_key);

    if (error) {
      toast.error(`Error: ${error.message}`);
    } else {
      toast.success(`"${row.operation_key}" actualizado`);
      setEditing(prev => {
        const next = { ...prev };
        delete next[row.operation_key];
        return next;
      });
      await load();
    }
    setSaving(null);
  };

  const getValue = <K extends keyof OperationRow>(row: OperationRow, field: K): OperationRow[K] => {
    return (editing[row.operation_key]?.[field] ?? row[field]) as OperationRow[K];
  };

  const isDirty = (key: string) => !!editing[key];

  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const paginatedRows = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Precios por Operación</h1>
      <p className="text-sm text-muted-foreground">
        Gestiona los precios de cada operación. Los cambios se reflejan en el popup de precios y en la web. El campo €/operación se calcula automáticamente (créditos × 0,60€).
      </p>

      <Card>
        <CardHeader><CardTitle className="text-base">Tabla de precios ({rows.length} operaciones)</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">Icono</TableHead>
                  <TableHead className="w-[150px]">Clave</TableHead>
                  <TableHead className="w-[180px]">Nombre</TableHead>
                  <TableHead className="w-[100px]">Categoría</TableHead>
                  <TableHead className="w-[80px]">Créditos</TableHead>
                  <TableHead className="w-[80px]">€/op</TableHead>
                  <TableHead className="w-[200px]">Descripción (tooltip)</TableHead>
                  <TableHead className="w-[60px]">Anual</TableHead>
                  <TableHead className="w-[60px]">Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedRows.map(row => (
                  <TableRow key={row.operation_key} className={!row.is_active ? 'opacity-40' : ''}>
                    <TableCell>
                      {isDirty(row.operation_key) ? (
                        <Input
                          value={String(getValue(row, 'operation_icon') || '')}
                          onChange={e => handleChange(row.operation_key, 'operation_icon', e.target.value)}
                          className="h-8 w-12 text-center"
                        />
                      ) : (
                        <span className="text-lg">{row.operation_icon}</span>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-xs">{row.operation_key}</TableCell>
                    <TableCell>
                      {isDirty(row.operation_key) ? (
                        <Input
                          value={String(getValue(row, 'operation_name'))}
                          onChange={e => handleChange(row.operation_key, 'operation_name', e.target.value)}
                          className="h-8"
                        />
                      ) : (
                        row.operation_name
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {CATEGORY_LABELS[row.category] || row.category}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min={0}
                        value={String(getValue(row, 'credits_cost'))}
                        onChange={e => handleChange(row.operation_key, 'credits_cost', e.target.value)}
                        className="h-8 w-20"
                      />
                    </TableCell>
                    <TableCell className="font-mono text-sm text-muted-foreground">
                      {((getValue(row, 'credits_cost') || 0) * 0.60).toFixed(2)} €
                    </TableCell>
                    <TableCell>
                      <Textarea
                        value={String(getValue(row, 'description') || '')}
                        onChange={e => handleChange(row.operation_key, 'description', e.target.value)}
                        placeholder="Descripción para tooltip..."
                        className="h-16 min-h-[40px] text-xs resize-y"
                      />
                    </TableCell>
                    <TableCell>
                      {row.is_annual_only && (
                        <Crown className="h-4 w-4 text-amber-500" />
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant={isDirty(row.operation_key) ? 'default' : 'ghost'}
                        disabled={!isDirty(row.operation_key) || saving === row.operation_key}
                        onClick={() => handleSave(row)}
                      >
                        {saving === row.operation_key ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Save className="h-4 w-4" />
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {rows.length > PAGE_SIZE && (
            <div className="flex items-center justify-center gap-4 mt-4">
              <span className="text-sm text-muted-foreground">
                Página {page} de {totalPages}
              </span>
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      className={page <= 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                    />
                  </PaginationItem>
                  {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                    let pg: number;
                    if (totalPages <= 5) pg = i + 1;
                    else if (page <= 3) pg = i + 1;
                    else if (page >= totalPages - 2) pg = totalPages - 4 + i;
                    else pg = page - 2 + i;
                    return (
                      <PaginationItem key={pg}>
                        <PaginationLink
                          isActive={pg === page}
                          onClick={() => setPage(pg)}
                          className="cursor-pointer"
                        >
                          {pg}
                        </PaginationLink>
                      </PaginationItem>
                    );
                  })}
                  <PaginationItem>
                    <PaginationNext
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      className={page >= totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
