import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Copy, Check, Link2, Users, Clock, CheckCircle2, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface InviteSlot {
  id?: string;
  email: string;
  token?: string;
  status: 'empty' | 'pending' | 'accepted' | 'expired';
  link?: string;
}

export default function Invite() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [invites, setInvites] = useState<InviteSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatingIndex, setGeneratingIndex] = useState<number | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const groupSize = profile?.group_size as string | null;
  const slotsNeeded = groupSize === 'trio' ? 2 : groupSize === 'partner' ? 1 : 0;

  useEffect(() => {
    if (slotsNeeded === 0) {
      navigate('/community', { replace: true });
      return;
    }
    loadInvites();
  }, [user, slotsNeeded]);

  const loadInvites = async () => {
    if (!user) return;
    setLoading(true);

    const { data } = await supabase
      .from('group_invites' as any)
      .select('*')
      .eq('created_by', user.id)
      .order('created_at', { ascending: true });

    const existing: InviteSlot[] = ((data as any[]) || []).map((inv: any) => ({
      id: inv.id,
      email: inv.invitee_email || '',
      token: inv.invite_token,
      status: inv.status === 'accepted' ? 'accepted' : 
              new Date(inv.expires_at) < new Date() ? 'expired' : inv.status,
      link: `${window.location.origin}/join/${inv.invite_token}`,
    }));

    // Fill remaining slots
    while (existing.length < slotsNeeded) {
      existing.push({ email: '', status: 'empty' });
    }

    setInvites(existing.slice(0, slotsNeeded));
    setLoading(false);

    // Check if all accepted
    const allAccepted = existing.slice(0, slotsNeeded).every(s => s.status === 'accepted');
    if (allAccepted && existing.length >= slotsNeeded) {
      navigate('/onboarding', { replace: true });
    }
  };

  const generateLink = async (index: number) => {
    if (!user || !profile) return;
    setGeneratingIndex(index);

    try {
      const token = crypto.randomUUID().replace(/-/g, '').slice(0, 16);
      const groupId = invites.find(i => i.id)?.id 
        ? ((await supabase.from('group_invites' as any).select('group_id').eq('created_by', user.id).limit(1)).data as any)?.[0]?.group_id
        : crypto.randomUUID();

      const planDetails = {
        session_count: profile.session_count,
        group_size: profile.group_size,
        selected_plan: profile.selected_plan,
      };

      const { error } = await supabase.from('group_invites' as any).insert({
        group_id: groupId,
        created_by: user.id,
        invite_token: token,
        invitee_email: invites[index].email || null,
        status: 'pending',
        plan_details: planDetails,
      } as any);

      if (error) throw error;

      const link = `${window.location.origin}/join/${token}`;
      setInvites(prev => prev.map((s, i) => 
        i === index ? { ...s, token, status: 'pending' as const, link, id: 'new' } : s
      ));

      toast({ title: 'Invite link generated!' });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setGeneratingIndex(null);
    }
  };

  const copyLink = (index: number) => {
    const link = invites[index]?.link;
    if (link) {
      navigator.clipboard.writeText(link);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    }
  };

  const statusBadge = (status: InviteSlot['status']) => {
    switch (status) {
      case 'accepted':
        return <Badge className="bg-green-500/10 text-green-600 border-green-500/20"><CheckCircle2 className="w-3 h-3 mr-1" /> Accepted</Badge>;
      case 'pending':
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" /> Pending</Badge>;
      case 'expired':
        return <Badge variant="destructive"><Clock className="w-3 h-3 mr-1" /> Expired</Badge>;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <AppLayout title="Invite">
        <div className="flex items-center justify-center min-h-[50vh]">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Invite Your Group">
      <div className="max-w-lg mx-auto p-4 pb-8 space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
            <Users className="w-7 h-7 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Invite your group</h1>
          <p className="text-muted-foreground text-sm">
            Your plan is not active until all group members have joined and paid. 
            You need <span className="font-semibold text-foreground">{slotsNeeded} more {slotsNeeded === 1 ? 'person' : 'people'}</span> to complete your group.
          </p>
        </div>

        {/* Invite slots */}
        <div className="space-y-4">
          {invites.map((slot, i) => (
            <Card key={i} className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground">
                  Member {i + 2}
                </h3>
                {statusBadge(slot.status)}
              </div>

              {slot.status === 'empty' && (
                <>
                  <Input
                    placeholder="Email address (optional)"
                    type="email"
                    value={slot.email}
                    onChange={e => setInvites(prev => prev.map((s, idx) => 
                      idx === i ? { ...s, email: e.target.value } : s
                    ))}
                  />
                  <Button
                    onClick={() => generateLink(i)}
                    disabled={generatingIndex === i}
                    className="w-full"
                    variant="outline"
                  >
                    {generatingIndex === i ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Link2 className="w-4 h-4 mr-2" />
                    )}
                    Generate Invite Link
                  </Button>
                </>
              )}

              {(slot.status === 'pending' || slot.status === 'expired') && slot.link && (
                <div className="space-y-2">
                  {slot.email && (
                    <p className="text-xs text-muted-foreground">Sent to: {slot.email}</p>
                  )}
                  <div className="flex items-center gap-2">
                    <Input
                      readOnly
                      value={slot.link}
                      className="text-xs font-mono bg-muted/30"
                    />
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => copyLink(i)}
                      className="shrink-0"
                    >
                      {copiedIndex === i ? (
                        <Check className="w-4 h-4 text-green-500" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                  {slot.status === 'expired' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setInvites(prev => prev.map((s, idx) => 
                          idx === i ? { email: s.email, status: 'empty' } : s
                        ));
                      }}
                    >
                      Generate New Link
                    </Button>
                  )}
                </div>
              )}

              {slot.status === 'accepted' && (
                <p className="text-sm text-green-600 font-medium">
                  ✓ This member has joined and paid.
                </p>
              )}
            </Card>
          ))}
        </div>

        {/* Refresh status */}
        <Button variant="ghost" className="w-full" onClick={loadInvites}>
          Refresh invite status
        </Button>
      </div>
    </AppLayout>
  );
}
