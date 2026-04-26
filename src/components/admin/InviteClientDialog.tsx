import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface InviteClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  coachId: string;
  onSuccess?: () => void;
}

export function InviteClientDialog({ open, onOpenChange, coachId, onSuccess }: InviteClientDialogProps) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setFullName('');
    setEmail('');
    setNote('');
  };

  const handleSubmit = async () => {
    if (!fullName.trim() || !email.trim()) {
      toast.error('Name and email are required');
      return;
    }

    setSubmitting(true);
    try {
      const token = crypto.randomUUID();

      const { error: insertError } = await supabase.from('client_invitations').insert({
        email: email.trim().toLowerCase(),
        full_name: fullName.trim(),
        invited_by: coachId,
        note: note.trim() || null,
        token,
        status: 'pending',
      });

      if (insertError) throw insertError;

      const { error: emailError } = await supabase.functions.invoke('send-client-invite', {
        body: {
          email: email.trim().toLowerCase(),
          full_name: fullName.trim(),
          note: note.trim() || null,
        },
      });

      if (emailError) {
        console.error('Email send failed:', emailError);
        toast.warning(`Invite saved, but email failed to send. You can resend it.`);
      } else {
        toast.success(`Invite sent to ${fullName.trim()}`);
      }

      reset();
      onOpenChange(false);
      onSuccess?.();
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || 'Failed to send invite');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invite Client</DialogTitle>
          <DialogDescription>
            Send a personal invite to a new in-person client.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="invite-name">Full name</Label>
            <Input
              id="invite-name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Jane Doe"
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="invite-email">Email</Label>
            <Input
              id="invite-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="jane@example.com"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="invite-note">Personal note (optional)</Label>
            <Textarea
              id="invite-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Hey! Your program is ready and waiting for you."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Sending...' : 'Send Invite'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}