import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import LiabilityWaiver from '@/components/auth/LiabilityWaiver';

const WAIVER_PDF_URL = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/legal-documents/soul-fuel-waiver.pdf`;

export default function Waiver() {
  const [loading, setLoading] = useState(false);
  const { user, refreshProfile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleAccept = async () => {
    if (!user) return;
    setLoading(true);

    try {
      await supabase.from('waiver_acceptances').insert({
        user_id: user.id,
        waiver_version: 'March 2026',
        ip_address: null,
        user_agent: navigator.userAgent,
      });
      await supabase.from('profiles').update({ waiver_accepted: true }).eq('id', user.id);
      await refreshProfile();
      toast({ title: 'Waiver accepted', description: 'Welcome to Soul Fuel Society!' });
      navigate('/community');
    } catch (e) {
      console.error('Failed to record waiver acceptance:', e);
      toast({ title: 'Error', description: 'Failed to save waiver acceptance. Please try again.', variant: 'destructive' });
    }

    setLoading(false);
  };

  return <LiabilityWaiver onAccept={handleAccept} loading={loading} pdfUrl={WAIVER_PDF_URL} />;
}
