import { useState } from 'react';
import { motion } from 'framer-motion';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { SEO } from '@/components/SEO';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { FolderOpen, PenLine, BarChart3, ArrowDown, CheckCircle2, Send, Loader2 } from 'lucide-react';

const countries = [
  'España', 'México', 'Argentina', 'Colombia', 'Chile', 'Perú', 'Ecuador', 'Venezuela',
  'Uruguay', 'Paraguay', 'Bolivia', 'Costa Rica', 'Panamá', 'República Dominicana',
  'Guatemala', 'Honduras', 'El Salvador', 'Nicaragua', 'Cuba', 'Puerto Rico',
  'Alemania', 'Francia', 'Italia', 'Portugal', 'Reino Unido', 'Países Bajos', 'Bélgica', 'Suiza', 'Austria', 'Suecia',
  'Otro',
];

const faqItems = [
  {
    q: '¿Necesitan cuenta mis artistas?',
    a: 'No es necesario. Tú actúas como representante autorizado. Tus artistas pueden tener cuenta propia si lo desean, pero no es obligatorio.',
  },
  {
    q: '¿Quién verifica la identidad?',
    a: 'Solo el manager o representante verifica su identidad (KYC). La relación contractual con cada artista es responsabilidad del representante.',
  },
  {
    q: '¿Tiene precio fijo?',
    a: 'No. El precio se acuerda según el número de artistas, volumen anual de obras y servicios incluidos. Contáctanos para un presupuesto personalizado.',
  },
  {
    q: '¿Incluye el AI Studio?',
    a: 'Sí. Los managers tienen acceso completo al AI Studio para crear contenido para sus artistas.',
  },
  {
    q: '¿Puedo distribuir las obras de mis artistas?',
    a: 'Sí, la distribución en más de 200 plataformas está disponible para todos los artistas de tu cartera.',
  },
];

const steps = [
  { n: '1', title: 'Contacta con nosotros', desc: 'Te preparamos un presupuesto personalizado según tu cartera' },
  { n: '2', title: 'Verificas tu identidad', desc: 'KYC como representante una sola vez' },
  { n: '3', title: 'Añades tus artistas', desc: 'Alta de artistas con datos básicos y tipo de representación' },
  { n: '4', title: 'Gestionas todo desde tu panel', desc: 'Registra, distribuye y exporta desde un único lugar' },
];

