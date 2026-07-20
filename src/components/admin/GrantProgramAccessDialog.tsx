import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ProgramOption {
  id: string;
  title: string;
  price_cents: number | null;
}

interface GrantProgramAccessDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  memberId: string;
  memberName: string;
  coachId: string;
  onSuccess: () => void;
}

export function GrantProgramAccessDialog({
  open,
  onOpenChange,
  memberId,
  memberName,
  coachId,
  onSuccess,
}: GrantProgramAccessDialogProps) {
  const [loading, setLoading] = useState(false);
  const [programs, setPrograms] = useState<ProgramOption[]>([]);
  const [selectedProgramId, setSelectedProgramId] = useState<string>('');
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'zelle' | 'venmo' | 'other'>('cash');
  const [paymentDate, setPaymentDate] = useState<Date>(new Date());
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const selectedProgram = useMemo(
    () => programs.find((p) => p.id === selectedProgramId) || null,
    [programs, selectedProgramId],
  );

  useEffect(() => {
    if (!open) return;
    setSelectedProgramId('');
    setAmount('');
    setPaymentMethod('cash');
    setPaymentDate(new Date());
    setNotes('');

    (async () => {
      setLoading(true);
      const [{ data: progs, error: progsErr }, { data: owned, error: ownedErr }] = await Promise.all([
        supabase
          .from('workout_programs')
          .select('id, title, price_cents')
          .eq('access_type', 'one_time_purchase')
          .eq('published', true)
          .order('title', { ascending: true }),
        supabase
          .from('ebook_purchases')
          .select('ebook_id')
          .eq('user_id', memberId),
      ]);
      if (progsErr || ownedErr) {
        toast.error('Failed to load programs.');
        setLoading(false);
        return;
      }
      const ownedIds = new Set((owned || []).map((o: any) => o.ebook_id));
      setPrograms(((progs || []) as ProgramOption[]).filter((p) => !ownedIds.has(p.id)));
      setLoading(false);
    })();
  }, [open, memberId]);

  useEffect(() => {
    if (selectedProgram && selectedProgram.price_cents != null) {
      setAmount((selectedProgram.price_cents / 100).toFixed(2));
    }
  }, [selectedProgram]);

  const handleSave = async () => {
    if (!selectedProgram) {
      toast.error('Please select a program.');
      return;
    }
    const numAmount = parseFloat(amount);
    if (!amount || isNaN(numAmount) || numAmount < 0) {
      toast.error('Please enter a valid amount.');
      return;
    }

    setSubmitting(true);

    const { error: purchaseErr } = await supabase.from('ebook_purchases').insert({
      user_id: memberId,
      ebook_id: selectedProgram.id,
      amount_paid: Math.round(numAmount * 100),
      stripe_payment_intent_id: null,
    } as any);

    if (purchaseErr) {
      const msg = (purchaseErr.message || '').toLowerCase();
      if (msg.includes('duplicate') || msg.includes('unique') || (purchaseErr as any).code === '23505') {
        toast.error('Member already has access to this program');
      } else {
        console.error('Grant program access error:', purchaseErr);
        toast.error('Failed to grant program access.');
      }
      setSubmitting(false);
      return;
    }

    const { error: paymentErr } = await supabase.from('cash_payments').insert({
      user_id: memberId,
      amount: numAmount,
      payment_date: format(paymentDate, 'yyyy-MM-dd'),
      payment_method: paymentMethod,
      payment_type: 'adhoc',
      description: `Program: ${selectedProgram.title}`,
      notes: notes.trim() || null,
      recorded_by: coachId,
      expires_at: null,
      sessions_purchased: null,
    } as any);

    if (paymentErr) {
      console.error('Cash payment insert error:', paymentErr);
      toast.error('Access granted, but payment record failed.');
    } else {
      toast.success('Program access granted');
    }

    setSubmitting(false);
    onOpenChange(false);
    onSuccess();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Grant Program Access</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Member</Label>
            <Input value={memberName || 'Unnamed'} readOnly className="bg-muted" />
          </div>

          <div className="space-y-1.5">
            <Label>Program *</Label>
            <Select
              value={selectedProgramId}
              onValueChange={setSelectedProgramId}
              disabled={loading || programs.length === 0}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    loading
                      ? 'Loading...'
                      : programs.length === 0
                      ? 'No programs available'
                      : 'Select a program'
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {programs.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.title}
                    {p.price_cents != null ? ` — $${(p.price_cents / 100).toFixed(2)}` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Amount *</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="pl-7"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Payment method *</Label>
            <Select value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as any)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="zelle">Zelle</SelectItem>
                <SelectItem value="venmo">Venmo</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Payment date *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn('w-full justify-start text-left font-normal', !paymentDate && 'text-muted-foreground')}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {paymentDate ? format(paymentDate, 'PPP') : 'Pick a date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={paymentDate}
                  onSelect={(d) => d && setPaymentDate(d)}
                  initialFocus
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-1.5">
            <Label>Notes (optional)</Label>
            <Textarea
              placeholder="Any additional notes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="min-h-[60px]"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={submitting || !selectedProgramId}>
            {submitting ? 'Saving...' : 'Grant access'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}