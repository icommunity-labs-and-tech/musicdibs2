import { useLibraryAccess } from '@/hooks/useLibraryAccess';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

export default function LibraryAccessBanner() {
  const { tier, freeDownloadsRemaining, daysUntilDeletion, isLoading } = useLibraryAccess();

  if (isLoading || tier === 'active') return null;

  if (tier === 'warning') {
    return (
      <Card className="border-amber-500/50 bg-amber-500/5">
        <CardContent className="p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex-1">
              <p className="font-semibold flex items-center gap-2">
                <span>⚠️</span> Tu biblioteca está disponible
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                No tienes una suscripción activa. Tienes{' '}
                <strong>{freeDownloadsRemaining}</strong> descarga(s) gratuita(s) disponibles
                antes de que se restrinja el acceso.
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Con un plan activo tienes descargas ilimitadas y tu biblioteca nunca se archiva.
              </p>
            </div>
            <Button asChild className="shrink-0">
              <Link to="/dashboard/credits">Reactivar plan</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (tier === 'restricted') {
    return (
      <Card className="border-orange-500/50 bg-orange-500/5">
        <CardContent className="p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex-1">
              <p className="font-semibold flex items-center gap-2">
                <span>🔒</span> Descarga restringida
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Has agotado tus descargas gratuitas. Reactiva tu plan para volver a descargar tus
                creaciones.
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Tus archivos están seguros por ahora. Si no reactivas en los próximos días,
                recibirás un aviso antes de cualquier cambio.
              </p>
            </div>
            <Button asChild size="lg" className="shrink-0">
              <Link to="/dashboard/credits">Reactivar mi plan</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (tier === 'pending_deletion') {
    return (
      <Card className="border-destructive/50 bg-destructive/5">
        <CardContent className="p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex-1">
              <p className="font-semibold flex items-center gap-2">
                <span>🚨</span> Tu biblioteca se eliminará en {daysUntilDeletion} días
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Llevas más de 90 días sin una suscripción activa. Tus canciones, portadas y vídeos
                serán eliminados permanentemente si no reactivas tu cuenta.
              </p>
              <p className="text-xs font-bold text-muted-foreground mt-2">
                Esta acción es irreversible. Reactiva hoy para conservar todo tu trabajo.
              </p>
            </div>
            <Button asChild size="lg" variant="destructive" className="shrink-0">
              <Link to="/dashboard/credits">Guardar mi biblioteca ahora</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return null;
}
