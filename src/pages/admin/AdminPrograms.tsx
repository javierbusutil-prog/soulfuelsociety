import { AdminLayout } from '@/components/layout/AdminLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Dumbbell } from 'lucide-react';

export default function AdminPrograms() {
  return (
    <AdminLayout title="Programs">
      <div className="p-4 md:p-6 max-w-3xl mx-auto">
        <Card>
          <CardContent className="p-8 text-center space-y-3">
            <Dumbbell className="w-10 h-10 mx-auto text-muted-foreground/50" />
            <p className="text-muted-foreground text-sm">
              Program management coming soon. You'll be able to create, edit, and assign workout programs to members here.
            </p>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
