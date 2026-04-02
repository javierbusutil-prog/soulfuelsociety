import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface DeletePaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  paymentId: string;
  onSuccess: () => void;
}

export function DeletePaymentDialog({ open, onOpenChange, paymentId, onSuccess }: DeletePaymentDialogProps) {
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    const { error } = await supabase
      .from('cash_payments')
      .delete()
      .eq('id', paymentId);

    if (error) {
      toast.error('Failed to delete payment record.');
    } else {
      toast.success('Payment record deleted.');
      onSuccess();
    }
    setDeleting(false);
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete payment record?</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete this payment record? This will not change the member's current plan.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleDelete} disabled={deleting}>
            {deleting ? 'Deleting...' : 'Delete'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
