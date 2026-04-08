import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Shield, ChevronRight, Loader2, CheckCircle2,
  AlertCircle, ExternalLink, User, FileText,
  Globe, Info,
} from 'lucide-react';
import { toast } from 'sonner';

const DOC_TYPES = [
  { value: 'dni', label: 'DNI (España)', placeholder: '12345678A' },
  { value: 'nie', label: 'NIE (España - extranjeros)', placeholder: 'X1234567A' },
  { value: 'passport', label: 'Pasaporte', placeholder: 'AAA000000' },
  { value: 'id_card', label: 'Documento Nacional de Identidad', placeholder: 'Número del documento' },
  { value: 'cedula', label: 'Cédula de identidad (LATAM)', placeholder: 'Número de cédula' },
  { value: 'curp', label: 'CURP (México)', placeholder: 'AAAA000000AAAAAA00' },
  { value: 'cpf', label: 'CPF (Brasil)', placeholder: '000.000.000-00' },
  { value: 'rut', label: 'RUT (Chile)', placeholder: '12.345.678-9' },
  { value: 'other', label: 'Otro documento oficial', placeholder: 'Número del documento' },
];

function StepIndicator({ current }: { current: 1 | 2 }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {[1, 2].map(step => (
        <div key={step} className="flex items-center gap-2">
          <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold transition-colors ${
            current >= step
              ? 'bg-emerald-500 text-white'
              : 'bg-muted text-muted-foreground'
          }`}>
            {current > step ? <CheckCircle2 className="h-4 w-4" /> : step}
          </div>
          <span className={`text-xs font-medium hidden sm:inline ${current >= step ? 'text-foreground' : 'text-muted-foreground'}`}>
            {step === 1 ? 'Datos de identidad' : 'Verificación biométrica'}
          </span>
          {step < 2 && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
        </div>
      ))}
    </div>
  );
}

export default function IdentityVerificationPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const [kycStatus, setKycStatus] = useState('unverified');
  const [kycLoading, setKycLoading] = useState(true);
  const [step, setStep] = useState<1 | 2>(1);

  const [fullName, setFullName] = useState('');
  const [docType, setDocType] = useState('dni');
  const [docNumber, setDocNumber] = useState('');
  const [country, setCountry] = useState('ES');
  const [submitting, setSubmitting] = useState(false);

  const [kycUrl, setKycUrl] = useState<string | null>(null);
  const [signatureId, setSignatureId] = useState<string | null>(null);
  const [iframeError, setIframeError] = useState(false);
  const [polling, setPolling] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('profiles')
      .select('kyc_status, display_name')
      .eq('user_id', user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          setKycStatus(data.kyc_status || 'unverified');
          if (data.display_name) setFullName(data.display_name);
        }
        setKycLoading(false);
      });
  }, [user]);

  // Polling
  useEffect(() => {
    if (!polling || !user) return;
    const interval = setInterval(async () => {
      const { data } = await supabase
        .from('profiles')
        .select('kyc_status')
        .eq('user_id', user.id)
        .single();
      if (data?.kyc_status === 'verified') {
        setKycStatus('verified');
        setPolling(false);
        setKycUrl(null);
        toast.success('¡Identidad verificada correctamente!');
      } else if (data?.kyc_status === 'pending') {
        setKycStatus('pending');
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [polling, user]);

  // Realtime
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('kyc-status-watch')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'profiles',
        filter: `user_id=eq.${user.id}`,
      }, (payload: any) => {
        const newStatus = payload.new?.kyc_status;
        if (newStatus && newStatus !== kycStatus) {
          setKycStatus(newStatus);
          if (newStatus === 'verified') {
            toast.success('¡Identidad verificada correctamente!');
            setPolling(false);
            setKycUrl(null);
          }
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, kycStatus]);

  // Listen for postMessage from iframe (iCommunity sends completion events)
  useEffect(() => {
    if (step !== 2 || !kycUrl) return;
    const handleMessage = async (event: MessageEvent) => {
      const msg = typeof event.data === 'string' ? event.data : event.data?.type || event.data?.status;
      const msgStr = JSON.stringify(event.data).toLowerCase();
      if (
        msgStr.includes('completed') ||
        msgStr.includes('success') ||
        msgStr.includes('verified') ||
        msgStr.includes('finish') ||
        msg === 'verification_complete'
      ) {
        console.log('[KYC] iframe postMessage received:', event.data);
        setKycUrl(null);
        // Check actual status
        if (user) {
          const { data } = await supabase
            .from('profiles')
            .select('kyc_status')
            .eq('user_id', user.id)
            .single();
          if (data?.kyc_status === 'verified') {
            setKycStatus('verified');
            setPolling(false);
            toast.success('¡Identidad verificada correctamente!');
          } else {
            toast.info('Verificación completada. Procesando resultado…');
          }
        }
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [step, kycUrl, user]);

  const handleStep1Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !docNumber.trim()) {
      toast.error('Por favor completa todos los campos obligatorios');
      return;
    }
    setSubmitting(true);
    try {
      const signatureName = `${fullName.trim()} · ${docType.toUpperCase()} ${docNumber.trim()}`;
      const { data, error } = await supabase.functions.invoke('ibs-signatures', {
        body: { action: 'create', signatureName },
      });
      if (error || data?.error) throw new Error(error?.message || data?.error);

      setSignatureId(data.signatureId);

      const url = data.kycUrl
        ? `${data.kycUrl}?lang=es`
        : `https://identity.icommunitylabs.com/identification/${data.signatureId}?lang=es`;

      setKycUrl(url);

      // kyc_status is set to 'pending' by the edge function (service_role)
      setKycStatus('pending');
      setStep(2);
      setPolling(true);
      toast.success('Datos enviados. Completa la verificación biométrica.');
    } catch (err: any) {
      toast.error('Error al iniciar verificación: ' + (err.message || 'Error desconocido'));
    }
    setSubmitting(false);
  };

  const selectedDocType = DOC_TYPES.find(d => d.value === docType);

  // Verified state
  if (!kycLoading && kycStatus === 'verified') {
    return (
      <div className="max-w-2xl space-y-4">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" /> Verificación de identidad
        </h2>
        <Card className="border-border/40">
          <CardContent className="p-8 flex flex-col items-center text-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10">
              <CheckCircle2 className="h-8 w-8 text-emerald-500" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-emerald-600">Identidad verificada</h3>
              <p className="text-sm text-muted-foreground">
                Tu identidad ha sido verificada correctamente.
                Puedes registrar obras sin restricciones.
              </p>
            </div>
            <Button onClick={() => navigate('/dashboard/register')}>
              Registrar una obra →
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Pending without URL (returning user)
  if (!kycLoading && kycStatus === 'pending' && !kycUrl) {
    return (
      <div className="max-w-2xl space-y-4">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" /> Verificación de identidad
        </h2>
        <Card className="border-border/40">
          <CardContent className="p-8 flex flex-col items-center text-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/10">
              <Loader2 className="h-8 w-8 text-amber-500 animate-spin" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-amber-600">Verificación en proceso</h3>
              <p className="text-sm text-muted-foreground">
                Tu solicitud está siendo revisada. Este proceso puede tardar
                hasta 48 horas. Te notificaremos por email cuando esté lista.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isIframeStep = step === 2 && !!kycUrl;

  return (
    <div className={`space-y-4 ${isIframeStep ? 'max-w-full' : 'max-w-2xl'}`}>
      <h2 className="text-xl font-bold flex items-center gap-2">
        <Shield className="h-5 w-5 text-primary" /> Verificación de identidad
      </h2>
      {!isIframeStep && (
        <p className="text-sm text-muted-foreground">
          Necesitas verificar tu identidad para registrar obras en MusicDibs.
          El proceso es rápido y seguro, realizado por iCommunity Labs.
        </p>
      )}

      {kycLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-8 justify-center">
          <Loader2 className="h-4 w-4 animate-spin" /> Cargando…
        </div>
      ) : (
        <Card className="border-border/40">
          <CardContent className="p-6 space-y-6">
            <StepIndicator current={step} />

            {/* Step 1 */}
            {step === 1 && (
              <form onSubmit={handleStep1Submit} className="space-y-5">
                <div className="rounded-lg bg-muted/30 border border-border/30 p-4 flex gap-3">
                  <Info className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <p className="text-xs text-muted-foreground">
                    Introduce los datos tal y como aparecen en tu documento oficial.
                    Serán usados para generar tu firma digital y verificar tu identidad
                    en el siguiente paso.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5" /> Nombre completo *
                  </Label>
                  <Input
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    placeholder="Tal y como aparece en tu documento oficial"
                    required
                    className="h-9"
                  />
                  <p className="text-[10px] text-muted-foreground">Ejemplo: María García López</p>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5" /> Tipo de documento *
                  </Label>
                  <Select value={docType} onValueChange={setDocType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DOC_TYPES.map(d => (
                        <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5" /> Número de documento *
                  </Label>
                  <Input
                    value={docNumber}
                    onChange={e => setDocNumber(e.target.value.toUpperCase())}
                    placeholder={selectedDocType?.placeholder || 'Número del documento'}
                    required
                    className="h-9 font-mono tracking-wider uppercase"
                    maxLength={30}
                  />
                  <p className="text-[10px] text-muted-foreground">
                    {docType === 'dni' && 'DNI español: 8 dígitos + letra. Ejemplo: 12345678A'}
                    {docType === 'nie' && 'NIE: letra inicial (X, Y o Z) + 7 dígitos + letra. Ejemplo: X1234567A'}
                    {docType === 'passport' && 'Número de pasaporte tal y como aparece en la página de datos.'}
                    {docType === 'curp' && 'CURP mexicano: 18 caracteres alfanuméricos.'}
                    {docType === 'cpf' && 'CPF brasileño: 11 dígitos. Ejemplo: 000.000.000-00'}
                    {docType === 'rut' && 'RUT chileno incluyendo el dígito verificador.'}
                    {(docType === 'id_card' || docType === 'cedula' || docType === 'other') &&
                      'Introduce el número tal y como aparece en tu documento.'}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs flex items-center gap-1.5">
                    <Globe className="h-3.5 w-3.5" /> País de emisión del documento
                  </Label>
                  <Select value={country} onValueChange={setCountry}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ES">🇪🇸 España</SelectItem>
                      <SelectItem value="MX">🇲🇽 México</SelectItem>
                      <SelectItem value="AR">🇦🇷 Argentina</SelectItem>
                      <SelectItem value="CO">🇨🇴 Colombia</SelectItem>
                      <SelectItem value="CL">🇨🇱 Chile</SelectItem>
                      <SelectItem value="PE">🇵🇪 Perú</SelectItem>
                      <SelectItem value="BR">🇧🇷 Brasil</SelectItem>
                      <SelectItem value="VE">🇻🇪 Venezuela</SelectItem>
                      <SelectItem value="US">🇺🇸 Estados Unidos</SelectItem>
                      <SelectItem value="GB">🇬🇧 Reino Unido</SelectItem>
                      <SelectItem value="OTHER">🌍 Otro país</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="rounded-lg bg-muted/30 border border-border/30 p-3 flex gap-2">
                  <Shield className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <p className="text-[10px] text-muted-foreground">
                    Tus datos son procesados de forma segura por
                    <strong> iCommunity Labs</strong> para la verificación de identidad.
                    No almacenamos los datos de tu documento en nuestros servidores.
                  </p>
                </div>

                <Button type="submit" className="w-full gap-2" disabled={submitting}>
                  {submitting
                    ? <><Loader2 className="h-4 w-4 animate-spin" /> Iniciando verificación…</>
                    : <>Siguiente — Verificación biométrica <ChevronRight className="h-4 w-4" /></>
                  }
                </Button>
              </form>
            )}

            {/* Step 2 */}
            {step === 2 && kycUrl && (
              <div className="space-y-4">
                <div className="rounded-lg bg-muted/30 border border-border/30 p-4 flex gap-3">
                  <Info className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <p className="text-xs text-muted-foreground">
                    Completa la verificación en el panel de abajo.
                    Necesitarás tu documento de identidad y acceso a la cámara.
                    <strong> No cierres esta página hasta finalizar.</strong>
                  </p>
                </div>

                {kycStatus === 'pending' && (
                  <div className="flex items-center justify-between rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
                    <Badge variant="outline" className="gap-1.5 bg-amber-500/10 text-amber-600 border-amber-500/20">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Verificación en proceso…
                    </Badge>
                    <span className="text-[10px] text-muted-foreground">Actualizando automáticamente</span>
                  </div>
                )}

                {/* Always show open-in-new-tab option prominently */}
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 flex flex-col sm:flex-row items-center gap-3">
                  <div className="flex-1 text-center sm:text-left">
                    <p className="text-sm font-medium">¿Problemas con la verificación?</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Si la cámara no funciona o el proceso no avanza, ábrelo en una nueva pestaña.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(kycUrl, '_blank', 'noopener,noreferrer')}
                    className="gap-2 shrink-0"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Abrir en nueva pestaña
                  </Button>
                </div>

                {!iframeError ? (
                  <div className="rounded-lg overflow-hidden border border-border/40">
                    <iframe
                      ref={iframeRef}
                      src={kycUrl}
                      className="w-full"
                      style={{ height: 'calc(100vh - 280px)', minHeight: '500px' }}
                      allow="camera; microphone; fullscreen"
                      title="Verificación de identidad"
                      onError={() => setIframeError(true)}
                      onLoad={() => console.log('[KYC] iframe loaded')}
                    />
                  </div>
                ) : (
                  <div className="rounded-lg border border-border/40 bg-muted/20 p-8 text-center space-y-4">
                    <AlertCircle className="h-10 w-10 mx-auto text-amber-400" />
                    <div>
                      <p className="font-medium">La verificación debe completarse en una ventana externa</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Haz clic en el botón de arriba para abrir el proceso.
                        Una vez finalices, vuelve a esta página.
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Esta página se actualizará automáticamente cuando termines.
                    </p>
                  </div>
                )}

                <Button
                  variant="outline" size="sm" className="w-full gap-2"
                  onClick={async () => {
                    const { data } = await supabase
                      .from('profiles')
                      .select('kyc_status')
                      .eq('user_id', user!.id)
                      .single();
                    if (data?.kyc_status === 'verified') {
                      setKycStatus('verified');
                      toast.success('¡Identidad verificada correctamente!');
                    } else {
                      toast.info('La verificación aún está en proceso. Si ya la completaste, puede tardar unos minutos.');
                    }
                  }}
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Ya completé la verificación — comprobar estado
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
