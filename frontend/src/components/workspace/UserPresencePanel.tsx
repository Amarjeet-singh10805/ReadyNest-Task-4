import { useWorkspaceStore } from '@/store/workspace';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getInitials } from '@/lib/utils';
import { Users } from 'lucide-react';

export function UserPresencePanel() {
  const { activeUsers } = useWorkspaceStore();

  return (
    <div className="space-y-1">
      {activeUsers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-6 text-center">
          <Users className="h-7 w-7 text-muted-foreground/40 mb-2" />
          <p className="text-xs text-muted-foreground">No one else here</p>
        </div>
      ) : (
        activeUsers.map((u) => (
          <div key={u.id} className="flex items-center gap-2.5 rounded-md px-2 py-1.5 hover:bg-muted/50">
            <div className="relative">
              <Avatar className="h-7 w-7">
                <AvatarImage src={u.avatar || undefined} />
                <AvatarFallback className="text-[10px]" style={{ backgroundColor: u.color + '30', color: u.color }}>
                  {getInitials(u.name)}
                </AvatarFallback>
              </Avatar>
              <span
                className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-background bg-green-500"
                title="Online"
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate">{u.name}</p>
              <p className="text-[10px] text-muted-foreground truncate">{u.email}</p>
            </div>
            <div className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: u.color }} title="Cursor color" />
          </div>
        ))
      )}
    </div>
  );
}
