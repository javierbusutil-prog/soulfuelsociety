import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon, AlertTriangle } from 'lucide-react';
import { format, addDays } from 'date-fns';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type PaymentType = 'upgrade' | 'renewal' | 'sessions' | 'adhoc';

export interface PaymentRecord {
  id: string;
  user_id: string;
  amount: number;
  payment_date: string;
  payment_method: string;
  payment_type: PaymentType;
  description: string | null;
  notes: string | null;
  recorded_by: string;
  expires_at: string | null;
  sessions_purchased: number | null;
  created_at: string;
}

interface PaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  memberId: string;
  memberName: string;
  coachId: string;
  onSuccess: () => void;
  /** Pre-selected payment type when opening for a new payment. Defaults to 'sessions'. */
  defaultType?: PaymentType;
  /** When provided, opens in edit mode for this payment. */
  editPayment?: PaymentRecord | null;
}

const PAYMENT_TYPE_LABELS: Record<PaymentType, string> = {
  upgrade: 'Upgrade (first-time paid)',
  renewal: 'Renewal (extends membership)',
  sessions: 'Sessions (per-session payment)',
  adhoc: 'Ad-hoc (other)',
};

export function PaymentDialog({
  open,
  onOpenChange,
  memberId,
  memberName,
  coachId,
  onSuccess,
  defaultType = 'sessions',
  editPayment,
}: PaymentDialogProps) {
  const isEditMode = !!editPayment;

  const [paymentType, setPaymentType] = useState<PaymentType>(defaultType);
  const [amount, setAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState<Date>(new Date());
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'zelle' | 'venmo' | 'other'>('cash');
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [expiresAt, setExpiresAt] = useState<Date | undefined>(undefined);
  const [sessionsPurchased, setSessionsPurchased] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Reset form when dialog opens or editPayment changes
  useEffect(() => {
    if (!open) return;
    if (editPayment) {
      setPaymentType(editPayment.payment_type);
      setAmount(String(editPayment.amount));
      setPaymentDate(new Date(editPayment.payment_date));
      const method = (editPayment.payment_method || 'cash').toLowerCase();
      setPaymentMethod(
        (['cash', 'zelle', 'venmo', 'other'] as const).includes(method as any)
          ? (method as any)
          : 'other',
      );
      setDescription(editPayment.description || '');
      setNotes(editPayment.notes || '');
      setExpiresAt(editPayment.expires_at ? new Date(editPayment.expires_at) : undefined);
      setSessionsPurchased(editPayment.sessions_purchased != null ? String(editPayment.sessions_purchased) : '');
    } else {
      setPaymentType(defaultType);
      setAmount('');
      setPaymentDate(new Date());
      setPaymentMethod('cash');
      setDescription('');
      setNotes('');
      setExpiresAt(defaultType === 'upgrade' ? addDays(new Date(), 30) : undefined);
      setSessionsPurchased('');
    }
  }, [open, editPayment, defaultType]);

  // Auto-suggest expires_at = payment_date + 30d when in create mode and type needs it
  useEffect(() => {
    if (isEditMode) return;
    if (paymentType === 'upgrade' || paymentType === 'renewal') {
      setExpiresAt(addDays(paymentDate, 30));
    } else {
      setExpiresAt(undefined);
    }
  }, [paymentType, paymentDate, isEditMode]);

  // Which fields show for which type
  const showExpiresAt = paymentType === 'upgrade' || paymentType === 'renewal';
  const showSessionsPurchased = paymentType === 'sessions';
  const showDescription = paymentType === 'sessions' || paymentType === 'adhoc';
  const isUpgrade = paymentType === 'upgrade';

  const handleSave = async () => {
    const numAmount = parseFloat(amount);
    if (!amount || isNaN(numAmount) || numAmount <= 0) {
      toast.error('Please enter a valid amount.');
      return;
    }
    if (showDescription && !description.trim()) {
      toast.error('Please enter a description.');
      return;
    }
    if (showExpiresAt && !expiresAt) {
      toast.error('Please pick an expiration date.');
      return;
    }
    if (showSessionsPurchased && sessionsPurchased.trim()) {
      const n = parseInt(sessionsPurchased, 10);
      if (isNaN(n) || n < 0) {
        toast.error('Sessions purchased must be a non-negative whole number.');
        return;
      }
    }

    setSubmitting(true);

    const paymentRow = {
      user_id: memberId,
      amount: numAmount,
      payment_date: format(paymentDate, 'yyyy-MM-dd'),
      payment_method: paymentMethod,
      payment_type: paymentType,
      description: showDescription ? description.trim() : null,
      notes: notes.trim() || null,
      recorded_by: coachId,
      expires_at: showExpiresAt && expiresAt ? expiresAt.toISOString() : null,
      sessions_purchased:
        showSessionsPurchased && sessionsPurchased.trim()
          ? parseInt(sessionsPurchased, 10)
          : null,
    };

    if (isEditMode && editPayment) {
      // EDIT MODE — write payment row only. No profile side effects on edit, by design:
      // re-firing role/plan/notification on an edit would be confusing and destructive.
      const { error } = await supabase
        .from('cash_payments')
        .update(paymentRow as any)
        .eq('id', editPayment.id);
      if (error) {
        console.error('Payment update error:', error);
        toast.error('Failed to update payment.');
        setSubmitting(false);
        return;
      }
      toast.success('Payment updated.');
    } else {
      // CREATE MODE — insert payment row, then apply side effects gated by payment_type.
      const { error: paymentErr } = await supabase
        .from('cash_payments')
        .insert(paymentRow as any);
      if (paymentErr) {
        console.error('Payment insert error:', paymentErr);
        toast.error('Failed to record payment.');
        setSubmitting(false);
        return;
      }

      // Side effects, strictly gated by payment_type:
      try {
        if (paymentType === 'upgrade') {
          // Flip plan + set expiry on profile
          const { error: profileErr } = await supabase
            .from('profiles')
            .update({
              selected_plan: 'online',
              subscription_status: 'active',
              membership_expires_at: expiresAt!.toISOString(),
              upgraded_at: new Date().toISOString(),
              intake_reminder_sent: false,
            } as any)
            .eq('id', memberId);
          if (profileErr) throw profileErr;

          // Set role to exactly 'paid'. NOTE: this clears ALL existing roles for the
          // user first, then inserts 'paid'. Preserved from legacy UpgradeToPaidDialog
          // behavior — destructive if the user holds multiple roles. Revisit if/when
          // multi-role users become common.
          const { error: roleDelErr } = await supabase
            .from('user_roles')
            .delete()
            .eq('user_id', memberId);
          if (roleDelErr) throw roleDelErr;
          const { error: roleInsErr } = await supabase
            .from('user_roles')
            .insert({ user_id: memberId, role: 'paid' } as any);
          if (roleInsErr) throw roleInsErr;

          // Welcome notification is now created automatically by the
          // notify_on_upgrade_payment DB trigger on cash_payments INSERT.
          // Do not re-add an insert here — the notifications table RLS
          // blocks direct inserts from user-context clients.
        } else if (paymentType === 'renewal') {
          // Extend membership_expires_at only.
          const { error: profileErr } = await supabase
            .from('profiles')
            .update({
              membership_expires_at: expiresAt!.toISOString(),
              subscription_status: 'active',
            } as any)
            .eq('id', memberId);
          if (profileErr) throw profileErr;
        }
        // 'sessions' and 'adhoc' have NO profile side effects, by design.
        // (If you want session payments to also update profiles.sessions_remaining
        // automatically, that's a deliberate follow-up — for now, no side effects.)
      } catch (err) {
        console.error('Side-effect error:', err);
        toast.error('Payment saved, but member profile update failed. Check the member record.');
        setSubmitting(false);
        onOpenChange(false);
        onSuccess();
        return;
      }

      toast.success(
        paymentType === 'upgrade'
          ? 'Member upgraded.'
          : paymentType === 'renewal'
          ? 'Renewal recorded.'
          : 'Payment recorded.',
      );
    }

    setSubmitting(false);
    onOpenChange(false);
    onSuccess();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'Edit Payment' : 'Record Payment'}</DialogTitle>
          {isEditMode && isUpgrade && (
            <DialogDescription className="flex items-start gap-2 text-xs">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>
                Editing an upgrade payment does not re-trigger role assignment or notifications.
              </span>
            </DialogDescription>
          )}
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Member (read-only) */}
          <div className="space-y-1.5">
            <Label>Member</Label>
            <Input value={memberName || 'Unnamed'} readOnly className="bg-muted" />
          </div>

          {/* Payment type — locked in edit mode */}
          <div className="space-y-1.5">
            <Label>Payment type *</Label>
            <Select
              value={paymentType}
              onValueChange={(v) => setPaymentType(v as PaymentType)}
              disabled={isEditMode}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(PAYMENT_TYPE_LABELS) as PaymentType[]).map((t) => (
                  <SelectItem key={t} value={t}>
                    {PAYMENT_TYPE_LABELS[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Amount */}
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

          {/* Payment date */}
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

          {/* Payment method */}
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

          {/* Description — sessions / adhoc */}
          {showDescription && (
            <div className="space-y-1.5">
              <Label>Description *</Label>
              <Input
                placeholder="e.g. 8 sessions April"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          )}

          {/* Sessions purchased — sessions */}
          {showSessionsPurchased && (
            <div className="space-y-1.5">
              <Label>Sessions purchased (optional)</Label>
              <Input
                type="number"
                min="0"
                step="1"
                placeholder="e.g. 8"
                value={sessionsPurchased}
                onChange={(e) => setSessionsPurchased(e.target.value)}
              />
            </div>
          )}

          {/* Expiration — upgrade / renewal */}
          {showExpiresAt && (
            <div className="space-y-1.5">
              <Label>
                {paymentType === 'upgrade' ? 'Expiration date *' : 'New expiration date *'}
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn('w-full justify-start text-left font-normal', !expiresAt && 'text-muted-foreground')}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {expiresAt ? format(expiresAt, 'PPP') : 'Pick a date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={expiresAt}
                    onSelect={setExpiresAt}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
              <p className="text-[11px] text-muted-foreground">
                {paymentType === 'upgrade'
                  ? 'Member will return to the free plan on this date.'
                  : 'Sets the member’s new membership expiration.'}
              </p>
            </div>
          )}

          {/* Notes (optional, all types) */}
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
            {submitting ? 'Saving...' : isEditMode ? 'Save changes' : 'Save payment'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}