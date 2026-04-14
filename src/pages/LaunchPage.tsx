import { useState } from 'react';
import { FirstHitFlow } from '@/components/dashboard/FirstHitFlow';
import { PricingPopup } from '@/components/dashboard/PricingPopup';
import { Button } from '@/components/ui/button';
import { Coins } from 'lucide-react';

export default function LaunchPage() {
  const [pricingOpen, setPricingOpen] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground" onClick={() => setPricingOpen(true)}>
          <Coins className="h-4 w-4" />
          Ver precios
        </Button>
      </div>
      <FirstHitFlow />
      <PricingPopup open={pricingOpen} onOpenChange={setPricingOpen} />
    </div>
  );
}
