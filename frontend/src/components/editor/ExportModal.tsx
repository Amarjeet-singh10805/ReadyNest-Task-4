import { useState } from 'react';
import { Download, FileJson, FileText, File } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import api from '@/lib/api';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface ExportModalProps {
  documentId: string;
  documentTitle: string;
  open: boolean;
  onClose: () => void;
}

const formats = [
  { id: 'json', label: 'JSON', description: 'Structured data format', icon: FileJson, ext: '.json' },
  { id: 'markdown', label: 'Markdown', description: 'Plain text with formatting', icon: FileText, ext: '.md' },
  { id: 'pdf', label: 'PDF', description: 'Print-ready document', icon: File, ext: '.pdf' },
];

export function ExportModal({ documentId, documentTitle, open, onClose }: ExportModalProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const [selected, setSelected] = useState('markdown');

  const handleExport = async () => {
    setLoading(selected);
    try {
      const fmt = formats.find((f) => f.id === selected)!;
      const response = await api.get(`/documents/${documentId}/export/${selected}`, {
        responseType: selected === 'json' ? 'json' : 'text',
      });

      const content = selected === 'json' ? JSON.stringify(response.data, null, 2) : response.data;
      const blob = new Blob([content], { type: selected === 'json' ? 'application/json' : 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${documentTitle}${fmt.ext}`;
      a.click();
      URL.revokeObjectURL(url);

      toast({ title: `Exported as ${fmt.label}` });
      onClose();
    } catch {
      toast({ title: 'Export failed', variant: 'destructive' });
    } finally {
      setLoading(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-4 w-4" /> Export Document
          </DialogTitle>
          <DialogDescription>Choose a format to export "{documentTitle}"</DialogDescription>
        </DialogHeader>

        <div className="space-y-2 my-2">
          {formats.map((fmt) => (
            <button
              key={fmt.id}
              onClick={() => setSelected(fmt.id)}
              className={cn(
                'w-full flex items-center gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-muted',
                selected === fmt.id ? 'border-primary bg-primary/5' : 'border-border'
              )}
            >
              <fmt.icon className={cn('h-5 w-5 shrink-0', selected === fmt.id ? 'text-primary' : 'text-muted-foreground')} />
              <div>
                <p className="text-sm font-medium">{fmt.label}</p>
                <p className="text-xs text-muted-foreground">{fmt.description}</p>
              </div>
            </button>
          ))}
        </div>

        <div className="flex gap-2 mt-2">
          <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button className="flex-1 gap-2" onClick={handleExport} disabled={!!loading}>
            {loading ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            Export
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
