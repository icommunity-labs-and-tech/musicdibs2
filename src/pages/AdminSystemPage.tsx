import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { adminApi } from '@/services/adminApi';
import { toast } from 'sonner';
import { Settings2, Shield, UserPlus } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

export default function AdminSystemPage() {
  const { user } = useAuth();
  const [admins, setAdmins] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [addModal, setAddModal] = useState(false);
  const [newAdminEmail, setNewAdminEmail] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const res = await adminApi.getAdmins();
      setAdmins(res.admins || []);
    } catch (e: any) { toast.error(e.message); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleAddAdmin = async () => {
    if (!newAdminEmail.trim()) return;
    try {
      const res = await adminApi.searchUserByEmail(newAdminEmail);
      if (!res.user) { toast.error('Usuario no encontrado'); return; }
      await adminApi.setAdminRole(res.user.user_id, true);
      toast.success('Admin añadido');
      setAddModal(false);
      setNewAdminEmail('');
      load();
    } catch (e: any) { toast.error(e.message); }
  };

  const handleRevoke = async (userId: string) => {
    if (!confirm('¿Revocar acceso de administrador?')) return;
    try {
      await adminApi.setAdminRole(userId, false);
      toast.success('Admin revocado');
      load();
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Settings2 className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">Sistema</h1>
        <Badge className="bg-pink-500/20 text-pink-400 border-pink-500/30">Admin</Badge>
      </div>

      <Card className="border-border/40">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="h-4 w-4" /> Administradores
          </CardTitle>
          <Button size="sm" onClick={() => setAddModal(true)}>
            <UserPlus className="h-4 w-4 mr-1" /> Añadir admin
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead>Email</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={2} className="text-center py-8 text-muted-foreground">Cargando...</TableCell></TableRow>
              ) : admins.map(a => (
                <TableRow key={a.user_id}>
                  <TableCell className="font-medium">{a.email}</TableCell>
                  <TableCell>
                    <Button
                      variant="destructive"
                      size="sm"
                      disabled={a.user_id === user?.id}
                      onClick={() => handleRevoke(a.user_id)}
                    >
                      Revocar
                    </Button>
                    {a.user_id === user?.id && <span className="text-xs text-muted-foreground ml-2">(tú)</span>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={addModal} onOpenChange={setAddModal}>
        <DialogContent>
          <DialogHeader><DialogTitle>Añadir administrador</DialogTitle></DialogHeader>
          <div>
            <Label>Email del usuario</Label>
            <Input value={newAdminEmail} onChange={e => setNewAdminEmail(e.target.value)} placeholder="usuario@email.com" onKeyDown={e => e.key === 'Enter' && handleAddAdmin()} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddModal(false)}>Cancelar</Button>
            <Button onClick={handleAddAdmin}>Añadir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
