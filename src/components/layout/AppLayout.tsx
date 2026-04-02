import { ReactNode } from 'react';
import { Header } from './Header';
import { BottomNav } from './BottomNav';
import { UpgradeBanner } from './UpgradeBanner';
import { IntakeBanner } from './IntakeBanner';

interface AppLayoutProps {
  children: ReactNode;
  title?: string;
  hideNav?: boolean;
  hideHeader?: boolean;
}

export function AppLayout({ children, title, hideNav, hideHeader }: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <a href="#main-content" className="skip-nav">
        Skip to main content
      </a>
      {!hideHeader && <Header title={title} />}
      <UpgradeBanner />
      <IntakeBanner />
      <main id="main-content" className="flex-1 pb-20" aria-label={title || 'Main content'}>
        {children}
      </main>
      {!hideNav && <BottomNav />}
    </div>
  );
}
