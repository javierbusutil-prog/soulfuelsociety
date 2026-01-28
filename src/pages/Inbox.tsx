import { motion } from 'framer-motion';
import { Lock, MessageCircle, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAuth } from '@/contexts/AuthContext';
import { Link } from 'react-router-dom';

export default function Inbox() {
  const { isPaidMember } = useAuth();

  if (!isPaidMember) {
    return (
      <AppLayout title="Inbox">
        <div className="max-w-lg mx-auto p-4 flex flex-col items-center justify-center min-h-[60vh]">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center"
          >
            <div className="w-20 h-20 bg-secondary rounded-full flex items-center justify-center mx-auto mb-6">
              <Lock className="w-10 h-10 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-bold mb-2">Unlock 1:1 Coaching</h2>
            <p className="text-muted-foreground mb-6 max-w-xs mx-auto">
              Get personalized support and guidance from our expert coaches with a paid membership.
            </p>
            <Button asChild variant="gradient" size="lg">
              <Link to="/upgrade">Upgrade Now</Link>
            </Button>
          </motion.div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Inbox">
      <div className="max-w-lg mx-auto p-4">
        <Card className="p-8 text-center text-muted-foreground">
          <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p className="mb-4">Your 1:1 coaching inbox</p>
          <p className="text-sm">Start a conversation with your coach to get personalized support.</p>
          <Button className="mt-4">
            <Send className="w-4 h-4 mr-2" />
            Request Support
          </Button>
        </Card>
      </div>
    </AppLayout>
  );
}
