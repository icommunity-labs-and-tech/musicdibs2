import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, CheckCircle2 } from 'lucide-react';

const bullets = [
  'Cartera centralizada de artistas',
  'Registro delegado en blockchain',
  'Informes exportables por artista',
];

export function ManagerBannerSection() {
  const navigate = useNavigate();

  return (
    <section className="py-16 px-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/10 pointer-events-none" />
      <div className="max-w-5xl mx-auto relative">
        <div className="rounded-2xl border border-primary/20 bg-card/40 backdrop-blur-sm p-8 md:p-12 space-y-6">
          <Badge variant="secondary" className="text-xs px-3 py-1">
            Para managers y agencias
          </Badge>

          <div className="space-y-3">
            <h2 className="text-2xl md:text-3xl font-bold">¿Gestionas artistas?</h2>
            <p className="text-muted-foreground max-w-xl">
              Registra y distribuye las obras de toda tu cartera desde un único panel. Presupuesto personalizado según tus necesidades.
            </p>
          </div>

          <div className="flex flex-wrap gap-x-6 gap-y-2">
            {bullets.map((b) => (
              <span key={b} className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                {b}
              </span>
            ))}
          </div>

          <Button onClick={() => navigate('/manager')} className="gap-2">
            Conocer más <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </section>
  );
}
