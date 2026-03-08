import { useEffect, useRef } from 'react';
import { useNotifications, type DashboardNotification } from '@/hooks/useNotifications';
import { toast } from 'sonner';
import { CheckCircle2, XCircle, Info } from 'lucide-react';

const iconMap = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
};

/** Plays a short notification chime using Web Audio API */
function playNotificationSound() {
  try {
    const enabled = localStorage.getItem('notif_sound') !== 'off';
    if (!enabled) return;

    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.setValueAtTime(1100, ctx.currentTime + 0.08);
    osc.frequency.setValueAtTime(880, ctx.currentTime + 0.16);

    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.35);

    osc.onended = () => ctx.close();
  } catch {
    // Audio not available — silently skip
  }
}

export function NotificationToaster() {
  const { notifications } = useNotifications();
  const shownRef = useRef(new Set<string>());

  useEffect(() => {
    for (const n of notifications) {
      if (shownRef.current.has(n.id)) continue;
      shownRef.current.add(n.id);

      playNotificationSound();

      const Icon = iconMap[n.type];
      toast(n.title, {
        description: n.message,
        icon: <Icon className={`h-4 w-4 ${n.type === 'success' ? 'text-emerald-500' : n.type === 'error' ? 'text-destructive' : 'text-primary'}`} />,
        duration: 5000,
      });
    }
  }, [notifications]);

  return null;
}
