import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, Folder, Users, FileText, Trash2, MoreHorizontal, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useWorkspaceStore } from '@/store/workspace';
import { useAuthStore } from '@/store/auth';
import api from '@/lib/api';
import { toast } from '@/hooks/use-toast';
import { timeAgo, getInitials } from '@/lib/utils';
import { Workspace } from '@/types';

export function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { workspaces, setWorkspaces, addWorkspace, removeWorkspace } = useWorkspaceStore();
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    api.get('/workspaces')
      .then(({ data }) => setWorkspaces(data))
      .catch(() => toast({ title: 'Failed to load workspaces', variant: 'destructive' }))
      .finally(() => setLoading(false));
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setCreating(true);
    try {
      const { data } = await api.post('/workspaces', { title: newTitle.trim() });
      addWorkspace(data);
      setCreateOpen(false);
      setNewTitle('');
      toast({ title: 'Workspace created' });
      navigate(`/workspace/${data.id}`);
    } catch {
      toast({ title: 'Failed to create workspace', variant: 'destructive' });
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (ws: Workspace) => {
    if (!confirm(`Delete "${ws.title}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/workspaces/${ws.id}`);
      removeWorkspace(ws.id);
      toast({ title: 'Workspace deleted' });
    } catch {
      toast({ title: 'Failed to delete workspace', variant: 'destructive' });
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.06 } },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 16 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8 flex items-center justify-between"
      >
        <div>
          <h1 className="text-2xl font-bold">
            Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'},{' '}
            {user?.name?.split(' ')[0]} 👋
          </h1>
          <p className="text-muted-foreground mt-1">
            {workspaces.length === 0 ? 'Create your first workspace to get started' : `You have ${workspaces.length} workspace${workspaces.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="gap-2 shadow-sm">
          <Plus className="h-4 w-4" /> New Workspace
        </Button>
      </motion.div>

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8"
      >
        {[
          { icon: Folder, label: 'Workspaces', value: workspaces.length, color: 'text-violet-500' },
          { icon: FileText, label: 'Documents', value: workspaces.reduce((a, w) => a + (w._count?.documents || 0), 0), color: 'text-blue-500' },
          { icon: Users, label: 'Collaborators', value: [...new Set(workspaces.flatMap((w) => w.members.map((m) => m.userId)))].length, color: 'text-green-500' },
        ].map((stat) => (
          <Card key={stat.label} className="border-border/50">
            <CardContent className="flex items-center gap-4 p-5">
              <div className={`rounded-lg bg-muted p-2.5 ${stat.color}`}>
                <stat.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </motion.div>

      {/* Workspaces grid */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : workspaces.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-16 text-center"
        >
          <div className="rounded-full bg-muted p-5 mb-4">
            <Folder className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="font-semibold text-lg">No workspaces yet</h3>
          <p className="text-muted-foreground text-sm mt-1 mb-4">Create your first workspace and start collaborating</p>
          <Button onClick={() => setCreateOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" /> Create workspace
          </Button>
        </motion.div>
      ) : (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          {workspaces.map((ws) => (
            <motion.div key={ws.id} variants={itemVariants}>
              <Card className="group hover:shadow-md hover:border-primary/30 transition-all duration-200 cursor-pointer border-border/50">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5" onClick={() => navigate(`/workspace/${ws.id}`)}>
                      <div className="rounded-lg bg-primary/10 p-2">
                        <Folder className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-base line-clamp-1">{ws.title}</CardTitle>
                        <CardDescription className="text-xs">{timeAgo(ws.updatedAt)}</CardDescription>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link to={`/workspace/${ws.id}`}>Open workspace</Link>
                        </DropdownMenuItem>
                        {ws.ownerId === user?.id && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => handleDelete(ws)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" /> Delete
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent onClick={() => navigate(`/workspace/${ws.id}`)}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <FileText className="h-3 w-3" />
                        {ws._count?.documents || 0} docs
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Users className="h-3 w-3" />
                        {ws.members.length} members
                      </div>
                    </div>
                    <div className="flex -space-x-1.5">
                      {ws.members.slice(0, 4).map((m) => (
                        <Avatar key={m.id} className="h-6 w-6 border-2 border-background">
                          <AvatarImage src={m.user.avatar || undefined} />
                          <AvatarFallback className="text-[9px] bg-primary/10 text-primary">
                            {getInitials(m.user.name)}
                          </AvatarFallback>
                        </Avatar>
                      ))}
                      {ws.members.length > 4 && (
                        <div className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-background bg-muted text-[9px] font-medium">
                          +{ws.members.length - 4}
                        </div>
                      )}
                    </div>
                  </div>
                  {ws.ownerId === user?.id && (
                    <Badge variant="outline" className="mt-2 text-[10px] h-5">Owner</Badge>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Create workspace</DialogTitle>
            <DialogDescription>Give your new workspace a name to get started</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <Input
              placeholder="e.g. Product Design, Engineering, Marketing"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              autoFocus
              required
            />
            <div className="flex gap-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="flex-1" disabled={creating || !newTitle.trim()}>
                {creating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Create
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
