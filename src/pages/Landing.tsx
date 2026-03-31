import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Menu, X, Dumbbell, Target, Timer, Heart, BookOpen, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { lovable } from '@/integrations/lovable/index';
import logoPrimary from '@/assets/logo-primary.svg';
import LiabilityWaiver from '@/components/auth/LiabilityWaiver';

const WAIVER_PDF_URL = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/legal-documents/soul-fuel-waiver.pdf`;

// --- Nav ---
function LandingNav() {
  const [open, setOpen] = useState(false);
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-landing-bg/95 backdrop-blur-sm border-b border-landing-navy/10" role="navigation" aria-label="Main navigation">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
        <Link to="/" aria-label="Soul Fuel Society Home">
          <img src={logoPrimary} alt="Soul Fuel Society" className="h-10 w-auto" />
        </Link>
        {/* Desktop */}
        <div className="hidden sm:flex items-center gap-3">
          <Button asChild variant="outline" size="sm" className="border-landing-navy text-landing-navy hover:bg-landing-navy/5 rounded-full">
            <Link to="/login">Sign in</Link>
          </Button>
          <Button asChild size="sm" className="bg-landing-navy text-landing-bg hover:bg-landing-navy/90 rounded-full" onClick={() => document.getElementById('signup')?.scrollIntoView({ behavior: 'smooth' })}>
            <a href="#signup">Join free</a>
          </Button>
        </div>
        {/* Mobile hamburger */}
        <button className="sm:hidden p-2 text-landing-navy" onClick={() => setOpen(!open)} aria-label={open ? 'Close menu' : 'Open menu'}>
          {open ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>
      {open && (
        <div className="sm:hidden bg-landing-bg border-t border-landing-navy/10 px-4 py-4 flex flex-col gap-3">
          <Button asChild variant="outline" className="border-landing-navy text-landing-navy w-full rounded-full">
            <Link to="/login" onClick={() => setOpen(false)}>Sign in</Link>
          </Button>
          <Button className="bg-landing-navy text-landing-bg w-full rounded-full" onClick={() => { setOpen(false); document.getElementById('signup')?.scrollIntoView({ behavior: 'smooth' }); }}>
            Join free
          </Button>
        </div>
      )}
    </nav>
  );
}

// --- Hero ---
function HeroSection() {
  return (
    <section className="pt-32 pb-20 px-4 sm:px-6 text-center">
      <div className="max-w-3xl mx-auto">
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="font-display text-4xl sm:text-5xl lg:text-6xl font-semibold text-landing-navy leading-tight tracking-editorial mb-6"
        >
          Feed your body. Fuel your soul.<br />Find your people.
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-landing-navy/70 text-base sm:text-lg max-w-2xl mx-auto mb-8 leading-relaxed"
        >
          Soul Fuel Society is a fitness community built around real coaching, real accountability, and real people. Track your nutrition, follow personalized programs, and train alongside a community that shows up for you every day.
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="flex flex-col sm:flex-row gap-3 justify-center mb-6"
        >
          <Button size="lg" className="bg-landing-navy text-landing-bg hover:bg-landing-navy/90 rounded-full px-8" onClick={() => document.getElementById('signup')?.scrollIntoView({ behavior: 'smooth' })}>
            Join the community — sign up free
          </Button>
          <Button asChild size="lg" variant="outline" className="border-landing-navy text-landing-navy hover:bg-landing-navy/5 rounded-full">
            <Link to="/login">Sign in</Link>
          </Button>
        </motion.div>
        <p className="text-landing-navy/50 text-sm mb-6">Free to join. No credit card required.</p>
        <div className="flex flex-wrap justify-center gap-3">
          {['5 free fitness trackers', 'Real coaches. Real people.', 'Programs for every level'].map(s => (
            <span key={s} className="bg-landing-navy/5 text-landing-navy/70 text-xs sm:text-sm px-4 py-1.5 rounded-full">{s}</span>
          ))}
        </div>
      </div>
    </section>
  );
}

// --- Features ---
const features = [
  { icon: Dumbbell, title: 'Personalized Programs', desc: 'Follow general fitness programs built for real results — or upgrade to a fully personalized plan from Javier and Elizabeth.' },
  { icon: Target, title: 'Macro Tracker', desc: 'Log your nutrition daily and hit your protein targets with a built-in macro tracker that keeps it simple.' },
  { icon: Timer, title: 'Fasting Tracker', desc: 'Track your fasting windows with an easy-to-use timer and history log — no complicated setup required.' },
  { icon: Heart, title: 'Menstrual Cycle Tracker', desc: 'Understand how your cycle affects your training and energy so you can work with your body, not against it.' },
  { icon: BookOpen, title: 'Fitness E-Books', desc: 'Access a growing library of evidence-based fitness guides created by Javier and Elizabeth.' },
  { icon: Users, title: '1:1 Coaching', desc: 'Ready to level up? Train online or in person with Javier and Elizabeth — personalized programs, real access, real results.', premium: true },
];

function FeaturesSection() {
  return (
    <section className="py-20 px-4 sm:px-6 border-t border-landing-navy/10">
      <div className="max-w-5xl mx-auto">
        <h2 className="font-display text-3xl sm:text-4xl text-landing-navy text-center mb-12 tracking-editorial">
          Everything you need to show up for yourself.
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className={`rounded-2xl p-6 border ${f.premium ? 'border-landing-gold bg-landing-gold/5' : 'border-landing-navy/10 bg-white/50'}`}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${f.premium ? 'bg-landing-gold/10' : 'bg-landing-navy/5'}`}>
                <f.icon className={`w-5 h-5 ${f.premium ? 'text-landing-gold' : 'text-landing-navy'}`} />
              </div>
              <h3 className="font-display text-lg text-landing-navy font-medium mb-2">{f.title}</h3>
              <p className="text-landing-navy/60 text-sm leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// --- Coaches ---
