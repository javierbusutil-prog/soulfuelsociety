import { ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { AdminSidebar } from './AdminSidebar';
import { AdminBottomNav } from './AdminBottomNav';

interface AdminLayoutProps {
  children: ReactNode;
  title?: string;
}

export function AdminLayout({ children, title }: AdminLayoutProps) {
  const { isAdmin, isPTAdmin, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAdmin && !isPTAdmin) {
    return <Navigate to="/community" replace />;
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop sidebar */}
      <AdminSidebar />

      {/* Main content */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Top bar */}
        <header className="h-14 border-b border-border flex items-center px-4 md:px-6 bg-card/80 backdrop-blur-sm sticky top-0 z-30">
          <h1 className="font-display text-lg font-medium tracking-editorial text-foreground">
            {title || 'Coach Dashboard'}
          </h1>
        </header>

        <main className="flex-1 pb-20 md:pb-6 overflow-auto">
          {children}
        </main>

        {/* Mobile bottom nav */}
        <AdminBottomNav />
      </div>
    </div>
  );
}
