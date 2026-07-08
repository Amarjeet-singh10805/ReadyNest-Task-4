import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Bell, CheckCheck, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useNotificationStore } from '@/store/notifications';
import { getSocket } from '@/lib/socket';
import api from '@/lib/api';
import { toast } from '@/hooks/use-toast';
import { timeAgo } from '@/lib/utils';
import { Notification } from '@/types';
import { useState } from 'react';

export function NotificationsPage() {
  const { notifications, setNotifications, addNotification, markRead, markAllRead, unreadCount } = useNotificationStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/notifications')
      .then(({ data }) => setNotifications(data))
      .catch(() => toast({ title: 'Failed to load notifications', variant: 'destructive' }))
      .finally(() => setLoading(false));

    const socket = getSocket();
    if (socket) {
      socket.on('notification:new', (n: Notification) => addNotification(n));
    }
    return () => {
      socket?.off('notification:new');
    };
  }, []);

  const handleMarkRead = async (id: string) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      markRead(id);
    } catch {}
  };

  const handleMarkAllRead = async () => {
    try {
      await api.patch('/notifications/read-all');
      markAllRead();
      toast({ title: 'All marked as read' });
    } catch {
      toast({ title: 'Failed', variant: 'destructive' });
    }
  };

  return (
    <div className="container mx-auto max-w-2xl px-4 py-8">
      <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          <h1 className="text-xl font-bold">Notifications</h1>
          {unreadCount > 0 && (
            <Badge className="text-xs">{unreadCount} new</Badge>
          )}
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={handleMarkAllRead} className="gap-2">
            <CheckCheck className="h-4 w-4" /> Mark all read
          </Button>
        )}
      </motion.div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : notifications.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-16 text-center">
          <Bell className="h-10 w-10 text-muted-foreground/30 mb-3" />
          <h3 className="font-medium">All caught up</h3>
          <p className="text-sm text-muted-foreground mt-1">No notifications right now</p>
        </motion.div>
      ) : (
        <div className="space-y-2">
          {notifications.map((n, i) => (
            <motion.div
              key={n.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
            >
              <Card
                className={`transition-all cursor-pointer hover:border-primary/30 ${!n.read ? 'border-primary/20 bg-primary/5' : 'border-border/50'}`}
                onClick={() => !n.read && handleMarkRead(n.id)}
              >
                <CardContent className="flex items-start gap-3 p-4">
                  <div className={`mt-0.5 h-2 w-2 rounded-full shrink-0 ${!n.read ? 'bg-primary' : 'bg-transparent'}`} />
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm ${!n.read ? 'font-medium' : 'text-muted-foreground'}`}>{n.message}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{timeAgo(n.createdAt)}</p>
                  </div>
                  {!n.read && (
                    <Badge variant="secondary" className="text-[10px] h-5 shrink-0">New</Badge>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
