import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Clock, RotateCcw, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Version } from '@/types';
import api from '@/lib/api';
import { useWorkspaceStore } from '@/store/workspace';
import { formatDateTime } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';

interface VersionHistoryProps {
  documentId: string;
  open: boolean;
  onClose: () => void;
}

export function VersionHistoryDrawer({ documentId, open, onClose }: VersionHistoryProps) {
  const [versions, setVersions] = useState<Version[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<Version | null>(null);
  const { updateDocument } = useWorkspaceStore();

  useEffect(() => {
    if (open && documentId) {
      setLoading(true);
      api.get(`/documents/${documentId}/versions`)
        .then(({ data }) => setVersions(data))
        .catch(() => toast({ title: 'Failed to load versions', variant: 'destructive' }))
        .finally(() => setLoading(false));
    }
  }, [open, documentId]);

  const handleRestore = async (version: Version) => {
    try {
      const { data } = await api.post(`/documents/${documentId}/versions/${version.id}/restore`);
      updateDocument(data);
      toast({ title: 'Version restored', variant: 'default' });
      onClose();
    } catch {
      toast({ title: 'Failed to restore version', variant: 'destructive' });
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/30"
            onClick={onClose}
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed right-0 top-0 z-50 h-full w-80 bg-background border-l shadow-xl flex flex-col"
          >
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <h2 className="font-semibold text-sm">Version History</h2>
              </div>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <ScrollArea className="flex-1">
              {loading ? (
                <div className="p-4 space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-16 rounded-md gradient-shimmer" />
                  ))}
                </div>
              ) : versions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                  <Clock className="h-8 w-8 text-muted-foreground/40 mb-2" />
                  <p className="text-sm text-muted-foreground">No saved versions yet</p>
                  <p className="text-xs text-muted-foreground mt-1">Versions are saved automatically</p>
                </div>
              ) : (
                <div className="p-3 space-y-1.5">
                  {versions.map((version, idx) => (
                    <div
                      key={version.id}
                      className={`group rounded-md border p-3 cursor-pointer hover:bg-muted/50 transition-colors ${selectedVersion?.id === version.id ? 'bg-muted border-primary/30' : ''}`}
                      onClick={() => setSelectedVersion(selectedVersion?.id === version.id ? null : version)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-medium">
                            {idx === 0 ? 'Latest snapshot' : `Version ${versions.length - idx}`}
                          </p>
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            {formatDateTime(version.createdAt)}
                          </p>
                        </div>
                        <ChevronRight className={`h-3 w-3 text-muted-foreground transition-transform ${selectedVersion?.id === version.id ? 'rotate-90' : ''}`} />
                      </div>

                      {selectedVersion?.id === version.id && (
                        <div className="mt-3 space-y-2">
                          <div className="rounded-sm bg-muted p-2 max-h-24 overflow-auto">
                            <p className="text-[11px] text-muted-foreground font-mono leading-relaxed line-clamp-4">
                              {version.contentSnapshot || '(empty)'}
                            </p>
                          </div>
                          <Button
                            size="sm"
                            className="w-full h-7 text-xs gap-1"
                            onClick={(e) => { e.stopPropagation(); handleRestore(version); }}
                          >
                            <RotateCcw className="h-3 w-3" />
                            Restore this version
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
