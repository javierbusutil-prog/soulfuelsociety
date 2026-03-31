import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Bell, Smartphone } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export default function AdminSettings() {
  const { user } = useAuth();
  const [inappEnabled, setInappEnabled] = useState(true);
  const [pushEnabled, setPushEnabled] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      const { data } = await supabase
        .from('coach_notification_preferences' as any)
        .select('*')
        .eq('coach_id', user.id)
        .maybeSingle();
      if (data) {
        setInappEnabled((data as any).inapp_enabled);
        setPushEnabled((data as any).push_enabled);
      }
      setLoading(false);
    };
    fetch();
  }, [user]);

  const updatePreference = async (field: string, value: boolean) => {
    if (!user) return;
    const { error } = await supabase
      .from('coach_notification_preferences' as any)
      .upsert(
        { coach_id: user.id, [field]: value } as any,
        { onConflict: 'coach_id' }
      );
    if (error) {
      toast.error('Failed to update preference');
    } else {
      toast.success('Preference updated');
    }
  };

  const handleInappToggle = (checked: boolean) => {
    setInappEnabled(checked);
    updatePreference('inapp_enabled', checked);
  };

  const handlePushToggle = (checked: boolean) => {
    setPushEnabled(checked);
    updatePreference('push_enabled', checked);
  };

  return (
    <AdminLayout title="Settings">
      <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your coach preferences</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Bell className="w-4 h-4" />
              Notifications
            </CardTitle>
            <CardDescription>
              Control how you're notified about new community posts from members.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="inapp" className="text-sm font-medium">
                  In-app notifications
                </Label>
                <p className="text-xs text-muted-foreground">
                  Show notifications in the admin dashboard bell icon
                </p>
              </div>
              <Switch
                id="inapp"
                checked={inappEnabled}
                onCheckedChange={handleInappToggle}
                disabled={loading}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="push" className="text-sm font-medium flex items-center gap-1.5">
                  <Smartphone className="w-3.5 h-3.5" />
                  Push notifications
                </Label>
                <p className="text-xs text-muted-foreground">
                  Receive push notifications on your device when a member posts
                </p>
              </div>
              <Switch
                id="push"
                checked={pushEnabled}
                onCheckedChange={handlePushToggle}
                disabled={loading}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
