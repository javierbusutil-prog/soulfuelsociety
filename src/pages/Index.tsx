import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Users, Calendar, Dumbbell, ShoppingBag, ArrowRight, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import logoPrimary from '@/assets/logo-primary.svg';

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
      <div className="relative z-10 max-w-lg mx-auto px-6 py-12">
        {/* Hero with Primary Horizontal Logo */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          {/* Primary Horizontal Soul Fuel logo (with flame) - centered */}
          <div className="flex justify-center mb-8">
            <img 
              src={logoPrimary} 
              alt="Soul Fuel" 
              className="h-16 w-auto"
            />
          </div>
          
          <h1 className="font-display text-2xl font-medium tracking-editorial-wide text-primary mb-4">
            SOCIETY
          </h1>
          
          <p className="text-muted-foreground text-base mb-8 max-w-sm mx-auto leading-relaxed">
            Transform your body and mind with our community-driven wellness platform.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild size="lg" variant="accent">
              <Link to="/signup">
                Get Started Free
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/login">Sign In</Link>
            </Button>
          </div>
        </motion.div>

        {/* Features */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="grid grid-cols-2 gap-3 mb-12"
        >
          {features.map((feature, index) => (
            <motion.div
              key={feature.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 + index * 0.08 }}
              className="bg-secondary/50 border border-border rounded-2xl p-4"
            >
              <div className="w-10 h-10 bg-background rounded-xl flex items-center justify-center mb-3 border border-border">
                <feature.icon className="w-5 h-5 text-primary stroke-[1.5]" />
              </div>
              <h3 className="font-medium text-sm mb-1">{feature.label}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{feature.description}</p>
            </motion.div>
          ))}
        </motion.div>

        {/* Benefits */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="bg-secondary/30 border border-border rounded-2xl p-6"
        >
          <h2 className="font-display text-xl font-medium tracking-editorial mb-5 text-center">Why Join?</h2>
          <ul className="space-y-3">
            {benefits.map((benefit, index) => (
              <motion.li
                key={benefit}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 + index * 0.08 }}
                className="flex items-center gap-3"
              >
                <div className="w-5 h-5 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
                  <Check className="w-3 h-3 text-primary" />
                </div>
                <span className="text-sm text-foreground">{benefit}</span>
              </motion.li>
            ))}
          </ul>
        </motion.div>

        {/* Footer */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-center text-xs text-muted-foreground mt-12"
        >
          © 2025 Soul Fuel Society. All rights reserved.
        </motion.p>
      </div>
    </div>
  );
}