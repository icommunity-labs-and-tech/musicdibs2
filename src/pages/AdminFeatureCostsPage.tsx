import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Save, Loader2 } from 'lucide-react';

interface FeatureCost {
  feature_key: string;
  credit_cost: number;
  label: string;
}

export default function AdminFeatureCostsPage() {
  const [rows, setRows] = useState<FeatureCost[]>([]);
  const [editing, setEditing] = useState<Record<string, Partial<FeatureCost>>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  const load = async () => {
    const { data, error } = await supabase
      .from('feature_costs')
      .select('*')
      .order('feature_key');
    if (error) {
      toast.error('Error cargando costes');
      return;
    }
    setRows(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleChange = (key: string, field: 'credit_cost' | 'label', value: string) => {
    setEditing(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        [field]: field === 'credit_cost' ? parseInt(value) || 0 : value,
      },
    }));
  };

  const handleSave = async (row: FeatureCost) => {
    const changes = editing[row.feature_key];
    if (!changes) return;

    setSaving(row.feature_key);
    const { error } = await supabase
      .from('feature_costs')
      .update({
        credit_cost: changes.credit_cost ?? row.credit_cost,
        label: changes.label ?? row.label,
      })
      .eq('feature_key', row.feature_key);

    if (error) {
      toast.error(`Error: ${error.message}`);
    } else {
      toast.success(`"${row.feature_key}" actualizado`);
      setEditing(prev => {
        const next = { ...prev };
        delete next[row.feature_key];
        return next;
      });
      await load();
    }
    setSaving(null);
  };

  const getValue = (row: FeatureCost, field: 'credit_cost' | 'label') => {
    return editing[row.feature_key]?.[field] ?? row[field];
  };

  const isDirty = (key: string) => !!editing[key];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Costes de Features</h1>
      <p className="text-sm text-muted-foreground">
        Ajusta los créditos que cuesta cada acción. Los cambios se aplican inmediatamente en el servidor.
      </p>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tabla de costes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[200px]">Feature Key</TableHead>
                  <TableHead className="w-[250px]">Label</TableHead>
                  <TableHead className="w-[120px]">Créditos</TableHead>
                  <TableHead className="w-[100px]">Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map(row => (
                  <TableRow key={row.feature_key}>
                    <TableCell className="font-mono text-sm">{row.feature_key}</TableCell>
                    <TableCell>
                      <Input
                        value={String(getValue(row, 'label'))}
                        onChange={e => handleChange(row.feature_key, 'label', e.target.value)}
                        className="h-8"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min={0}
                        value={String(getValue(row, 'credit_cost'))}
                        onChange={e => handleChange(row.feature_key, 'credit_cost', e.target.value)}
                        className="h-8 w-20"
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant={isDirty(row.feature_key) ? 'default' : 'ghost'}
                        disabled={!isDirty(row.feature_key) || saving === row.feature_key}
                        onClick={() => handleSave(row)}
                      >
                        {saving === row.feature_key ? (
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
        </CardContent>
      </Card>
    </div>
  );
}
