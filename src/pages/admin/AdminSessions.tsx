import { AdminLayout } from '@/components/layout/AdminLayout';
import { Card, CardContent } from '@/components/ui/card';
import { CalendarClock } from 'lucide-react';

export default function AdminSessions() {
  return (
    <AdminLayout title="Sessions">
      <div className="p-4 md:p-6 max-w-3xl mx-auto">
        <Card>
          <CardContent className="p-8 text-center space-y-3">
            <CalendarClock className="w-10 h-10 mx-auto text-muted-foreground/50" />
            <p className="text-muted-foreground text-sm">
              Session scheduling coming soon. You'll manage in-person and online session bookings here.
            </p>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
