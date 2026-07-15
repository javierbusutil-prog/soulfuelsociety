import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { buildIntakeSummary } from '@/lib/intakeSummary';
import { IntakeFormMessage } from '@/components/chat/IntakeFormMessage';

interface IntakeRow {
  id: string;
  responses: any;
  submitted_at: string;
}

export function IntakeFormViewer({ memberId }: { memberId: string }) {
  const [rows, setRows] = useState<IntakeRow[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('intake_forms')
        .select('id, responses, submitted_at')
        .eq('user_id', memberId)
        .order('submitted_at', { ascending: false });
      if (cancelled) return;
      if (error) {
        toast.error('Failed to load intake form');
        setRows([]);
      } else {
        setRows((data ?? []) as IntakeRow[]);
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [memberId]);

  if (loading) {
    return (
      <div className="flex justify-center py-6">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!rows || rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-2">No intake form submitted yet.</p>
    );
  }

  return (
    <div className="space-y-4">
      {rows.map((row, i) => {
        const data = buildIntakeSummary(row.responses, memberId, row.submitted_at);
        return (
          <div key={row.id} className="space-y-2">
            <p className="text-xs text-muted-foreground">
              {i === 0 ? 'Most recent submission' : 'Earlier submission'} · {data.submittedDate}
            </p>
            <IntakeFormMessage data={data} />
          </div>
        );
      })}
    </div>
  );
}