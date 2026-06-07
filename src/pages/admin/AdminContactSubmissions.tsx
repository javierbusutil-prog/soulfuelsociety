import { useEffect, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Mail, CheckCircle2, XCircle } from 'lucide-react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface ContactSubmission {
  id: string;
  name: string;
  email: string;
  message: string;
  submitted_at: string;
  responded: boolean;
}

export default function AdminContactSubmissions() {
  const [submissions, setSubmissions] = useState<ContactSubmission[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSubmissions = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('contact_submissions' as any)
      .select('id, name, email, message, submitted_at, responded')
      .order('responded', { ascending: true })
      .order('submitted_at', { ascending: false });
    if (error) {
      toast.error('Failed to load contact submissions');
      console.error(error);
    } else {
      setSubmissions((data || []) as unknown as ContactSubmission[]);
    }
    setLoading(false);
  };

  useEffect(() => { fetchSubmissions(); }, []);

  const toggleResponded = async (submission: ContactSubmission) => {
    const newValue = !submission.responded;
    const { error } = await supabase
      .from('contact_submissions' as any)
      .update({ responded: newValue })
      .eq('id', submission.id);
    if (error) {
      toast.error('Failed to update: ' + error.message);
    } else {
      toast.success(newValue ? 'Marked as responded' : 'Marked as unresponded');
      setSubmissions(prev => prev.map(s => s.id === submission.id ? { ...s, responded: newValue } : s));
    }
  };

  const unrespondedCount = submissions.filter(s => !s.responded).length;

  return (
    <AdminLayout title="Contact Submissions">
      <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">
              {unrespondedCount > 0 ? `${unrespondedCount} awaiting response` : 'All caught up'}
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : submissions.length === 0 ? (
          <Card>
            <CardContent className="p-10 text-center">
              <p className="text-sm text-muted-foreground">No contact submissions yet.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {submissions.map(s => (
              <Card
                key={s.id}
                className={cn(
                  s.responded ? 'bg-muted/30 opacity-80' : 'bg-card border-l-4 border-l-primary'
                )}
              >
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold">{s.name}</p>
                        <span className="text-xs text-muted-foreground">{s.email}</span>
                        {!s.responded ? (
                          <Badge className="text-[10px] bg-primary/15 text-primary hover:bg-primary/15 border-transparent gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                            New
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-[10px]">Responded</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(s.submitted_at), { addSuffix: true })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button size="sm" variant="outline" asChild>
                        <a
                          href={`mailto:${s.email}?subject=Re: Soul Fuel Society inquiry`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Mail className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline ml-1.5">Reply</span>
                        </a>
                      </Button>
                      <Button
                        size="sm"
                        variant={s.responded ? 'secondary' : 'default'}
                        onClick={() => toggleResponded(s)}
                      >
                        {s.responded ? (
                          <>
                            <XCircle className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline ml-1.5">Mark unresponded</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline ml-1.5">Mark responded</span>
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{s.message}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
