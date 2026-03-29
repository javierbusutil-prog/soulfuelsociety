import { useState, useRef, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Leaf } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

interface NutritionDisclaimerDialogProps {
  open: boolean;
  onAccepted: () => void;
}

export function NutritionDisclaimerDialog({ open, onAccepted }: NutritionDisclaimerDialogProps) {
  const { user, refreshProfile } = useAuth();
  const [scrolledToBottom, setScrolledToBottom] = useState(false);
  const [checked, setChecked] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleScroll = useCallback(() => {
    const el = containerRef.current;
    if (el && el.scrollTop + el.clientHeight >= el.scrollHeight - 10) {
      setScrolledToBottom(true);
    }
  }, []);

  const handleAccept = async () => {
    if (!user || !checked) return;
    setSubmitting(true);
    try {
      const { error: acceptError } = await supabase
        .from('disclaimer_acceptances')
        .insert({
          user_id: user.id,
          disclaimer_type: 'nutrition_v1',
          user_agent: navigator.userAgent,
        });

      if (acceptError) throw acceptError;

      const { error: profileError } = await supabase
        .from('profiles')
        .update({ nutrition_disclaimer_accepted: true })
        .eq('id', user.id);

      if (profileError) throw profileError;

      await refreshProfile();
      onAccepted();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent
        className="max-w-lg w-[95vw] max-h-[95vh] flex flex-col p-0 gap-0"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader className="p-6 pb-3 text-center">
          <div className="flex justify-center mb-3">
            <div className="w-14 h-14 rounded-full bg-accent/20 flex items-center justify-center">
              <Leaf className="w-7 h-7 text-primary" />
            </div>
          </div>
          <DialogTitle className="text-xl font-bold text-foreground">
            A note about nutrition content
          </DialogTitle>
        </DialogHeader>

        <div
          ref={containerRef}
          onScroll={handleScroll}
          className="mx-6 border rounded-lg p-4 overflow-y-auto flex-1"
          style={{ maxHeight: '45vh' }}
        >
          <div className="space-y-4 text-sm text-muted-foreground leading-relaxed">
            <p>
              The nutrition tools and general wellness guidance available in Soul Fuel Society — including the macro tracker, fasting tracker, and any nutritional suggestions from our coaches — are provided for general fitness and wellness purposes only.
            </p>
            <p>
              This content is not medical advice. It is not a substitute for the services of a licensed registered dietitian, nutritionist, or physician. Our coaches are not licensed dietitians or nutritionists.
            </p>
            <p>
              Macro targets, calorie suggestions, and nutritional guidance provided through this app are general starting points based on common fitness principles. They are not personalized medical nutrition therapy and should not be treated as such.
            </p>
            <p>
              If you have any of the following, please consult a licensed medical professional or registered dietitian before using the nutrition features of this app:
            </p>
            <ul className="list-disc list-inside space-y-1 pl-2">
              <li>A diagnosed eating disorder or history of disordered eating</li>
              <li>Diabetes, kidney disease, or any metabolic condition</li>
              <li>A cardiovascular condition</li>
              <li>Pregnancy or postpartum recovery</li>
              <li>Any other condition that affects your dietary needs</li>
            </ul>
            <p>
              By continuing, you acknowledge that you understand the general wellness nature of this content and agree to use it responsibly alongside guidance from qualified medical professionals where appropriate.
            </p>
          </div>
        </div>

        <div className="p-6 pt-4 space-y-4">
          <div className="flex items-start gap-3">
            <Checkbox
              id="nutrition-disclaimer"
              checked={checked}
              onCheckedChange={(v) => setChecked(v === true)}
              disabled={!scrolledToBottom}
              className="mt-0.5"
            />
            <label
              htmlFor="nutrition-disclaimer"
              className={`text-xs leading-relaxed ${
                scrolledToBottom ? 'text-foreground cursor-pointer' : 'text-muted-foreground/50'
              }`}
            >
              I understand that nutrition content in Soul Fuel Society is for general wellness purposes only and is not medical or dietitian advice.
            </label>
          </div>

          <Button
            className="w-full"
            disabled={!checked || submitting}
            onClick={handleAccept}
          >
            {submitting ? 'Processing...' : 'Continue'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