export default function ManagerLanding() {
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    company_name: '',
    country: '',
    estimated_artists: '',
    estimated_works: '',
    needs_distribution: true,
    needs_ai_studio: false,
    message: '',
  });

  const set = (k: string, v: any) => setForm(prev => ({ ...prev, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.full_name.trim() || !form.email.trim() || !form.estimated_artists) {
      toast.error('Rellena los campos obligatorios');
      return;
    }
    setSending(true);
    const { error } = await supabase.from('manager_contact_requests' as any).insert([{
      full_name: form.full_name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim() || null,
      company_name: form.company_name.trim() || null,
      country: form.country || null,
      estimated_artists: form.estimated_artists,
      estimated_works: form.estimated_works || null,
      needs_distribution: form.needs_distribution,
      needs_ai_studio: form.needs_ai_studio,
      message: form.message.trim() || null,
    }]);
    setSending(false);
    if (error) {
      toast.error('Error al enviar. Inténtalo de nuevo.');
      console.error(error);
    } else {
      setSent(true);
      toast.success('¡Solicitud recibida! Te contactaremos en menos de 24 horas.');
    }
  };

  const scrollToForm = () => {
    document.getElementById('contacto-manager')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen page-bg">
      <SEO
        title="Managers y Agencias Musicales | MusicDibs"
        description="Gestiona la propiedad intelectual de toda tu cartera de artistas. Registro en blockchain, distribución y panel de control para managers y agencias."
        path="/manager"
      />
      <Navbar />

      {/* HERO */}
      <section className="relative pt-32 pb-28 px-4 overflow-hidden">
        {/* Background effects */}
        <div className="absolute inset-0 bg-gradient-to-b from-primary/8 via-transparent to-transparent pointer-events-none" />
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-primary/5 blur-3xl pointer-events-none" />
        <div className="absolute top-40 right-0 w-72 h-72 rounded-full bg-primary/3 blur-2xl pointer-events-none" />

        <div className="max-w-4xl mx-auto text-center space-y-8 relative z-10">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <Badge variant="secondary" className="text-sm px-4 py-1.5">
              Para managers y agencias
            </Badge>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="text-4xl md:text-5xl lg:text-6xl font-extrabold leading-[1.1] tracking-tight"
          >
            Gestiona la propiedad intelectual de{' '}
            <span className="bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              toda tu cartera
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed"
          >
            La plataforma para managers, productores y agencias musicales. Registra y distribuye las obras de todos tus artistas desde un solo panel.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.45 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2"
          >
            <Button size="lg" onClick={scrollToForm} className="gap-2 text-base px-8 h-12 shadow-lg shadow-primary/20">
              Solicitar presupuesto <ArrowDown className="h-4 w-4" />
            </Button>
          </motion.div>

          {/* Trust indicators */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.6 }}
            className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 pt-4 text-sm text-muted-foreground"
          >
            <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-primary" /> Sin compromiso</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-primary" /> Presupuesto en 24h</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-primary" /> Registro en blockchain</span>
          </motion.div>
        </div>
      </section>

      {/* VALOR */}
      <section className="py-20 px-4 bg-muted/20">
        <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-8">
          {[
            { icon: FolderOpen, title: 'Cartera centralizada', desc: 'Gestiona todos tus artistas desde un único panel con visibilidad total de sus obras y registros.' },
            { icon: PenLine, title: 'Registro delegado', desc: 'Registra obras en blockchain en nombre de tus artistas como representante autorizado. Sin necesidad de que ellos accedan a la plataforma.' },
            { icon: BarChart3, title: 'Informes y exportación', desc: 'Exporta el historial completo de obras por artista en CSV. Control total para tu gestión.' },
          ].map((v, i) => (
            <motion.div
              key={v.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{ duration: 0.5, delay: i * 0.15 }}
            >
              <Card className="bg-card border-border/50 h-full">
                <CardContent className="pt-8 pb-6 px-6 text-center space-y-4">
                  <div className="mx-auto h-14 w-14 rounded-xl bg-primary/20 flex items-center justify-center">
                    <v.icon className="h-7 w-7 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground">{v.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{v.desc}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CÓMO FUNCIONA */}
      <section className="py-20 px-4 bg-muted/30">
        <div className="max-w-4xl mx-auto space-y-12">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-3xl md:text-4xl font-bold text-center"
          >
            Cómo funciona
          </motion.h2>
          <div className="grid sm:grid-cols-2 gap-8">
            {steps.map((s, i) => (
              <motion.div
                key={s.n}
                initial={{ opacity: 0, x: i % 2 === 0 ? -20 : 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: '-50px' }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="flex gap-4"
              >
                <div className="shrink-0 h-10 w-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold">
                  {s.n}
                </div>
                <div>
                  <h4 className="font-semibold text-lg">{s.title}</h4>
                  <p className="text-muted-foreground text-sm mt-1">{s.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 px-4">
        <div className="max-w-3xl mx-auto space-y-8">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-3xl md:text-4xl font-bold text-center"
          >
            Preguntas frecuentes
          </motion.h2>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-50px' }}
            transition={{ duration: 0.5, delay: 0.15 }}
          >
            <Accordion type="single" collapsible className="w-full">
              {faqItems.map((f, i) => (
                <AccordionItem key={i} value={`faq-${i}`}>
                  <AccordionTrigger className="text-left">{f.q}</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">{f.a}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </motion.div>
        </div>
      </section>

      {/* FORMULARIO */}
      <section id="contacto-manager" className="py-20 px-4 bg-muted/30">
        <div className="max-w-2xl mx-auto space-y-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center space-y-2"
          >
            <h2 className="text-3xl md:text-4xl font-bold">Solicita tu presupuesto personalizado</h2>
            <p className="text-muted-foreground">Sin compromiso. Te respondemos en menos de 24 horas.</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-50px' }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
          {sent ? (
            <Card className="bg-card/60 border-primary/30">
              <CardContent className="py-12 text-center space-y-4">
                <CheckCircle2 className="h-16 w-16 text-primary mx-auto" />
                <h3 className="text-2xl font-bold">¡Solicitud recibida!</h3>
                <p className="text-muted-foreground">Te contactaremos en menos de 24 horas.</p>
              </CardContent>
            </Card>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nombre completo *</Label>
                  <Input value={form.full_name} onChange={e => set('full_name', e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label>Email *</Label>
                  <Input type="email" value={form.email} onChange={e => set('email', e.target.value)} required />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Teléfono</Label>
                  <Input value={form.phone} onChange={e => set('phone', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Nombre empresa o agencia</Label>
                  <Input value={form.company_name} onChange={e => set('company_name', e.target.value)} />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>País</Label>
                  <Select value={form.country} onValueChange={v => set('country', v)}>
                    <SelectTrigger><SelectValue placeholder="Selecciona país" /></SelectTrigger>
                    <SelectContent>
                      {countries.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Nº artistas estimado *</Label>
                  <Select value={form.estimated_artists} onValueChange={v => set('estimated_artists', v)}>
                    <SelectTrigger><SelectValue placeholder="Selecciona" /></SelectTrigger>
                    <SelectContent>
                      {['1-5', '6-15', '16-30', 'Más de 30'].map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Obras anuales estimadas</Label>
                <Select value={form.estimated_works} onValueChange={v => set('estimated_works', v)}>
                  <SelectTrigger><SelectValue placeholder="Selecciona" /></SelectTrigger>
                  <SelectContent>
                    {['Menos de 50', '50-200', '200-500', 'Más de 500'].map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <Checkbox id="dist" checked={form.needs_distribution} onCheckedChange={v => set('needs_distribution', !!v)} />
                  <Label htmlFor="dist" className="cursor-pointer">Necesito distribución en plataformas</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox id="ai" checked={form.needs_ai_studio} onCheckedChange={v => set('needs_ai_studio', !!v)} />
                  <Label htmlFor="ai" className="cursor-pointer">Necesito AI Studio</Label>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Mensaje / notas adicionales</Label>
                <Textarea rows={4} value={form.message} onChange={e => set('message', e.target.value)} placeholder="Cuéntanos más sobre tu cartera o necesidades..." />
              </div>

              <Button type="submit" size="lg" className="w-full gap-2" disabled={sending}>
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Enviar solicitud
              </Button>
            </form>
          )}
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
