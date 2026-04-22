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
import { format, addDays } from 'date-fns';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface CashPaymentRecord {
  id: string;
  user_id: string;
  amount: number;
  payment_date: string;
  payment_method: string;
  note: string | null;
  upgraded_by: string;
  expires_at: string | null;
  created_at: string;
}

interface UpgradeToPaidDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  memberId: string;
  memberName: string;
  coachId: string;
  onSuccess: () => void;
  editPayment?: CashPaymentRecord | null;
}

export function UpgradeToPaidDialog({ open, onOpenChange, memberId, memberName, coachId, onSuccess, editPayment }: UpgradeToPaidDialogProps) {
  const [amount, setAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState<Date>(new Date());
  const [expirationDate, setExpirationDate] = useState<Date>(addDays(new Date(), 30));
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const isEditMode = !!editPayment;

  useEffect(() => {
    if (editPayment) {
      setAmount(String(editPayment.amount));
      setPaymentDate(new Date(editPayment.payment_date));
      setExpirationDate(editPayment.expires_at ? new Date(editPayment.expires_at) : addDays(new Date(editPayment.payment_date), 30));
      setPaymentMethod(editPayment.payment_method);
      setNote(editPayment.note || '');
    } else {
      setAmount('');
      setPaymentDate(new Date());
      setExpirationDate(addDays(new Date(), 30));
      setPaymentMethod('cash');
      setNote('');
    }
  }, [editPayment, open]);

  // Auto-update expiration when payment date changes (only in create mode)
  useEffect(() => {
    if (!isEditMode) {
      setExpirationDate(addDays(paymentDate, 30));
    }
  }, [paymentDate, isEditMode]);

  const handleConfirm = async () => {
    const numAmount = parseFloat(amount);
    if (!amount || isNaN(numAmount) || numAmount <= 0) {
      toast.error('Please enter a valid amount.');
      return;
    }

    setSubmitting(true);

    if (isEditMode && editPayment) {
      // Edit mode: update existing payment
      const { error: paymentErr } = await supabase
        .from('cash_payments')
        .update({
          amount: numAmount,
          payment_date: format(paymentDate, 'yyyy-MM-dd'),
          payment_method: paymentMethod,
          note: note.trim() || null,
          expires_at: expirationDate.toISOString(),
        } as any)
        .eq('id', editPayment.id);

      if (paymentErr) {
        toast.error('Failed to update payment.');
        setSubmitting(false);
        return;
      }

      // Update membership_expires_at on profile
      const { error: profileErr } = await supabase
        .from('profiles')
        .update({ membership_expires_at: expirationDate.toISOString() } as any)
        .eq('id', memberId);

      if (profileErr) {
        console.error('Profile expiration update error:', profileErr);
      }

      toast.success('Payment updated successfully.');
    } else {
      // Create mode: upgrade member
      const { error: profileErr } = await supabase
        .from('profiles')
        .update({
          selected_plan: 'online',
          subscription_status: 'active',
          membership_expires_at: expirationDate.toISOString(),
          upgraded_at: new Date().toISOString(),
          intake_reminder_sent: false,
        } as any)
        .eq('id', memberId);

      if (profileErr) {
        toast.error('Failed to update member plan.');
        setSubmitting(false);
        return;
      }

      // Set user role to paid: clear any existing rows for this user, then insert 'paid'.
      // This guarantees exactly one row regardless of prior state (free, paid, or none).
      const { error: roleDeleteErr } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', memberId);

      if (roleDeleteErr) {
        console.error('Role clear error:', roleDeleteErr);
      }

      const { error: roleInsertErr } = await supabase
        .from('user_roles')
        .insert({ user_id: memberId, role: 'paid' } as any);

      if (roleInsertErr) {
        console.error('Role insert error:', roleInsertErr);
        toast.error('Member plan updated but role assignment failed. Please retry.');
        setSubmitting(false);
        return;
      }

      // Insert cash payment record
      const { error: paymentErr } = await supabase
        .from('cash_payments')
        .insert({
          user_id: memberId,
          amount: numAmount,
          payment_date: format(paymentDate, 'yyyy-MM-dd'),
          payment_method: paymentMethod,
          note: note.trim() || null,
          upgraded_by: coachId,
          expires_at: expirationDate.toISOString(),
        } as any);

      if (paymentErr) {
        console.error('Payment record error:', paymentErr);
        toast.error('Member upgraded but failed to record payment.');
      } else {
        toast.success('Member upgraded successfully.');
      }

      // Send welcome notification to the member
      await supabase.from('notifications').insert({
        user_id: memberId,
        type: 'upgrade_welcome',
        title: 'Welcome to Soul Fuel!',
        body: 'Your coach is ready for you. Tap to complete your intake form and get started.',
        reference_id: memberId,
      } as any);
    }

    setSubmitting(false);
    onOpenChange(false);
    onSuccess();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'Edit Payment' : 'Upgrade to Paid'}</DialogTitle>
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

          {/* Expiration Date */}
          <div className="space-y-1.5">
            <Label>Expiration Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn('w-full justify-start text-left font-normal', !expirationDate && 'text-muted-foreground')}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {expirationDate ? format(expirationDate, 'PPP') : 'Pick a date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={expirationDate}
                  onSelect={d => d && setExpirationDate(d)}
                  initialFocus
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
            <p className="text-[11px] text-muted-foreground">Member will automatically return to the free plan on this date.</p>
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
            {submitting ? (isEditMode ? 'Saving...' : 'Upgrading...') : (isEditMode ? 'Save Changes' : 'Confirm Upgrade')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
