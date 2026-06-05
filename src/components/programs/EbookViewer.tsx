import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Eye, Download } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface EbookViewerProps {
  program: {
    id: string;
    title: string;
    description: string | null;
    ebook_url: string | null;
  };
  onBack: () => void;
}

export function EbookViewer({ program, onBack }: EbookViewerProps) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);

  useEffect(() => {
    async function generateSignedUrl() {
      if (!program?.ebook_url) {
        setSignedUrl(null);
        return;
      }
      const match = program.ebook_url.match(/\/program-ebooks\/(.+)$/);
      if (!match) {
        setSignedUrl(null);
        return;
      }
      const path = match[1];
      const { data, error } = await supabase.storage
        .from('program-ebooks')
        .createSignedUrl(path, 900);
      if (error) {
        setSignedUrl(null);
        return;
      }
      setSignedUrl(data?.signedUrl ?? null);
    }
    generateSignedUrl();
  }, [program?.ebook_url]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <h1 className="font-display text-xl">{program.title}</h1>
        </div>
      </div>

      {program.description && (
        <p className="text-sm text-muted-foreground">{program.description}</p>
      )}

      <Card className="p-6 text-center">
        {signedUrl ? (
          <div className="flex flex-col gap-3">
            <Button asChild>
              <a href={signedUrl} target="_blank" rel="noopener noreferrer">
                <Eye className="w-4 h-4 mr-2" />
                View E-Book
              </a>
            </Button>
            <Button variant="outline" asChild>
              <a href={signedUrl} download>
                <Download className="w-4 h-4 mr-2" />
                Download
              </a>
            </Button>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            E-book not available — contact your coach.
          </p>
        )}
      </Card>
    </div>
  );
}
