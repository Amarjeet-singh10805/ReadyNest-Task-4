import { useWorkspaceStore } from '@/store/workspace';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { getInitials, timeAgo, actionLabel } from '@/lib/utils';
import { FileText, Edit3, Trash2, RotateCcw, Download, LogIn, UserPlus } from 'lucide-react';
import { cn } from '@/lib/utils';

const actionIcons: Record<string, JSX.Element> = {
  CREATE: <FileText className="h-3 w-3" />,
  EDIT: <Edit3 className="h-3 w-3" />,
  DELETE: <Trash2 className="h-3 w-3" />,
  RESTORE: <RotateCcw className="h-3 w-3" />,
  EXPORT: <Download className="h-3 w-3" />,
  LOGIN: <LogIn className="h-3 w-3" />,
  INVITE: <UserPlus className="h-3 w-3" />,
};

const actionColors: Record<string, string> = {
  CREATE: 'text-green-500',
  EDIT: 'text-blue-500',
  DELETE: 'text-red-500',
  RESTORE: 'text-yellow-500',
  EXPORT: 'text-purple-500',
  LOGIN: 'text-gray-500',
  INVITE: 'text-cyan-500',
};

export function ActivityFeed() {
  const { activities } = useWorkspaceStore();

  if (activities.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center">
        <FileText className="h-8 w-8 text-muted-foreground/40 mb-2" />
        <p className="text-sm text-muted-foreground">No activity yet</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="space-y-1 p-2">
        {activities.map((activity) => (
          <div key={activity.id} className="flex items-start gap-3 rounded-md p-2 hover:bg-muted/50 transition-colors">
            <Avatar className="h-7 w-7 shrink-0 mt-0.5">
              <AvatarImage src={activity.user.avatar || undefined} />
              <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                {getInitials(activity.user.name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs font-medium truncate">{activity.user.name}</span>
                <span className={cn('flex items-center gap-0.5 text-xs', actionColors[activity.action] || 'text-muted-foreground')}>
                  {actionIcons[activity.action]}
                  {actionLabel[activity.action] || activity.action.toLowerCase()}
                </span>
                {(activity.metadata as Record<string, unknown>)?.title && (
                  <span className="text-xs text-muted-foreground truncate max-w-[100px]">
                    "{String((activity.metadata as Record<string, unknown>).title)}"
                  </span>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">{timeAgo(activity.createdAt)}</p>
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}
