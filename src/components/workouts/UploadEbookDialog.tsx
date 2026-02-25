import { useState, useRef } from 'react';
import { Upload, FileText, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { WorkoutProgram } from '@/types/workoutPrograms';

interface UploadEbookDialogProps {
  onProgramCreated: (program: Partial<WorkoutProgram>) => Promise<WorkoutProgram>;
}

export function UploadEbookDialog({ onProgramCreated }: UploadEbookDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    const maxSize = 50 * 1024 * 1024; // 50MB
    if (selected.size > maxSize) {
      toast({ title: 'File too large (max 50MB)', variant: 'destructive' });
      return;
    }

    setFile(selected);
    if (!title) {
      setTitle(selected.name.replace(/\.[^/.]+$/, ''));
    }
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast({ title: 'Title required', variant: 'destructive' });
      return;
    }
    if (!file) {
      toast({ title: 'Please select a file', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      // Upload file
      const ext = file.name.split('.').pop();
      const filePath = `${crypto.randomUUID()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('program-ebooks')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('program-ebooks')
        .getPublicUrl(filePath);

      // Create program with ebook URL
      await onProgramCreated({
        title: title.trim(),
        description: description.trim() || null,
        ebook_url: urlData.publicUrl,
        weeks: 1,
        frequency_per_week: 1,
        schedule_mode: 'admin_selected',
        admin_days_of_week: null,
        published: false,
      });

      toast({ title: 'E-book program uploaded!' });
      setOpen(false);
      resetForm();
    } catch (error) {
      console.error(error);
      toast({ title: 'Failed to upload', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setFile(null);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Upload className="w-4 h-4 mr-2" />
          Upload E-Book
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Upload E-Book Program</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="ebook-title">Program Name</Label>
            <Input
              id="ebook-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., 8-Week Strength Guide"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ebook-desc">Description</Label>
            <Textarea
              id="ebook-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>E-Book File</Label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.epub,.doc,.docx"
              onChange={handleFileChange}
              className="hidden"
            />
            {file ? (
              <div className="flex items-center gap-3 p-3 bg-secondary rounded-lg">
                <FileText className="w-5 h-5 text-primary shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(file.size / (1024 * 1024)).toFixed(1)} MB
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0"
                  onClick={() => setFile(null)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary/50 transition-colors"
              >
                <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Click to select PDF, EPUB, or DOC
                </p>
                <p className="text-xs text-muted-foreground mt-1">Max 50MB</p>
              </button>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? 'Uploading...' : 'Upload'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
