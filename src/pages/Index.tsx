import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Flame, Users, Calendar, Dumbbell, ShoppingBag, ArrowRight, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';

const features = [
  { icon: Users, label: 'Community', description: 'Connect with like-minded fitness enthusiasts' },
  { icon: Calendar, label: 'Habit Tracking', description: 'Track fasts, workouts, and challenges' },
  { icon: Dumbbell, label: 'Workout Library', description: 'Access curated workouts for all levels' },
  { icon: ShoppingBag, label: 'Shop', description: 'Programs and gear to fuel your journey' },
];

const benefits = [
  'Join a supportive fitness community',
  'Track your fasting and workout habits',
  'Access expert-designed workouts',
  'Get personalized coaching (paid)',
];

export default function Index() {
  return (
    <div className="min-h-screen bg-background overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-primary/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 max-w-lg mx-auto px-6 py-12">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-3 mb-6">
            <div className="w-14 h-14 bg-gradient-primary rounded-2xl flex items-center justify-center shadow-lg glow-primary">
              <Flame className="w-8 h-8 text-primary-foreground" />
            </div>
          </div>
          <h1 className="text-4xl font-bold mb-4 leading-tight">
            Soul Fuel
            <span className="block text-primary">Society</span>
          </h1>
          <p className="text-muted-foreground text-lg mb-8 max-w-xs mx-auto">
            Transform your body and mind with our community-driven fitness platform.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild size="xl" variant="accent">
              <Link to="/signup">
                Get Started Free
                <ArrowRight className="w-5 h-5 ml-2" />
              </Link>
            </Button>
            <Button asChild size="xl" variant="outline">
              <Link to="/login">Sign In</Link>
            </Button>
          </div>
        </motion.div>

        {/* Features */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="grid grid-cols-2 gap-3 mb-12"
        >
          {features.map((feature, index) => (
            <motion.div
              key={feature.label}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 + index * 0.1 }}
              className="bg-card/50 border border-border/50 rounded-xl p-4 backdrop-blur-sm"
            >
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center mb-3">
                <feature.icon className="w-5 h-5 text-primary" />
              </div>
              <h3 className="font-semibold text-sm mb-1">{feature.label}</h3>
              <p className="text-xs text-muted-foreground">{feature.description}</p>
            </motion.div>
          ))}
        </motion.div>

        {/* Benefits */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="bg-card/30 border border-border/50 rounded-2xl p-6 backdrop-blur-sm"
        >
          <h2 className="font-bold text-lg mb-4 text-center">Why Join?</h2>
          <ul className="space-y-3">
            {benefits.map((benefit, index) => (
              <motion.li
                key={benefit}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 + index * 0.1 }}
                className="flex items-center gap-3"
              >
                <div className="w-6 h-6 bg-success/20 rounded-full flex items-center justify-center shrink-0">
                  <Check className="w-3.5 h-3.5 text-success" />
                </div>
                <span className="text-sm">{benefit}</span>
              </motion.li>
            ))}
          </ul>
        </motion.div>

        {/* Footer */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="text-center text-xs text-muted-foreground mt-12"
        >
          © 2025 Soul Fuel Society. All rights reserved.
        </motion.p>
      </div>
    </div>
  );
}