const coaches = [
  {
    initials: 'JB',
    name: 'Javier Busutil',
    title: 'Physical Therapist & Fitness Coach',
    bio: "Javier's path to coaching is rooted in both athletics and healthcare. He played baseball at Brito Miami Private School and competed at Barry University before earning his Doctor of Physical Therapy at Florida International University. When his athletic career ended, he discovered CrossFit — and never looked back. His background in physical therapy means he understands the body deeply, and his athletic career means he understands what it takes to push past your limits.",
    specialties: ['CrossFit', 'Strength & conditioning', 'Athletic performance', 'Injury prevention', 'Physical rehabilitation'],
  },
  {
    initials: 'EB',
    name: 'Elizabeth Busutil',
    title: 'Speech Language Pathologist & Fitness Coach',
    bio: "Elizabeth brings a rare combination of professional discipline and genuine heart to her coaching. A speech language pathologist by training and a fitness coach for over 10 years, she danced for the FIU Golden Dazzlers while earning her undergraduate degree. As a mother of two boys, she knows firsthand how life and a growing family can challenge your relationship with fitness — and that is exactly what makes her so effective at helping women reclaim their strength and unlock their potential.",
    specialties: ["Women's fitness", 'Pre & postnatal training', 'Weight management', 'Movement & mobility', 'Lifestyle coaching'],
  },
];

