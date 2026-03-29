import { AdminLayout } from '@/components/layout/AdminLayout';
import { Card, CardContent } from '@/components/ui/card';
import { DollarSign } from 'lucide-react';

export default function AdminRevenue() {
  return (
    <AdminLayout title="Revenue">
      <div className="p-4 md:p-6 max-w-3xl mx-auto">
        <Card>
          <CardContent className="p-8 text-center space-y-3">
            <DollarSign className="w-10 h-10 mx-auto text-muted-foreground/50" />
            <p className="text-muted-foreground text-sm">
              Revenue tracking coming soon. You'll see subscription revenue, payment history, and analytics here.
            </p>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
