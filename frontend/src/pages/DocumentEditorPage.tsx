import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ChevronLeft, Clock, Download, Save, Users, Loader2,
  CheckCircle2, AlertCircle, Eye, EyeOff
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useWorkspaceStore } from '@/store/workspace';
import { useAuthStore } from '@/store/auth';
import { VersionHistoryDrawer } from '@/components/editor/VersionHistoryDrawer';
import { ExportModal } from '@/components/editor/ExportModal';
import { UserPresencePanel } from '@/components/workspace/UserPresencePanel';
import { LiveCursorLayer } from '@/components/workspace/LiveCursorLayer';
import api from '@/lib/api';
import { getSocket } from '@/lib/socket';
import { toast } from '@/hooks/use-toast';
import { ActiveUser, CursorUpdate, DocumentUpdate } from '@/types';


const AUTOSAVE_DELAY = 2000; // 2s debounce
const VERSION_INTERVAL = 60000; // create version every 60s of edits

export function DocumentEditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const {
    currentDocument, setCurrentDocument, updateDocument,
    setActiveUsers, updateCursor, removeCursor, documentVersion, setDocumentVersion
  } = useWorkspaceStore();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
  const [versionOpen, setVersionOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [showPresence, setShowPresence] = useState(true);
  const [remoteConflict, setRemoteConflict] = useState(false);

  const editorRef = useRef<HTMLTextAreaElement>(null);
  const autosaveTimer = useRef<ReturnType<typeof setTimeout>>();
  const versionTimer = useRef<ReturnType<typeof setInterval>>();
  const localVersion = useRef(0);
  const isReceivingRemote = useRef(false);

  // Load document
  useEffect(() => {
    if (!id) return;
    api.get(`/documents/${id}`)
      .then(({ data }) => {
        setCurrentDocument(data);
        setTitle(data.title);
        setContent(data.content || '');
        setLoading(false);
      })
      .catch(() => {
        toast({ title: 'Document not found', variant: 'destructive' });
        navigate(-1);
      });

    return () => {
      clearTimeout(autosaveTimer.current);
      clearInterval(versionTimer.current);
      setCurrentDocument(null);
    };
  }, [id]);

  // Socket setup
  useEffect(() => {
    if (!currentDocument || !id) return;
    const socket = getSocket();
    if (!socket) return;

    const workspaceId = currentDocument.workspaceId;
    socket.emit('workspace:join', workspaceId);

    socket.on('presence:update', (users: ActiveUser[]) => setActiveUsers(users));
    socket.on('user:leave', ({ user: u }: { user: ActiveUser }) => removeCursor(u.id));
    socket.on('cursor:update', (data: CursorUpdate) => updateCursor(data));

    socket.on('document:update', (data: DocumentUpdate) => {
      if (data.documentId !== id || data.userId === user?.id) return;
      isReceivingRemote.current = true;
      setContent(data.content);
      setDocumentVersion(data.version);
      localVersion.current = data.version;
      setSaveStatus('saved');
      isReceivingRemote.current = false;
    });

    socket.on('document:conflict', (data: { documentId: string; serverContent: string; serverVersion: number }) => {
      if (data.documentId !== id) return;
      setRemoteConflict(true);
      // Auto-resolve: accept server version
      setContent(data.serverContent);
      localVersion.current = data.serverVersion;
      toast({ title: 'Conflict resolved', description: 'Document synced with latest version' });
    });

    // Start version auto-save timer
    versionTimer.current = setInterval(() => {
      socket.emit('version:create', { documentId: id, workspaceId });
    }, VERSION_INTERVAL);

    return () => {
      socket.emit('workspace:leave', workspaceId);
      socket.off('presence:update');
      socket.off('user:leave');
      socket.off('cursor:update');
      socket.off('document:update');
      socket.off('document:conflict');
      clearInterval(versionTimer.current);
      setActiveUsers([]);
    };
  }, [currentDocument, id]);

  // Mouse move for cursor sharing
  useEffect(() => {
    if (!currentDocument) return;
    const socket = getSocket();
    if (!socket) return;

    const throttle = { last: 0 };
    const handler = (e: MouseEvent) => {
      const now = Date.now();
      if (now - throttle.last < 50) return; // 20fps
      throttle.last = now;
      socket.emit('cursor:move', {
        workspaceId: currentDocument.workspaceId,
        documentId: id,
        x: e.clientX,
        y: e.clientY,
      });
    };

    window.addEventListener('mousemove', handler);
    return () => window.removeEventListener('mousemove', handler);
  }, [currentDocument, id]);

  // Content change handler with debounced autosave + socket broadcast
  const handleContentChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (isReceivingRemote.current) return;
    const newContent = e.target.value;
    setContent(newContent);
    setSaveStatus('unsaved');
    setRemoteConflict(false);

    clearTimeout(autosaveTimer.current);
    autosaveTimer.current = setTimeout(async () => {
      setSaveStatus('saving');
      try {
        const socket = getSocket();
        const newVersion = localVersion.current + 1;
        localVersion.current = newVersion;

        // Broadcast via socket
        if (socket && currentDocument) {
          socket.emit('document:operation', {
            documentId: id,
            workspaceId: currentDocument.workspaceId,
            operation: { type: 'replace', position: 0, content: newContent },
            version: newVersion,
            content: newContent,
          });
        }

        // Also persist via REST
        const { data } = await api.patch(`/documents/${id}`, { content: newContent });
        updateDocument(data);
        setSaveStatus('saved');
      } catch {
        setSaveStatus('unsaved');
      }
    }, AUTOSAVE_DELAY);
  }, [id, currentDocument]);

  // Title save
  const handleTitleBlur = async () => {
    if (!title.trim() || title === currentDocument?.title) return;
    try {
      const { data } = await api.patch(`/documents/${id}`, { title: title.trim() });
      updateDocument(data);
      toast({ title: 'Title saved' });
    } catch {
      toast({ title: 'Failed to save title', variant: 'destructive' });
    }
  };

  // Manual save
  const handleManualSave = async () => {
    setSaving(true);
    try {
      const { data } = await api.patch(`/documents/${id}`, { content, title });
      updateDocument(data);
      await api.post(`/documents/${id}/versions`);
      setSaveStatus('saved');
      toast({ title: 'Saved and version created' });
    } catch {
      toast({ title: 'Save failed', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

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
      <div className="flex h-[calc(100vh-56px)] flex-col overflow-hidden">
        {/* Editor toolbar */}
        <div className="flex items-center justify-between gap-2 border-b bg-background px-4 py-2 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" asChild>
              <Link to={currentDocument ? `/workspace/${currentDocument.workspaceId}` : '/dashboard'}>
                <ChevronLeft className="h-4 w-4" />
              </Link>
            </Button>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={handleTitleBlur}
              className="h-8 border-none bg-transparent text-base font-semibold shadow-none focus-visible:ring-0 px-0 max-w-xs"
              placeholder="Untitled"
            />
            {/* Save status */}
            <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
              {saveStatus === 'saving' && (
                <><Loader2 className="h-3 w-3 animate-spin" /> Saving…</>
              )}
              {saveStatus === 'saved' && (
                <><CheckCircle2 className="h-3 w-3 text-green-500" /> Saved</>
              )}
              {saveStatus === 'unsaved' && (
                <><AlertCircle className="h-3 w-3 text-yellow-500" /> Unsaved</>
              )}
            </div>
            {remoteConflict && (
              <Badge variant="secondary" className="text-[10px] h-5">Synced</Badge>
            )}
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              title="Toggle presence panel"
              onClick={() => setShowPresence(!showPresence)}
            >
              {showPresence ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" title="Version history" onClick={() => setVersionOpen(true)}>
              <Clock className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" title="Export" onClick={() => setExportOpen(true)}>
              <Download className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={handleManualSave} disabled={saving}>
              {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
              Save
            </Button>
          </div>
        </div>

        {/* Editor area */}
        <div className="flex flex-1 overflow-hidden">
          <div className="flex-1 overflow-auto">
            <div className="mx-auto max-w-3xl px-8 py-10 min-h-full">
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="min-h-[calc(100vh-200px)]"
              >
                <textarea
                  ref={editorRef}
                  value={content}
                  onChange={handleContentChange}
                  placeholder="Start writing..."
                  className="document-editor w-full min-h-[calc(100vh-200px)] resize-none bg-transparent outline-none text-base leading-relaxed"
                  spellCheck
                />
              </motion.div>
            </div>
          </div>

          {/* Presence sidebar */}
          {showPresence && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 200, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              className="border-l bg-background overflow-hidden shrink-0 hidden lg:block"
            >
              <div className="p-3 border-b">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                  <Users className="h-3 w-3" /> Collaborators
                </p>
              </div>
              <div className="p-2">
                <UserPresencePanel />
              </div>
            </motion.div>
          )}
        </div>
      </div>

      <VersionHistoryDrawer
        documentId={id!}
        open={versionOpen}
        onClose={() => setVersionOpen(false)}
      />
      <ExportModal
        documentId={id!}
        documentTitle={title}
        open={exportOpen}
        onClose={() => setExportOpen(false)}
      />
    </>
  );
}
