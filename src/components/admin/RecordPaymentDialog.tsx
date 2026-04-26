import { useState, useEffect } from 'react';
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

interface RecordPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  memberId: string;
  memberName: string;
  coachId: string;
  onSuccess?: () => void;
}

export function RecordPaymentDialog({
  open,
  onOpenChange,
  memberId,
  memberName,
  coachId,
  onSuccess,
}: RecordPaymentDialogProps) {
  const [amount, setAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState<Date>(new Date());
  const [paymentMethod, setPaymentMethod] = useState('Zelle');
  const [description, setDescription] = useState('');
  const [sessionsRemaining, setSessionsRemaining] = useState('');
  const [expiryDate, setExpiryDate] = useState<Date | undefined>(undefined);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setAmount('');
      setPaymentDate(new Date());
      setPaymentMethod('Zelle');
      setDescription('');
      setSessionsRemaining('');
      setExpiryDate(undefined);
      setNotes('');
    }
  }, [open]);

  const handleSave = async () => {
    const numAmount = parseFloat(amount);
    if (!amount || isNaN(numAmount) || numAmount <= 0) {
      toast.error('Please enter a valid amount.');
      return;
    }
    if (!description.trim()) {
      toast.error('Please enter a description.');
      return;
    }

    setSubmitting(true);

    const { error: payErr } = await supabase.from('manual_payments').insert({
      user_id: memberId,
      amount: numAmount,
      payment_date: format(paymentDate, 'yyyy-MM-dd'),
      payment_method: paymentMethod,
      description: description.trim(),
      notes: notes.trim() || null,
      recorded_by: coachId,
    } as any);

    if (payErr) {
      console.error('Manual payment insert error:', payErr);
      toast.error('Failed to record payment.');
      setSubmitting(false);
      return;
    }

    // Optional profile updates
    const profileUpdates: Record<string, any> = {};
    if (sessionsRemaining.trim() !== '') {
      const n = parseInt(sessionsRemaining, 10);
      if (!isNaN(n) && n >= 0) profileUpdates.sessions_remaining = n;
    }
    if (expiryDate) {
      profileUpdates.membership_expires_at = expiryDate.toISOString();
    }

    if (Object.keys(profileUpdates).length > 0) {
      const { error: profErr } = await supabase
        .from('profiles')
        .update(profileUpdates as any)
        .eq('id', memberId);
      if (profErr) {
        console.error('Profile update error:', profErr);
        toast.error('Payment saved but profile update failed.');
        setSubmitting(false);
        onOpenChange(false);
        onSuccess?.();
        return;
      }
    }

    toast.success('Payment recorded.');
    setSubmitting(false);
    onOpenChange(false);
    onSuccess?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Record Payment</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Member</Label>
            <Input value={memberName || 'Unnamed'} readOnly className="bg-muted" />
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
            <Label>Payment date</Label>
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
            <Label>Payment method</Label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Zelle">Zelle</SelectItem>
                <SelectItem value="Cash">Cash</SelectItem>
                <SelectItem value="Venmo">Venmo</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Description *</Label>
            <Input
              placeholder="8 sessions April"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Set sessions remaining (leave blank to skip)</Label>
            <Input
              type="number"
              min="0"
              step="1"
              placeholder="e.g. 8"
              value={sessionsRemaining}
              onChange={(e) => setSessionsRemaining(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Set membership expiry (leave blank to skip)</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn('w-full justify-start text-left font-normal', !expiryDate && 'text-muted-foreground')}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {expiryDate ? format(expiryDate, 'PPP') : 'Pick a date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={expiryDate}
                  onSelect={setExpiryDate}
                  initialFocus
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
            {expiryDate && (
              <button
                type="button"
                onClick={() => setExpiryDate(undefined)}
                className="text-[11px] text-muted-foreground underline"
              >
                Clear expiry
              </button>
            )}
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
          <Button onClick={handleSave} disabled={submitting}>
            {submitting ? 'Saving...' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
