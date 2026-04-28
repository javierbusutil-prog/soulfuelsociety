import { useEffect, useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle2, Activity } from 'lucide-react';

const DURATION_OPTIONS = [
  'Less than 1 week',
  '1-4 weeks',
  '1-3 months',
  '3-6 months',
  '6+ months',
];

const ACTIVE_STATUSES = ['pending', 'consult_scheduled', 'evaluation_booked', 'active_patient'];

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending Review',
  consult_scheduled: 'Consult Scheduled',
  evaluation_booked: 'Evaluation Booked',
  active_patient: 'Active Patient',
  discharged: 'Discharged',
};

export default function PTRequest() {
  const { user, profile } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [existingRequest, setExistingRequest] = useState<{ status: string } | null>(null);

  const [form, setForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    date_of_birth: '',
    chief_complaint: '',
    symptom_duration: '',
    pain_scale: '',
    goals: '',
    preferred_contact: 'call',
    best_time: 'morning',
  });

  useEffect(() => {
    if (!user) return;
    setForm((f) => ({
      ...f,
      full_name: profile?.full_name || f.full_name,
      email: user.email || f.email,
    }));

    (async () => {
      const { data } = await supabase
        .from('pt_requests')
        .select('status')
        .eq('user_id', user.id)
        .in('status', ACTIVE_STATUSES)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data) setExistingRequest(data as { status: string });
      setLoading(false);
    })();
  }, [user, profile]);

  const update = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const required = ['full_name', 'email', 'phone', 'date_of_birth', 'chief_complaint', 'symptom_duration', 'pain_scale', 'goals'];
    for (const k of required) {
      if (!form[k as keyof typeof form]) {
        toast({ title: 'Missing field', description: `Please fill in all required fields.`, variant: 'destructive' });
        return;
      }
    }

    setSubmitting(true);
    const payload = {
      user_id: user.id,
      full_name: form.full_name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      date_of_birth: form.date_of_birth,
      chief_complaint: form.chief_complaint.trim(),
      symptom_duration: form.symptom_duration,
      pain_scale: parseInt(form.pain_scale, 10),
      goals: form.goals.trim(),
      preferred_contact: form.preferred_contact,
      best_time: form.best_time,
    };

    const { error } = await supabase.from('pt_requests').insert(payload);
    if (error) {
      console.error(error);
      toast({ title: 'Could not submit request', description: error.message, variant: 'destructive' });
      setSubmitting(false);
      return;
    }

    // Fire and forget email notification
    supabase.functions.invoke('notify-pt-request', { body: payload }).catch((err) => {
      console.error('notify-pt-request failed', err);
    });

    setSubmitted(true);
    setSubmitting(false);
  };

  return (
    <AppLayout title="Physical Therapy">
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="mb-6 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Activity className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="font-display text-2xl tracking-editorial">Physical Therapy Request</h1>
            <p className="text-sm text-muted-foreground">Free 15-minute phone consultation</p>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : submitted ? (
          <Card>
            <CardContent className="pt-8 pb-8 text-center space-y-3">
              <CheckCircle2 className="w-12 h-12 text-primary mx-auto" />
              <h2 className="font-display text-xl">Request received!</h2>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                We'll be in touch within 24 hours to schedule your free consultation.
              </p>
            </CardContent>
          </Card>
        ) : existingRequest ? (
          <Card>
            <CardContent className="pt-8 pb-8 text-center space-y-3">
              <Activity className="w-10 h-10 text-primary mx-auto" />
              <h2 className="font-display text-xl">You already have an active PT request</h2>
              <p className="text-sm text-muted-foreground">We'll be in touch soon.</p>
              <Badge variant="secondary" className="mt-2">
                Status: {STATUS_LABELS[existingRequest.status] || existingRequest.status}
              </Badge>
            </CardContent>
          </Card>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="full_name">Full Name</Label>
              <Input id="full_name" value={form.full_name} onChange={(e) => update('full_name', e.target.value)} required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={form.email} onChange={(e) => update('email', e.target.value)} required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input id="phone" type="tel" value={form.phone} onChange={(e) => update('phone', e.target.value)} required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="dob">Date of Birth</Label>
              <Input id="dob" type="date" value={form.date_of_birth} onChange={(e) => update('date_of_birth', e.target.value)} required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="chief_complaint">Chief Complaint</Label>
              <Textarea
                id="chief_complaint"
                rows={4}
                placeholder="What is bothering you? Describe your pain or limitation."
                value={form.chief_complaint}
                onChange={(e) => update('chief_complaint', e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>How long have you had this issue?</Label>
              <Select value={form.symptom_duration} onValueChange={(v) => update('symptom_duration', v)}>
                <SelectTrigger><SelectValue placeholder="Select duration" /></SelectTrigger>
                <SelectContent>
                  {DURATION_OPTIONS.map((d) => (
                    <SelectItem key={d} value={d}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Rate your pain (1 = minimal, 10 = worst imaginable)</Label>
              <Select value={form.pain_scale} onValueChange={(v) => update('pain_scale', v)}>
                <SelectTrigger><SelectValue placeholder="Select pain level" /></SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                    <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="goals">Goals</Label>
              <Textarea
                id="goals"
                rows={3}
                placeholder="What do you want to be able to do that you currently can't?"
                value={form.goals}
                onChange={(e) => update('goals', e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Preferred contact method</Label>
              <RadioGroup value={form.preferred_contact} onValueChange={(v) => update('preferred_contact', v)} className="flex gap-6">
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="call" id="contact-call" />
                  <Label htmlFor="contact-call" className="font-normal cursor-pointer">Call</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="text" id="contact-text" />
                  <Label htmlFor="contact-text" className="font-normal cursor-pointer">Text</Label>
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label>Best time to reach you</Label>
              <RadioGroup value={form.best_time} onValueChange={(v) => update('best_time', v)} className="flex gap-6 flex-wrap">
                {(['morning', 'afternoon', 'evening'] as const).map((t) => (
                  <div key={t} className="flex items-center gap-2">
                    <RadioGroupItem value={t} id={`time-${t}`} />
                    <Label htmlFor={`time-${t}`} className="font-normal cursor-pointer capitalize">{t}</Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed pt-2">
              By submitting this form you are requesting a free 15-minute phone consultation.
              This is not a substitute for medical advice. Soul Fuel Society, LLC.
            </p>

            <Button type="submit" disabled={submitting} className="w-full">
              {submitting ? 'Submitting…' : 'Request Free Consultation'}
            </Button>
          </form>
        )}
      </div>
    </AppLayout>
  );
}