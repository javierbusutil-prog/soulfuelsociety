import { useState } from 'react';
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

interface UpgradeToPaidDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  memberId: string;
  memberName: string;
  coachId: string;
  onSuccess: () => void;
}

export function UpgradeToPaidDialog({ open, onOpenChange, memberId, memberName, coachId, onSuccess }: UpgradeToPaidDialogProps) {
  const [amount, setAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState<Date>(new Date());
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleConfirm = async () => {
    const numAmount = parseFloat(amount);
    if (!amount || isNaN(numAmount) || numAmount <= 0) {
      toast.error('Please enter a valid amount.');
      return;
    }

    setSubmitting(true);

    // Update profile to paid
    const { error: profileErr } = await supabase
      .from('profiles')
      .update({ selected_plan: 'online', subscription_status: 'active' } as any)
      .eq('id', memberId);

    if (profileErr) {
      toast.error('Failed to update member plan.');
      setSubmitting(false);
      return;
    }

    // Update user role to paid
    const { error: roleErr } = await supabase
      .from('user_roles')
      .update({ role: 'paid' } as any)
      .eq('user_id', memberId);

    if (roleErr) {
      console.error('Role update error:', roleErr);
    }

    // Insert cash payment record
    const { error: paymentErr } = await supabase
      .from('cash_payments' as any)
      .insert({
        user_id: memberId,
        amount: numAmount,
        payment_date: format(paymentDate, 'yyyy-MM-dd'),
        payment_method: paymentMethod,
        note: note.trim() || null,
        upgraded_by: coachId,
      });

    if (paymentErr) {
      console.error('Payment record error:', paymentErr);
      toast.error('Member upgraded but failed to record payment.');
    } else {
      toast.success('Member upgraded successfully.');
    }

    // Reset form
    setAmount('');
    setPaymentDate(new Date());
    setPaymentMethod('cash');
    setNote('');
    setSubmitting(false);
    onOpenChange(false);
    onSuccess();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Upgrade to Paid</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Member (read-only) */}
          <div className="space-y-1.5">
            <Label>Member</Label>
            <Input value={memberName || 'Unnamed'} readOnly className="bg-muted" />
          </div>

          {/* Amount */}
          <div className="space-y-1.5">
            <Label>Amount Paid (USD) *</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={amount}
              onChange={e => setAmount(e.target.value)}
            />
          </div>

          {/* Payment Date */}
          <div className="space-y-1.5">
            <Label>Payment Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn('w-full justify-start text-left font-normal', !paymentDate && 'text-muted-foreground')}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {paymentDate ? format(paymentDate, 'PPP') : 'Pick a date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={paymentDate}
                  onSelect={d => d && setPaymentDate(d)}
                  initialFocus
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Payment Method */}
          <div className="space-y-1.5">
            <Label>Payment Method</Label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Note */}
          <div className="space-y-1.5">
            <Label>Note (optional)</Label>
            <Textarea
              placeholder="Any additional notes..."
              value={note}
              onChange={e => setNote(e.target.value)}
              className="min-h-[60px]"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={submitting}>
            {submitting ? 'Upgrading...' : 'Confirm Upgrade'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
