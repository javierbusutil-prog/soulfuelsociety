import { AdminLayout } from '@/components/layout/AdminLayout';
import { Card, CardContent } from '@/components/ui/card';
import { MessageCircle } from 'lucide-react';

export default function AdminMessages() {
  return (
    <AdminLayout title="Messages">
      <div className="p-4 md:p-6 max-w-3xl mx-auto">
        <Card>
          <CardContent className="p-8 text-center space-y-3">
            <MessageCircle className="w-10 h-10 mx-auto text-muted-foreground/50" />
            <p className="text-muted-foreground text-sm">
              Coach messaging coming soon. You'll see all member threads and be able to respond here.
            </p>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
