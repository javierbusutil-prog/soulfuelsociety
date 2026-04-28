import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { ChevronDown, ChevronUp, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';

type PTRequest = {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone: string;
  date_of_birth: string;
  chief_complaint: string;
  symptom_duration: string;
  pain_scale: number;
  goals: string;
  preferred_contact: string;
  best_time: string;
  status: string;
  admin_notes: string | null;
  created_at: string;
};

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending' },
  { value: 'consult_scheduled', label: 'Consult Scheduled' },
  { value: 'evaluation_booked', label: 'Evaluation Booked' },
  { value: 'active_patient', label: 'Active Patient' },
  { value: 'discharged', label: 'Discharged' },
];

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-900 border-yellow-200',
  consult_scheduled: 'bg-blue-100 text-blue-900 border-blue-200',
  evaluation_booked: 'bg-purple-100 text-purple-900 border-purple-200',
  active_patient: 'bg-green-100 text-green-900 border-green-200',
  discharged: 'bg-gray-100 text-gray-700 border-gray-200',
};

const STATUS_LABEL = Object.fromEntries(STATUS_OPTIONS.map((s) => [s.value, s.label]));

function PainBadge({ pain }: { pain: number }) {
  const tone =
    pain >= 8 ? 'bg-red-100 text-red-900 border-red-200'
      : pain >= 5 ? 'bg-orange-100 text-orange-900 border-orange-200'
      : 'bg-emerald-100 text-emerald-900 border-emerald-200';
  return <Badge variant="outline" className={cn('border', tone)}>Pain {pain}/10</Badge>;
}

export default function AdminPTRequests() {
  const { toast } = useToast();
  const [requests, setRequests] = useState<PTRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, { status: string; admin_notes: string }>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('pt_requests')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      toast({ title: 'Failed to load PT requests', description: error.message, variant: 'destructive' });
    } else {
      setRequests((data || []) as PTRequest[]);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const toggle = (r: PTRequest) => {
    setExpanded((cur) => (cur === r.id ? null : r.id));
    setDrafts((d) => ({
      ...d,
      [r.id]: d[r.id] || { status: r.status, admin_notes: r.admin_notes || '' },
    }));
  };

  const save = async (id: string) => {
    const draft = drafts[id];
    if (!draft) return;
    setSavingId(id);
    const { error } = await supabase
      .from('pt_requests')
      .update({ status: draft.status, admin_notes: draft.admin_notes })
      .eq('id', id);
    setSavingId(null);
    if (error) {
      toast({ title: 'Save failed', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Updated' });
    setRequests((rs) => rs.map((r) => (r.id === id ? { ...r, status: draft.status, admin_notes: draft.admin_notes } : r)));
  };

  return (
    <AdminLayout title="PT Requests">
      <div className="max-w-5xl mx-auto px-4 md:px-6 py-6">
        <div className="mb-6 flex items-center gap-3">
          <Activity className="w-5 h-5 text-primary" />
          <p className="text-sm text-muted-foreground">
            Physical Therapy evaluation requests submitted by members.
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : requests.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              No PT requests yet.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {requests.map((r) => {
              const isOpen = expanded === r.id;
              const draft = drafts[r.id] || { status: r.status, admin_notes: r.admin_notes || '' };
              return (
                <Card key={r.id}>
                  <button
                    onClick={() => toggle(r)}
                    className="w-full text-left p-4 flex flex-col md:flex-row md:items-center gap-3 md:gap-4 hover:bg-muted/30 transition-colors rounded-t-lg"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium">{r.full_name}</span>
                        <span className="text-xs text-muted-foreground">{r.email}</span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1 truncate">
                        {r.chief_complaint.length > 60
                          ? r.chief_complaint.slice(0, 60) + '…'
                          : r.chief_complaint}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <PainBadge pain={r.pain_scale} />
                      <Badge variant="outline">{r.symptom_duration}</Badge>
                      <Badge variant="outline" className={cn('border', STATUS_STYLES[r.status])}>
                        {STATUS_LABEL[r.status] || r.status}
                      </Badge>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(r.created_at).toLocaleDateString()}
                      </span>
                      {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </button>

                  {isOpen && (
                    <CardContent className="border-t pt-4 space-y-4">
                      <div className="grid md:grid-cols-2 gap-4 text-sm">
                        <div><span className="text-muted-foreground">Phone:</span> {r.phone}</div>
                        <div><span className="text-muted-foreground">DOB:</span> {r.date_of_birth}</div>
                        <div><span className="text-muted-foreground">Preferred contact:</span> {r.preferred_contact}</div>
                        <div><span className="text-muted-foreground">Best time:</span> {r.best_time}</div>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Chief Complaint</Label>
                        <p className="text-sm whitespace-pre-wrap mt-1">{r.chief_complaint}</p>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Goals</Label>
                        <p className="text-sm whitespace-pre-wrap mt-1">{r.goals}</p>
                      </div>

                      <div className="border-t pt-4 space-y-3">
                        <div className="space-y-2">
                          <Label>Status</Label>
                          <Select
                            value={draft.status}
                            onValueChange={(v) =>
                              setDrafts((d) => ({ ...d, [r.id]: { ...draft, status: v } }))
                            }
                          >
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {STATUS_OPTIONS.map((s) => (
                                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Admin notes</Label>
                          <Textarea
                            rows={3}
                            value={draft.admin_notes}
                            onChange={(e) =>
                              setDrafts((d) => ({ ...d, [r.id]: { ...draft, admin_notes: e.target.value } }))
                            }
                          />
                        </div>
                        <Button onClick={() => save(r.id)} disabled={savingId === r.id}>
                          {savingId === r.id ? 'Saving…' : 'Save'}
                        </Button>
                      </div>
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}