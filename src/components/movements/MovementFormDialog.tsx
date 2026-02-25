import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Plus, X } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { MUSCLE_GROUPS, MOVEMENT_CATEGORIES, EQUIPMENT_OPTIONS, DIFFICULTY_LEVELS, COMMON_TAGS } from '@/types/movements';
import type { Movement } from '@/types/movements';

interface Props {
  onSubmit: (movement: Partial<Movement>) => Promise<any>;
  initial?: Movement;
  trigger?: React.ReactNode;
}

export function MovementFormDialog({ onSubmit, initial, trigger }: Props) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState(initial?.name || '');
  const [videoUrl, setVideoUrl] = useState(initial?.video_url || '');
  const [thumbnailUrl, setThumbnailUrl] = useState(initial?.thumbnail_url || '');
  const [muscleGroup, setMuscleGroup] = useState(initial?.muscle_group || 'full body');
  const [category, setCategory] = useState(initial?.category || 'mobility');
  const [equipment, setEquipment] = useState(initial?.equipment || 'bodyweight');
  const [difficulty, setDifficulty] = useState(initial?.difficulty || 'beginner');
  const [formCues, setFormCues] = useState(initial?.form_cues?.join('\n') || '');
  const [mistakes, setMistakes] = useState(initial?.common_mistakes?.join('\n') || '');
  const [regressions, setRegressions] = useState(initial?.regressions?.join('\n') || '');
  const [progressions, setProgressions] = useState(initial?.progressions?.join('\n') || '');
  const [safetyNotes, setSafetyNotes] = useState(initial?.safety_notes || '');
  const [tags, setTags] = useState<string[]>(initial?.tags || []);
  const [published, setPublished] = useState(initial?.published ?? false);

  const toArray = (text: string) => text.split('\n').map(s => s.trim()).filter(Boolean);

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast({ title: 'Name is required', variant: 'destructive' });
      return;
    }
    setSaving(true);
    const err = await onSubmit({
      name: name.trim(),
      video_url: videoUrl.trim() || null,
      thumbnail_url: thumbnailUrl.trim() || null,
      muscle_group: muscleGroup,
      category,
      equipment,
      difficulty,
      form_cues: toArray(formCues),
      common_mistakes: toArray(mistakes),
      regressions: toArray(regressions),
      progressions: toArray(progressions),
      safety_notes: safetyNotes.trim() || null,
      tags,
      published,
    });
    setSaving(false);
    if (!err) {
      toast({ title: initial ? 'Movement updated' : 'Movement created' });
      setOpen(false);
      if (!initial) {
        setName(''); setVideoUrl(''); setThumbnailUrl('');
        setFormCues(''); setMistakes(''); setRegressions('');
        setProgressions(''); setSafetyNotes(''); setTags([]);
      }
    }
  };

  const toggleTag = (tag: string) => {
    setTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button size="sm">
            <Plus className="w-4 h-4 mr-1.5" />
            Add Movement
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-sans">{initial ? 'Edit Movement' : 'Add Movement'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Movement Name *</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Romanian Deadlift" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Muscle Group</Label>
              <Select value={muscleGroup} onValueChange={setMuscleGroup}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MUSCLE_GROUPS.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MOVEMENT_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Equipment</Label>
              <Select value={equipment} onValueChange={setEquipment}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {EQUIPMENT_OPTIONS.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Difficulty</Label>
              <Select value={difficulty} onValueChange={setDifficulty}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DIFFICULTY_LEVELS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Video URL</Label>
            <Input value={videoUrl} onChange={e => setVideoUrl(e.target.value)} placeholder="https://..." />
          </div>
          <div>
            <Label>Thumbnail URL</Label>
            <Input value={thumbnailUrl} onChange={e => setThumbnailUrl(e.target.value)} placeholder="https://..." />
          </div>

          <div>
            <Label>Form Cues (one per line)</Label>
            <Textarea value={formCues} onChange={e => setFormCues(e.target.value)} rows={3} placeholder="Drive through your heels&#10;Keep chest proud" />
          </div>
          <div>
            <Label>Common Mistakes (one per line)</Label>
            <Textarea value={mistakes} onChange={e => setMistakes(e.target.value)} rows={3} placeholder="Rounding lower back&#10;Locking knees" />
          </div>
          <div>
            <Label>Regressions / Modifications (one per line)</Label>
            <Textarea value={regressions} onChange={e => setRegressions(e.target.value)} rows={2} placeholder="Use lighter weight&#10;Reduce range of motion" />
          </div>
          <div>
            <Label>Progressions (one per line)</Label>
            <Textarea value={progressions} onChange={e => setProgressions(e.target.value)} rows={2} placeholder="Add tempo&#10;Single leg variation" />
          </div>
          <div>
            <Label>Safety Notes</Label>
            <Textarea value={safetyNotes} onChange={e => setSafetyNotes(e.target.value)} rows={2} placeholder="Avoid if acute lower back pain..." />
          </div>

          <div>
            <Label className="mb-2 block">Tags</Label>
            <div className="flex flex-wrap gap-1.5">
              {COMMON_TAGS.map(tag => (
                <Badge
                  key={tag}
                  variant={tags.includes(tag) ? 'default' : 'outline'}
                  className="cursor-pointer text-xs"
                  onClick={() => toggleTag(tag)}
                >
                  {tag}
                  {tags.includes(tag) && <X className="w-3 h-3 ml-1" />}
                </Badge>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between py-2">
            <Label>Published (visible to users)</Label>
            <Switch checked={published} onCheckedChange={setPublished} />
          </div>

          <Button onClick={handleSubmit} disabled={saving} className="w-full">
            {saving ? 'Saving…' : initial ? 'Update Movement' : 'Create Movement'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
