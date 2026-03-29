import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Users, AlertCircle, Loader2, CreditCard } from 'lucide-react';

interface InviteData {
  id: string;
  group_id: string;
  status: string;
  plan_details: {
    session_count?: number;
    group_size?: string;
    selected_plan?: string;
  };
  expires_at: string;
  created_by: string;
}

export default function JoinGroup() {
  const { token } = useParams<{ token: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [invite, setInvite] = useState<InviteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  useEffect(() => {
    loadInvite();
  }, [token]);

  const loadInvite = async () => {
    if (!token) {
      setError('No invite token provided.');
      setLoading(false);
      return;
    }

    const { data, error: fetchError } = await supabase
      .from('group_invites' as any)
      .select('*')
      .eq('invite_token', token)
      .single();

    if (fetchError || !data) {
      setError('This invite link is invalid or has expired. Ask your group organizer for a new link.');
      setLoading(false);
      return;
    }

    const inv = data as any as InviteData;
    const isExpired = new Date(inv.expires_at) < new Date();
    
    if (isExpired || inv.status === 'expired') {
      setError('This invite link is invalid or has expired. Ask your group organizer for a new link.');
      setLoading(false);
      return;
    }

    if (inv.status === 'accepted') {
      setError('This invite has already been used.');
      setLoading(false);
      return;
    }

    setInvite(inv);
    setLoading(false);
  };

  const getPrice = () => {
    if (!invite?.plan_details) return 0;
    const { session_count = 4, group_size = 'partner' } = invite.plan_details;
    const rates: Record<string, number> = { solo: 50, partner: 40, trio: 35 };
    return (rates[group_size] || 40) * session_count;
  };

  const handleAcceptAndPay = async () => {
    if (!user) {
      // Redirect to signup with return URL
      navigate(`/signup?redirect=/join/${token}`);
      return;
    }

    setCheckoutLoading(true);
    try {
      const { data, error: fnError } = await supabase.functions.invoke('create-checkout', {
        body: {
          plan: 'in_person',
          sessionCount: invite?.plan_details?.session_count || 4,
          groupSize: invite?.plan_details?.group_size || 'partner',
          inviteToken: token,
          groupId: invite?.group_id,
        },
      });

      if (fnError) throw fnError;
      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setCheckoutLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
            <AlertCircle className="w-7 h-7 text-destructive" />
          </div>
          <h1 className="text-xl font-bold text-foreground">Invalid Invite</h1>
          <p className="text-muted-foreground text-sm">{error}</p>
          <Button asChild variant="outline">
            <Link to="/login">Go to Soul Fuel Society</Link>
          </Button>
        </Card>
      </div>
    );
  }

  const price = getPrice();
  const groupLabel = invite?.plan_details?.group_size === 'trio' ? 'Trio (3 people)' : 'Partner (2 people)';
  const sessions = invite?.plan_details?.session_count || 4;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full p-8 space-y-6">
        <div className="text-center space-y-3">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
            <Users className="w-7 h-7 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">You've been invited to train together</h1>
          <p className="text-muted-foreground text-sm">
            Someone has invited you to join their in-person training group at Soul Fuel Society.
          </p>
        </div>

        {/* Plan details */}
        <Card className="p-4 bg-muted/30 space-y-3">
          <h3 className="text-sm font-semibold text-foreground">Plan Details</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Plan</span>
              <span className="font-medium text-foreground">In-Person Training</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Group</span>
              <span className="font-medium text-foreground">{groupLabel}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Sessions</span>
              <span className="font-medium text-foreground">{sessions}/month</span>
            </div>
            <div className="flex justify-between border-t border-border pt-2">
              <span className="text-muted-foreground">Your price</span>
              <span className="font-bold text-foreground text-lg">${price}/mo</span>
            </div>
          </div>
        </Card>

        {!user && (
          <p className="text-xs text-muted-foreground text-center">
            You'll need to create an account or sign in to continue.
          </p>
        )}

        <Button
          onClick={handleAcceptAndPay}
          size="lg"
          className="w-full"
          disabled={checkoutLoading}
        >
          {checkoutLoading ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <CreditCard className="w-4 h-4 mr-2" />
          )}
          {user ? `Accept & Pay $${price}/mo` : 'Sign in to accept'}
        </Button>
      </Card>
    </div>
  );
}
