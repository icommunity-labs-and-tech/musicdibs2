import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

const COUNTRIES = [
  'Afganistán','Albania','Alemania','Andorra','Angola','Antigua y Barbuda','Arabia Saudita',
  'Argelia','Argentina','Armenia','Australia','Austria','Azerbaiyán','Bahamas','Bahréin',
  'Bangladés','Barbados','Bélgica','Belice','Benín','Bielorrusia','Birmania','Bolivia',
  'Bosnia y Herzegovina','Botsuana','Brasil','Brunéi','Bulgaria','Burkina Faso','Burundi',
  'Bután','Cabo Verde','Camboya','Camerún','Canadá','Catar','Chad','Chile','China','Chipre',
  'Colombia','Comoras','Corea del Norte','Corea del Sur','Costa de Marfil','Costa Rica',
  'Croacia','Cuba','Dinamarca','Dominica','Ecuador','Egipto','El Salvador','Emiratos Árabes Unidos',
  'Eritrea','Eslovaquia','Eslovenia','España','Estados Unidos','Estonia','Esuatini','Etiopía',
  'Filipinas','Finlandia','Fiyi','Francia','Gabón','Gambia','Georgia','Ghana','Granada',
  'Grecia','Guatemala','Guinea','Guinea-Bisáu','Guinea Ecuatorial','Guyana','Haití','Honduras',
  'Hungría','India','Indonesia','Irak','Irán','Irlanda','Islandia','Islas Marshall',
  'Islas Salomón','Israel','Italia','Jamaica','Japón','Jordania','Kazajistán','Kenia',
  'Kirguistán','Kiribati','Kuwait','Laos','Lesoto','Letonia','Líbano','Liberia','Libia',
  'Liechtenstein','Lituania','Luxemburgo','Macedonia del Norte','Madagascar','Malasia',
  'Malaui','Maldivas','Malí','Malta','Marruecos','Mauricio','Mauritania','México',
  'Micronesia','Moldavia','Mónaco','Mongolia','Montenegro','Mozambique','Namibia','Nauru',
  'Nepal','Nicaragua','Níger','Nigeria','Noruega','Nueva Zelanda','Omán','Países Bajos',
  'Pakistán','Palaos','Palestina','Panamá','Papúa Nueva Guinea','Paraguay','Perú','Polonia',
  'Portugal','Puerto Rico','Reino Unido','República Centroafricana','República Checa',
  'República del Congo','República Democrática del Congo','República Dominicana','Ruanda',
  'Rumanía','Rusia','Samoa','San Cristóbal y Nieves','San Marino','San Vicente y las Granadinas',
  'Santa Lucía','Santo Tomé y Príncipe','Senegal','Serbia','Seychelles','Sierra Leona',
  'Singapur','Siria','Somalia','Sri Lanka','Sudáfrica','Sudán','Sudán del Sur','Suecia',
  'Suiza','Surinam','Tailandia','Tanzania','Tayikistán','Timor Oriental','Togo','Tonga',
  'Trinidad y Tobago','Túnez','Turkmenistán','Turquía','Tuvalu','Ucrania','Uganda','Uruguay',
  'Uzbekistán','Vanuatu','Vaticano','Venezuela','Vietnam','Yemen','Yibuti','Zambia','Zimbabue',
];

export default function ManagerArtistNew() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    artist_name: '',
    artist_email: '',
    artist_phone: '',
    artist_country: '',
    representation_type: 'full',
    contract_reference: '',
    contract_signed_at: '',
    notes: '',
  });

  const set = (key: string, val: string) => setForm((f) => ({ ...f, [key]: val }));

  const handleSave = async () => {
    if (!form.artist_name.trim()) { toast.error('El nombre del artista es obligatorio'); return; }
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from('managed_artists').insert({
      manager_user_id: user.id,
      artist_name: form.artist_name.trim(),
      artist_email: form.artist_email || null,
      artist_phone: form.artist_phone || null,
      artist_country: form.artist_country || null,
      representation_type: form.representation_type,
      contract_reference: form.contract_reference || null,
      contract_signed_at: form.contract_signed_at || null,
      notes: form.notes || null,
      status: 'active',
    } as any);
    setSaving(false);
    if (error) { toast.error('Error al guardar: ' + error.message); return; }
    toast.success('Artista añadido correctamente');
    navigate('/dashboard/manager/artists');
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Añadir artista</h1>
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div>
            <Label>Nombre artista *</Label>
            <Input value={form.artist_name} onChange={(e) => set('artist_name', e.target.value)} placeholder="Nombre completo del artista" />
          </div>
          <div>
            <Label>Email artista</Label>
            <Input type="email" value={form.artist_email} onChange={(e) => set('artist_email', e.target.value)} placeholder="artista@email.com" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Teléfono</Label>
              <Input value={form.artist_phone} onChange={(e) => set('artist_phone', e.target.value)} placeholder="+34 600 000 000" />
            </div>
            <div>
              <Label>País</Label>
              <Select value={form.artist_country} onValueChange={(v) => set('artist_country', v)}>
                <SelectTrigger><SelectValue placeholder="Seleccionar país" /></SelectTrigger>
                <SelectContent>
                  {COUNTRIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Tipo de representación *</Label>
            <Select value={form.representation_type} onValueChange={(v) => set('representation_type', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="full">Completa</SelectItem>
                <SelectItem value="registration">Solo registro</SelectItem>
                <SelectItem value="distribution">Solo distribución</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Referencia contrato externo</Label>
              <Input value={form.contract_reference} onChange={(e) => set('contract_reference', e.target.value)} placeholder="Ej: CT-2026-001" />
            </div>
            <div>
              <Label>Fecha firma contrato</Label>
              <Input type="date" value={form.contract_signed_at} onChange={(e) => set('contract_signed_at', e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Notas</Label>
            <Textarea value={form.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Notas adicionales sobre el artista..." rows={3} />
          </div>
          <div className="flex gap-3 pt-2">
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Guardando...' : 'Guardar artista'}</Button>
            <Button variant="outline" onClick={() => navigate('/dashboard/manager/artists')}>Cancelar</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
