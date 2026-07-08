import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Plus, FileText, Users, Activity, ChevronLeft, MoreHorizontal,
  Trash2, UserPlus, Loader2, Settings
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useWorkspaceStore } from '@/store/workspace';
import { useAuthStore } from '@/store/auth';
import { ActivityFeed } from '@/components/workspace/ActivityFeed';
import { UserPresencePanel } from '@/components/workspace/UserPresencePanel';
import { LiveCursorLayer } from '@/components/workspace/LiveCursorLayer';
import api from '@/lib/api';
import { toast } from '@/hooks/use-toast';
import { getSocket } from '@/lib/socket';
import { timeAgo, getInitials } from '@/lib/utils';
import { Document, ActiveUser, Activity as ActivityType, CursorUpdate } from '@/types';

type Tab = 'documents' | 'members' | 'activity';

export function WorkspacePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const {
    currentWorkspace, setCurrentWorkspace, documents, setDocuments,
    addDocument, removeDocument, activities, setActivities,
    setActiveUsers, prependActivity, updateCursor, removeCursor
  } = useWorkspaceStore();

  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('documents');
  const [createDocOpen, setCreateDocOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [newDocTitle, setNewDocTitle] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'EDITOR' | 'VIEWER'>('EDITOR');
  const [submitting, setSubmitting] = useState(false);

  const loadWorkspace = useCallback(async () => {
    if (!id) return;
    try {
      const [wsRes, docsRes, actRes] = await Promise.all([
        api.get(`/workspaces/${id}`),
        api.get(`/workspaces/${id}/documents`),
        api.get(`/workspaces/${id}/activities`),
      ]);
      setCurrentWorkspace(wsRes.data);
      setDocuments(docsRes.data);
      setActivities(actRes.data);
    } catch {
      toast({ title: 'Failed to load workspace', variant: 'destructive' });
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadWorkspace();
  }, [loadWorkspace]);

  // Socket setup
  useEffect(() => {
    if (!id) return;
    const socket = getSocket();
    if (!socket) return;

    socket.emit('workspace:join', id);

    socket.on('presence:update', (users: ActiveUser[]) => setActiveUsers(users));
    socket.on('user:join', ({ user: u }: { user: ActiveUser }) => {
      toast({ title: `${u.name} joined`, description: 'Now collaborating' });
    });
    socket.on('user:leave', ({ user: u }: { user: ActiveUser }) => {
      removeCursor(u.id);
    });
    socket.on('cursor:update', (data: CursorUpdate) => updateCursor(data));
    socket.on('activity:new', (act: ActivityType) => prependActivity(act));

    return () => {
      socket.emit('workspace:leave', id);
      socket.off('presence:update');
      socket.off('user:join');
      socket.off('user:leave');
      socket.off('cursor:update');
      socket.off('activity:new');
      setActiveUsers([]);
    };
  }, [id]);

  const handleCreateDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDocTitle.trim() || !id) return;
    setSubmitting(true);
    try {
      const { data } = await api.post(`/workspaces/${id}/documents`, { title: newDocTitle.trim() });
      addDocument(data);
      setCreateDocOpen(false);
      setNewDocTitle('');
      toast({ title: 'Document created' });
      navigate(`/document/${data.id}`);
    } catch {
      toast({ title: 'Failed to create document', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim() || !id) return;
    setSubmitting(true);
    try {
      await api.post(`/workspaces/${id}/invite`, { email: inviteEmail.trim(), role: inviteRole });
      setInviteOpen(false);
      setInviteEmail('');
      setInviteRole('EDITOR');
      toast({ title: `Invited as ${inviteRole.toLowerCase()}` });
      loadWorkspace();
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to invite';
      toast({ title: message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteDoc = async (doc: Document) => {
    if (!confirm(`Delete "${doc.title}"?`)) return;
    try {
      await api.delete(`/documents/${doc.id}`);
      removeDocument(doc.id);
      toast({ title: 'Document deleted' });
    } catch {
      toast({ title: 'Failed to delete document', variant: 'destructive' });
    }
  };

  const handleChangeRole = async (userId: string, role: 'EDITOR' | 'VIEWER') => {
    try {
      await api.patch(`/workspaces/${id}/members/${userId}/role`, { role });
      toast({ title: `Role updated to ${role.toLowerCase()}` });
      loadWorkspace();
    } catch {
      toast({ title: 'Failed to update role', variant: 'destructive' });
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!confirm('Remove this member from the workspace?')) return;
    try {
      await api.delete(`/workspaces/${id}/members/${userId}`);
      toast({ title: 'Member removed' });
      loadWorkspace();
    } catch {
      toast({ title: 'Failed to remove member', variant: 'destructive' });
    }
  };

  const isOwner = currentWorkspace?.ownerId === user?.id;
  const canEdit = currentWorkspace?.members.find((m) => m.userId === user?.id)?.role !== 'VIEWER';

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-56px)] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <>
      <LiveCursorLayer />
      <div className="flex h-[calc(100vh-56px)] overflow-hidden">
        {/* Main content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Workspace header */}
          <div className="border-b bg-background px-6 py-4 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                <Link to="/dashboard"><ChevronLeft className="h-4 w-4" /></Link>
              </Button>
              <div>
                <h1 className="font-semibold text-lg leading-tight">{currentWorkspace?.title}</h1>
                <p className="text-xs text-muted-foreground">
                  {documents.length} document{documents.length !== 1 ? 's' : ''} · {currentWorkspace?.members.length} member{(currentWorkspace?.members.length || 0) !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Only OWNER can invite */}
              {isOwner && (
                <Button size="sm" onClick={() => setInviteOpen(true)} variant="outline" className="gap-1.5">
                  <UserPlus className="h-3.5 w-3.5" /> Invite
                </Button>
              )}
              {/* OWNER and EDITOR can create docs */}
              {canEdit && (
                <Button size="sm" onClick={() => setCreateDocOpen(true)} className="gap-1.5">
                  <Plus className="h-3.5 w-3.5" /> New doc
                </Button>
              )}
            </div>
          </div>

          {/* Tabs */}
          <div className="border-b px-6 flex gap-0 shrink-0">
            {(['documents', 'members', 'activity'] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-4 py-2.5 text-sm font-medium capitalize border-b-2 transition-colors ${
                  tab === t ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                {t === 'documents' && <FileText className="inline h-3.5 w-3.5 mr-1.5" />}
                {t === 'members' && <Users className="inline h-3.5 w-3.5 mr-1.5" />}
                {t === 'activity' && <Activity className="inline h-3.5 w-3.5 mr-1.5" />}
                {t}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <ScrollArea className="flex-1">
            <div className="p-6">
              {tab === 'documents' && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"
                >
                  {documents.length === 0 ? (
                    <div className="col-span-full flex flex-col items-center justify-center py-14 text-center">
                      <FileText className="h-10 w-10 text-muted-foreground/30 mb-3" />
                      <h3 className="font-medium">No documents yet</h3>
                      <p className="text-sm text-muted-foreground mt-1">Create your first document to start collaborating</p>
                      {canEdit && (
                        <Button className="mt-4 gap-2" onClick={() => setCreateDocOpen(true)}>
                          <Plus className="h-4 w-4" /> New document
                        </Button>
                      )}
                    </div>
                  ) : (
                    documents.map((doc) => (
                      <Card key={doc.id} className="group hover:shadow-md hover:border-primary/30 transition-all cursor-pointer border-border/50">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div
                              className="flex items-center gap-2.5 flex-1 min-w-0"
                              onClick={() => navigate(`/document/${doc.id}`)}
                            >
                              <div className="rounded-md bg-blue-500/10 p-1.5 shrink-0">
                                <FileText className="h-4 w-4 text-blue-500" />
                              </div>
                              <div className="min-w-0">
                                <p className="font-medium text-sm truncate">{doc.title}</p>
                                <p className="text-xs text-muted-foreground">{timeAgo(doc.updatedAt)}</p>
                              </div>
                            </div>
                            {canEdit && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 shrink-0">
                                    <MoreHorizontal className="h-3.5 w-3.5" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => navigate(`/document/${doc.id}`)}>
                                    Open
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    className="text-destructive focus:text-destructive"
                                    onClick={() => handleDeleteDoc(doc)}
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" /> Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-2 min-h-[2rem]">
                            {doc.content?.slice(0, 100) || 'Empty document'}
                          </p>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </motion.div>
              )}

              {tab === 'members' && (
                <div className="max-w-lg space-y-2">
                  {currentWorkspace?.members.map((m) => (
                    <div key={m.id} className="flex items-center gap-3 rounded-lg border p-3">
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={m.user.avatar || undefined} />
                        <AvatarFallback className="text-sm">{getInitials(m.user.name)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium">{m.user.name}</p>
                          {m.userId === user?.id && <span className="text-xs text-muted-foreground">(you)</span>}
                        </div>
                        <p className="text-xs text-muted-foreground">{m.user.email}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={m.role === 'OWNER' ? 'default' : 'secondary'} className="text-xs">
                          {m.role.toLowerCase()}
                        </Badge>
                        {/* Owner can change role or remove non-owner members */}
                        {isOwner && m.role !== 'OWNER' && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-6 w-6">
                                <Settings className="h-3 w-3" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleChangeRole(m.userId, 'EDITOR')}>
                                Make Editor
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleChangeRole(m.userId, 'VIEWER')}>
                                Make Viewer
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() => handleRemoveMember(m.userId)}
                              >
                                <Trash2 className="mr-2 h-3.5 w-3.5" /> Remove
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {tab === 'activity' && (
                <div className="max-w-lg">
                  <ActivityFeed />
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Right sidebar - presence */}
        <div className="hidden lg:flex w-60 border-l flex-col shrink-0">
          <div className="px-4 py-3 border-b">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Active now</p>
          </div>
          <ScrollArea className="flex-1 p-2">
            <UserPresencePanel />
          </ScrollArea>
        </div>
      </div>

      {/* Create doc dialog */}
      <Dialog open={createDocOpen} onOpenChange={setCreateDocOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>New document</DialogTitle>
            <DialogDescription>Give your document a title</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateDoc} className="space-y-4">
            <Input
              placeholder="Untitled document"
              value={newDocTitle}
              onChange={(e) => setNewDocTitle(e.target.value)}
              autoFocus
              required
            />
            <div className="flex gap-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setCreateDocOpen(false)}>Cancel</Button>
              <Button type="submit" className="flex-1" disabled={submitting}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null} Create
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Invite dialog with role selector */}
      <Dialog open={inviteOpen} onOpenChange={(open) => {
        setInviteOpen(open);
        if (!open) { setInviteEmail(''); setInviteRole('EDITOR'); }
      }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Invite member</DialogTitle>
            <DialogDescription>Invite a user by their email address</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              type="email"
              placeholder="colleague@example.com"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              autoFocus
            />

            {/* Role selector */}
            <div>
              <p className="text-sm font-medium mb-2">Select role</p>
              <div className="flex gap-2">
                {(['EDITOR', 'VIEWER'] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setInviteRole(r)}
                    className={`flex-1 rounded-lg border px-3 py-2.5 text-left transition-colors ${
                      inviteRole === r
                        ? 'border-primary bg-primary/5 text-primary'
                        : 'border-border text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    <p className="text-sm font-medium">
                      {r === 'EDITOR' ? '✏️ Editor' : '👁️ Viewer'}
                    </p>
                    <p className="text-xs mt-0.5 opacity-75">
                      {r === 'EDITOR' ? 'Can create & edit docs' : 'Read only access'}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => setInviteOpen(false)}
              >
                Cancel
              </Button>
              <Button
                className="flex-1"
                disabled={submitting || !inviteEmail.trim()}
                onClick={handleInvite}
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Send invite
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
