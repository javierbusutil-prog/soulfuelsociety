import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, CheckCircle, Flame } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import logoPrimary from '@/assets/logo-primary.svg';

export default function Waitlist() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedName = name.trim();
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedName || trimmedName.length > 100) {
      toast({ title: 'Please enter a valid name (max 100 characters)', variant: 'destructive' });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail) || trimmedEmail.length > 255) {
      toast({ title: 'Please enter a valid email address', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from('waitlist' as any).insert({
        name: trimmedName,
        email: trimmedEmail,
      } as any);

      if (error) {
        if (error.code === '23505') {
          toast({ title: "You're already on the list!", description: "We'll be in touch soon." });
          setSubmitted(true);
        } else {
          throw error;
        }
      } else {
        setSubmitted(true);
        toast({ title: "You're on the list! 🎉" });
      }
    } catch (err: any) {
      toast({ title: 'Something went wrong', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6" role="main" aria-label="Join the waitlist">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md text-center"
      >
        {/* Logo */}
        <img src={logoPrimary} alt="Soul Fuel" className="h-80 mx-auto mb-2" />

        {submitted ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-4"
          >
            <div className="w-16 h-16 rounded-full bg-success/20 flex items-center justify-center mx-auto">
              <CheckCircle className="w-8 h-8 text-success" />
            </div>
            <h1 className="font-display text-2xl font-medium tracking-editorial text-foreground">
              You're on the list
            </h1>
            <p className="text-muted-foreground text-sm leading-relaxed">
              We'll reach out when it's your turn. Get ready to fuel your soul.
            </p>
          </motion.div>
        ) : (
          <>
            <h1 className="font-display text-3xl font-medium tracking-editorial text-foreground mb-2">
              Something is coming
            </h1>
            <p className="text-muted-foreground text-sm leading-relaxed mb-8">
              Join the waitlist to be the first to experience Soul Fuel — your training, nutrition, and wellness in one place.
            </p>

            <Card className="p-6 text-left">
              <form onSubmit={handleSubmit} className="space-y-4" aria-label="Waitlist signup form">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your name"
                    maxLength={100}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    maxLength={255}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading} aria-busy={loading}>
                  {loading ? 'Joining...' : 'Join the Waitlist'}
                  {!loading && <ArrowRight className="w-4 h-4 ml-2" aria-hidden="true" />}
                </Button>
              </form>
            </Card>

            <p className="text-xs text-muted-foreground mt-4">
              No spam, ever. We'll only email you when it's time.
            </p>
          </>
        )}
      </motion.div>
    </div>
  );
}