function CoachesSection() {
  return (
    <section className="py-20 px-4 sm:px-6 bg-landing-navy">
      <div className="max-w-5xl mx-auto">
        <h2 className="font-display text-3xl sm:text-4xl text-landing-bg text-center mb-4 tracking-editorial">Your coaches.</h2>
        <p className="text-landing-bg/60 text-center mb-12 max-w-xl mx-auto">Real coaches with real credentials — and real life experience that makes them different.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {coaches.map(c => (
            <motion.div
              key={c.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="bg-white/5 rounded-2xl p-6 sm:p-8 border border-white/10"
            >
              <div className="flex flex-col items-center text-center mb-6">
                <div className="w-24 h-24 rounded-full bg-landing-bg/10 flex items-center justify-center mb-4">
                  <span className="font-display text-2xl text-landing-bg font-semibold">{c.initials}</span>
                </div>
                <h3 className="font-display text-xl text-landing-bg font-semibold">{c.name}</h3>
                <p className="text-landing-gold italic text-sm mt-1">{c.title}</p>
                <span className="text-landing-bg/50 text-xs mt-2 bg-landing-bg/5 px-3 py-1 rounded-full">10+ years</span>
              </div>
              <p className="text-landing-bg/70 text-sm leading-relaxed mb-5">{c.bio}</p>
              <div className="flex flex-wrap gap-2">
                {c.specialties.map(s => (
                  <span key={s} className="text-xs text-landing-bg/60 border border-landing-bg/15 rounded-full px-3 py-1">{s}</span>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
        <div className="text-center mt-12">
          <p className="text-landing-bg/70 mb-4">Want to train with us?</p>
          <Button variant="outline" className="border-landing-gold text-landing-gold hover:bg-landing-gold/10 rounded-full" onClick={() => document.getElementById('signup')?.scrollIntoView({ behavior: 'smooth' })}>
            See coaching options
          </Button>
        </div>
      </div>
    </section>
  );
}

// --- FAQ ---
const faqs = [
  { q: 'Is Soul Fuel Society free to join?', a: 'Yes — joining is completely free. You get access to the calendar, fitness programs, macro tracker, fasting tracker, menstrual cycle tracker, and our e-book library at no cost. Premium coaching options are available for members who want personalized programs and direct access to Javier and Elizabeth.' },
  { q: 'What do I get with the free plan?', a: 'Free members get access to general fitness programs, all health and fitness trackers (macro, fasting, and menstrual cycle), our growing e-book library, and the Soul Fuel Society community. It is a complete wellness toolkit at no charge.' },
  { q: 'What is included in the paid coaching plans?', a: 'Paid members get a fully personalized workout program built around their goals and fitness level, direct 1:1 messaging with Javier and Elizabeth, and weekly program adjustments. In-person members also get face-to-face training sessions. Visit the app to see all available plans and pricing.' },
  { q: 'Do I need any equipment?', a: 'It depends on your program. Most programs include both gym and home-friendly modifications so you can train wherever you are. Javier and Elizabeth design every program with your available equipment in mind.' },
  { q: 'Are the coaches actually involved or is this AI-generated content?', a: 'Javier and Elizabeth are personally involved in every coaching relationship. Every personalized program is hand-built by them based on your individual goals, fitness level, and schedule — not generated by an algorithm.' },
  { q: 'Is the nutrition guidance safe to follow?', a: 'All nutrition content in Soul Fuel Society is provided for general wellness and fitness purposes only. It is not medical advice and is not a substitute for a licensed dietitian or physician. If you have specific dietary needs or a medical condition, we recommend consulting a healthcare professional.' },
  { q: 'How do I get in touch if I have more questions?', a: 'Use the contact form below — we read every message.' },
];

function FAQSection() {
  const { toast } = useToast();
  const [contactSent, setContactSent] = useState(false);
  const [contactLoading, setContactLoading] = useState(false);
  const contactSchema = z.object({
    name: z.string().trim().min(1, 'Name is required').max(100),
    email: z.string().trim().email('Invalid email').max(255),
    message: z.string().trim().min(1, 'Message is required').max(2000),
  });
  const { register, handleSubmit, formState: { errors }, reset } = useForm<z.infer<typeof contactSchema>>({ resolver: zodResolver(contactSchema) });

  const onContact = async (data: z.infer<typeof contactSchema>) => {
    setContactLoading(true);
    const { error } = await supabase.from('contact_submissions').insert({
      name: data.name,
      email: data.email,
      message: data.message,
    });
    setContactLoading(false);
    if (error) {
      toast({ title: 'Something went wrong', description: 'Please try again later.', variant: 'destructive' });
    } else {
      setContactSent(true);
      reset();
    }
  };

  return (
    <section className="py-20 px-4 sm:px-6 border-t border-landing-navy/10">
      <div className="max-w-3xl mx-auto">
        <h2 className="font-display text-3xl sm:text-4xl text-landing-navy text-center mb-12 tracking-editorial">Common questions.</h2>
        <Accordion type="single" collapsible className="mb-16">
          {faqs.map((f, i) => (
            <AccordionItem key={i} value={`faq-${i}`} className="border-landing-navy/10">
              <AccordionTrigger className="text-landing-navy text-left text-sm sm:text-base hover:no-underline py-5">{f.q}</AccordionTrigger>
              <AccordionContent className="text-landing-navy/60 text-sm leading-relaxed">{f.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>

        {/* Contact form */}
        <div className="bg-white/60 rounded-2xl p-6 sm:p-8 border border-landing-navy/10">
          <h3 className="font-display text-xl text-landing-navy text-center mb-2">Still have questions? We'd love to hear from you.</h3>
          {contactSent ? (
            <p className="text-center text-landing-navy/70 mt-6 py-4">Thanks for reaching out — we'll get back to you soon.</p>
          ) : (
            <form onSubmit={handleSubmit(onContact)} className="mt-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="contact-name" className="text-landing-navy text-sm">Name</Label>
                  <Input id="contact-name" {...register('name')} className="border-landing-navy/20 bg-white text-landing-navy" />
                  {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
                </div>
                <div className="space-y-1">
                  <Label htmlFor="contact-email" className="text-landing-navy text-sm">Email</Label>
                  <Input id="contact-email" type="email" {...register('email')} className="border-landing-navy/20 bg-white text-landing-navy" />
                  {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
                </div>
              </div>
              <div className="space-y-1">
                <Label htmlFor="contact-message" className="text-landing-navy text-sm">Message</Label>
                <Textarea id="contact-message" rows={4} {...register('message')} className="border-landing-navy/20 bg-white text-landing-navy" />
                {errors.message && <p className="text-sm text-destructive">{errors.message.message}</p>}
              </div>
              <Button type="submit" disabled={contactLoading} className="bg-landing-navy text-landing-bg hover:bg-landing-navy/90 rounded-full">
                {contactLoading ? 'Sending...' : 'Send message'}
              </Button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}

// --- Signup section ---
const signupSchema = z.object({
  fullName: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});
type SignupForm = z.infer<typeof signupSchema>;

function SignupSection() {
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'form' | 'waiver'>('form');
  const [formData, setFormData] = useState<SignupForm | null>(null);
  const { signUp } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const { register, handleSubmit, formState: { errors } } = useForm<SignupForm>({ resolver: zodResolver(signupSchema) });

  const onFormSubmit = (data: SignupForm) => {
    setFormData(data);
    setStep('waiver');
  };

  const onWaiverAccept = async () => {
    if (!formData) return;
    setLoading(true);
    const { error } = await signUp(formData.email, formData.password, formData.fullName);
    if (error) {
      setLoading(false);
      toast({ title: 'Signup failed', description: error.message, variant: 'destructive' });
      return;
    }
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('waiver_acceptances').insert({ user_id: user.id, waiver_version: 'March 2026 v2', ip_address: null, user_agent: navigator.userAgent });
        await supabase.from('profiles').update({ waiver_accepted: true, waiver_version: 'March 2026 v2' }).eq('id', user.id);
      }
    } catch (e) {
      console.error('Failed to record waiver acceptance:', e);
    }
    setLoading(false);
    toast({ title: 'Welcome to Soul Fuel Society!', description: 'Your account has been created.' });
    navigate('/community');
  };

  if (step === 'waiver') {
    return (
      <section id="signup" className="py-20 px-4 sm:px-6">
        <div className="max-w-lg mx-auto">
          <LiabilityWaiver onAccept={onWaiverAccept} loading={loading} pdfUrl={WAIVER_PDF_URL} />
        </div>
      </section>
    );
  }

  return (
    <section id="signup" className="py-20 px-4 sm:px-6 border-t border-landing-navy/10">
      <div className="max-w-md mx-auto text-center">
        <h2 className="font-display text-3xl text-landing-navy mb-2 tracking-editorial">Join Soul Fuel Society — it's free.</h2>
        <p className="text-landing-navy/60 mb-8">Create your account and start your journey today.</p>
        <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4 text-left">
          <div className="space-y-1">
            <Label htmlFor="signup-name" className="text-landing-navy text-sm">Full Name</Label>
            <Input id="signup-name" autoComplete="name" placeholder="John Doe" {...register('fullName')} className="border-landing-navy/20 bg-white text-landing-navy" />
            {errors.fullName && <p className="text-sm text-destructive">{errors.fullName.message}</p>}
          </div>
          <div className="space-y-1">
            <Label htmlFor="signup-email" className="text-landing-navy text-sm">Email</Label>
            <Input id="signup-email" type="email" autoComplete="email" placeholder="you@example.com" {...register('email')} className="border-landing-navy/20 bg-white text-landing-navy" />
            {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
          </div>
          <div className="space-y-1">
            <Label htmlFor="signup-password" className="text-landing-navy text-sm">Password</Label>
            <div className="relative">
              <Input id="signup-password" type={showPassword ? 'text' : 'password'} autoComplete="new-password" placeholder="••••••••" {...register('password')} className="pr-10 border-landing-navy/20 bg-white text-landing-navy" />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-landing-navy/40 hover:text-landing-navy" aria-label={showPassword ? 'Hide password' : 'Show password'}>
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
          </div>
          <div className="space-y-1">
            <Label htmlFor="signup-confirm" className="text-landing-navy text-sm">Confirm Password</Label>
            <Input id="signup-confirm" type="password" autoComplete="new-password" placeholder="••••••••" {...register('confirmPassword')} className="border-landing-navy/20 bg-white text-landing-navy" />
            {errors.confirmPassword && <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>}
          </div>
          <Button type="submit" size="lg" className="w-full bg-landing-navy text-landing-bg hover:bg-landing-navy/90 rounded-full">
            Continue
          </Button>
        </form>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-landing-navy/10" /></div>
          <div className="relative flex justify-center text-xs uppercase"><span className="bg-landing-bg px-2 text-landing-navy/40">or</span></div>
        </div>

        <Button
          type="button"
          variant="outline"
          size="lg"
          className="w-full border-landing-navy/20 text-landing-navy hover:bg-landing-navy/5 rounded-full"
          onClick={async () => {
            const { error } = await lovable.auth.signInWithOAuth('google', { redirect_uri: window.location.origin });
            if (error) toast({ title: 'Google sign-up failed', description: error.message, variant: 'destructive' });
          }}
        >
          <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Continue with Google
        </Button>

        <p className="mt-6 text-sm text-landing-navy/50">
          Already a member?{' '}
          <Link to="/login" className="font-medium text-landing-navy hover:underline">Sign in here</Link>
        </p>
      </div>
    </section>
  );
}

// --- Footer ---
function LandingFooter() {
  return (
    <footer className="py-8 px-4 border-t border-landing-navy/10 text-center">
      <p className="text-xs text-landing-navy/40">© 2025 Soul Fuel Society. All rights reserved.</p>
    </footer>
  );
}

// --- Main Landing Page ---
export default function Landing() {
  return (
    <div className="min-h-screen bg-landing-bg">
      <LandingNav />
      <HeroSection />
      <FeaturesSection />
      <CoachesSection />
      <FAQSection />
      <SignupSection />
      <LandingFooter />
    </div>
  );
}
