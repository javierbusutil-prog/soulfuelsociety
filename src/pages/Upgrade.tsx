import { motion } from 'framer-motion';
import { Check, Zap, MessageCircle, Dumbbell, Stethoscope } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import soulFuelIcon from '@/assets/soul-fuel-icon.svg';

const features = [
  { icon: MessageCircle, label: '1:1 Coaching Access', description: 'Direct messaging with your personal coach' },
  { icon: Dumbbell, label: 'Personalized Plans', description: 'Custom workout and nutrition plans' },
  { icon: Stethoscope, label: 'PT Consultations', description: 'Access to physical therapy guidance' },
  { icon: Zap, label: 'Priority Support', description: 'Get responses within 24 hours' },
];

export default function Upgrade() {
  const { user, profile } = useAuth();
  const { toast } = useToast();

  const handleUpgrade = () => {
    toast({
      title: 'Coming Soon',
      description: 'Payment integration will be available soon!',
    });
  };

  return (
    <AppLayout title="Upgrade">
      <div className="max-w-lg mx-auto p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-4">
            <img src={soulFuelIcon} alt="Soul Fuel" className="h-10 w-auto" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Unlock Your Full Potential</h1>
          <p className="text-muted-foreground">
            Get personalized coaching and exclusive features
          </p>
        </motion.div>

        <Card className="p-6 bg-gradient-card border-primary/30 mb-6">
          <div className="flex items-baseline justify-center gap-1 mb-6">
            <span className="text-4xl font-bold">$29</span>
            <span className="text-muted-foreground">/month</span>
          </div>

          <ul className="space-y-4 mb-6">
            {features.map((feature, index) => (
              <motion.li
                key={feature.label}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-start gap-3"
              >
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
                  <feature.icon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">{feature.label}</p>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </div>
              </motion.li>
            ))}
          </ul>

          <Button onClick={handleUpgrade} variant="accent" size="xl" className="w-full">
            Start Paid Membership
          </Button>

          <p className="text-center text-xs text-muted-foreground mt-4">
            Cancel anytime. No commitment required.
          </p>
        </Card>

        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            Questions? Contact us at{' '}
            <a href="mailto:support@soulfuel.com" className="text-primary hover:underline">
              support@soulfuel.com
            </a>
          </p>
        </div>
      </div>
    </AppLayout>
  );
}
