import { useNotifications } from '@/hooks/useNotifications';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Bell, CheckCircle2, XCircle, Info, CheckCheck, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const iconMap = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
};

const colorMap = {
  success: 'text-emerald-500',
  error: 'text-destructive',
  info: 'text-primary',
};

export function NotificationBell() {
  const { t } = useTranslation();
  const { notifications, unreadCount, markAsRead, markAllAsRead, clearAll } = useNotifications();

  const timeAgo = (ts: string) => {
    const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
    if (diff < 60) return t('dashboard.notifications.time.now');
    if (diff < 3600) return t('dashboard.notifications.time.minutes', { count: Math.floor(diff / 60) });
    if (diff < 86400) return t('dashboard.notifications.time.hours', { count: Math.floor(diff / 3600) });
    return t('dashboard.notifications.time.days', { count: Math.floor(diff / 86400) });
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-8 w-8">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
              {unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b border-border/40 px-4 py-2.5">
          <span className="text-sm font-semibold">{t('dashboard.notifications.title')}</span>
          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1" onClick={markAllAsRead}>
                <CheckCheck className="h-3 w-3" /> {t('dashboard.notifications.markAll')}
              </Button>
            )}
            {notifications.length > 0 && (
              <Button aria-label={t('dashboard.notifications.clear')} variant="ghost" size="sm" className="h-7 px-2 text-xs text-muted-foreground" onClick={clearAll}>
                <Trash2 className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>

        {notifications.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            <Bell className="h-6 w-6 mx-auto mb-2 opacity-30" />
            {t('dashboard.notifications.empty')}
          </div>
        ) : (
          <ScrollArea className="max-h-80">
            <div className="divide-y divide-border/30">
              {notifications.map(n => {
                const Icon = iconMap[n.type];
                return (
                  <button
                    key={n.id}
                    className={`w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-muted/50 transition-colors ${!n.read ? 'bg-primary/5' : ''}`}
                    onClick={() => markAsRead(n.id)}
                  >
                    <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${colorMap[n.type]}`} />
                    <div className="flex-1 min-w-0 space-y-0.5">
                      <div className="flex items-center justify-between gap-2">
                        <p className={`text-xs font-medium truncate ${!n.read ? 'text-foreground' : 'text-muted-foreground'}`}>
                          {n.title}
                        </p>
                        <span className="text-[10px] text-muted-foreground shrink-0">{timeAgo(n.timestamp)}</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-snug">{n.message}</p>
                    </div>
                    {!n.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />}
                  </button>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </PopoverContent>
    </Popover>
  );
}
