import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { startOfWeek, format } from 'date-fns';
import { toast } from '@/hooks/use-toast';
import { BookOpen, Check } from 'lucide-react';

interface Reflection {
  id: string;
  protein_consistency: number;
  energy_rating: number;
  cravings_intensity: number;
  notes: string | null;
}

const proteinLabels = ['Rarely hit goal', 'Some days', 'About half', 'Most days', 'Every day'];
const energyLabels = ['Very low', 'Low', 'Moderate', 'Good', 'Great'];
const cravingsLabels = ['No cravings', 'Mild', 'Moderate', 'Strong', 'Intense'];

export function WeeklyReflection() {
  const { user } = useAuth();
  const [reflection, setReflection] = useState<Reflection | null>(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [protein, setProtein] = useState(3);
  const [energy, setEnergy] = useState(3);
  const [cravings, setCravings] = useState(3);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');

  const fetchReflection = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from('weekly_reflections')
      .select('*')
      .eq('user_id', user.id)
      .eq('week_start', weekStart)
      .maybeSingle();
    if (data) {
      const r = data as unknown as Reflection;
      setReflection(r);
      setProtein(r.protein_consistency);
      setEnergy(r.energy_rating);
      setCravings(r.cravings_intensity);
      setNotes(r.notes || '');
    }
    setLoading(false);
  }, [user, weekStart]);

  useEffect(() => { fetchReflection(); }, [fetchReflection]);

  const save = async () => {
    if (!user) return;
    setSaving(true);
    const payload = {
      user_id: user.id,
      week_start: weekStart,
      protein_consistency: protein,
      energy_rating: energy,
      cravings_intensity: cravings,
      notes: notes || null,
    };

    if (reflection) {
      await supabase.from('weekly_reflections').update(payload as any).eq('id', reflection.id);
    } else {
      await supabase.from('weekly_reflections').insert(payload as any);
    }
    toast({ title: 'Reflection saved', description: 'Your weekly check-in has been recorded.' });
    setSaving(false);
    setOpen(false);
    fetchReflection();
  };

  if (loading) return null;

  // Show a compact summary if already filled
  if (reflection && !open) {
    return (
      <Card className="border-success/20 bg-success/5">
        <CardContent className="py-4 px-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Check className="w-4 h-4 text-success" />
              <span className="text-sm font-medium">Weekly reflection complete</span>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setOpen(true)} className="text-xs">
              Edit
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!open) {
    return (
      <Card className="border-accent/20">
        <CardContent className="py-4 px-4">
          <button
            onClick={() => setOpen(true)}
            className="flex items-center gap-3 w-full text-left"
          >
            <div className="w-9 h-9 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
              <BookOpen className="w-4 h-4 text-accent" />
            </div>
            <div>
              <p className="text-sm font-medium">Weekly Reflection</p>
              <p className="text-xs text-muted-foreground">Take a moment to check in with yourself</p>
            </div>
          </button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-sans font-semibold tracking-normal">Weekly Reflection</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <SliderField
          label="Protein consistency this week"
          value={protein}
          onChange={setProtein}
          labels={proteinLabels}
        />
        <SliderField
          label="Overall energy level"
          value={energy}
          onChange={setEnergy}
          labels={energyLabels}
        />
        <SliderField
          label="Cravings intensity"
          value={cravings}
          onChange={setCravings}
          labels={cravingsLabels}
        />

        <div className="space-y-2">
          <label className="text-sm font-medium">Notes (optional)</label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Anything you noticed this week…"
            rows={2}
            className="resize-none text-sm"
          />
        </div>

        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setOpen(false)} className="flex-1">
            Cancel
          </Button>
          <Button size="sm" onClick={save} disabled={saving} className="flex-1">
            {saving ? 'Saving…' : 'Save Reflection'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function SliderField({ label, value, onChange, labels }: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  labels: string[];
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">{label}</label>
        <span className="text-xs text-muted-foreground">{labels[value - 1]}</span>
      </div>
      <Slider min={1} max={5} step={1} value={[value]} onValueChange={([v]) => onChange(v)} />
    </div>
  );
}
