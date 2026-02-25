import { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Heart, ArrowLeft, AlertTriangle, ChevronRight, PlayCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Movement } from '@/types/movements';

interface Props {
  movement: Movement;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onClose: () => void;
}

const levelColors: Record<string, string> = {
  beginner: 'bg-success/20 text-success border-success/30',
  intermediate: 'bg-warning/20 text-warning border-warning/30',
  advanced: 'bg-destructive/20 text-destructive border-destructive/30',
};

function BulletList({ items, title, icon }: { items: string[]; title: string; icon?: React.ReactNode }) {
  if (!items || items.length === 0) return null;
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold flex items-center gap-1.5">{icon}{title}</h3>
      <ul className="space-y-1.5">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
            <ChevronRight className="w-3.5 h-3.5 mt-0.5 shrink-0 text-accent" />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function MovementDetailView({ movement, isFavorite, onToggleFavorite, onClose }: Props) {
  const isEmbedUrl = movement.video_url?.includes('youtube') || movement.video_url?.includes('vimeo');
  const isDirectVideo = movement.video_url && !isEmbedUrl;

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button onClick={onClose} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <button
          onClick={onToggleFavorite}
          className={cn('transition-colors', isFavorite ? 'text-accent' : 'text-muted-foreground hover:text-foreground')}
        >
          <Heart className={cn('w-5 h-5', isFavorite && 'fill-current')} />
        </button>
      </div>

      {/* Video / Thumbnail */}
      {movement.video_url ? (
        <div className="rounded-xl overflow-hidden bg-secondary aspect-video">
          {isEmbedUrl ? (
            <iframe
              src={movement.video_url.replace('watch?v=', 'embed/')}
              className="w-full h-full"
              allowFullScreen
              title={movement.name}
            />
          ) : (
            <video
              src={movement.video_url}
              controls
              poster={movement.thumbnail_url || undefined}
              className="w-full h-full object-cover"
            />
          )}
        </div>
      ) : movement.thumbnail_url ? (
        <div className="rounded-xl overflow-hidden bg-secondary aspect-video relative">
          <img src={movement.thumbnail_url} alt={movement.name} className="w-full h-full object-cover" />
          <div className="absolute inset-0 flex items-center justify-center bg-foreground/10">
            <PlayCircle className="w-12 h-12 text-background/80" />
          </div>
        </div>
      ) : (
        <div className="rounded-xl bg-secondary aspect-video flex items-center justify-center text-muted-foreground text-sm">
          No video available
        </div>
      )}

      {/* Title & meta */}
      <div>
        <h2 className="text-xl font-display tracking-editorial">{movement.name}</h2>
        <div className="flex flex-wrap gap-2 mt-2">
          <Badge variant="outline" className={levelColors[movement.difficulty] || ''}>
            {movement.difficulty}
          </Badge>
          <Badge variant="secondary">{movement.muscle_group}</Badge>
          <Badge variant="secondary">{movement.category}</Badge>
          <Badge variant="secondary">{movement.equipment}</Badge>
        </div>
        {movement.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {movement.tags.map(tag => (
              <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
            ))}
          </div>
        )}
      </div>

      {/* Content sections */}
      <div className="space-y-5">
        <BulletList items={movement.form_cues} title="Form Cues" />
        <BulletList items={movement.common_mistakes} title="Common Mistakes" />
        <BulletList items={movement.regressions} title="Modifications / Regressions" />
        <BulletList items={movement.progressions} title="Progressions" />
        
        {movement.safety_notes && (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-warning" />
              Safety Notes
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{movement.safety_notes}</p>
          </div>
        )}
      </div>
    </div>
  );
}
