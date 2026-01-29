import { motion } from 'framer-motion';
import { Calendar, Clock, Users, CheckCircle, Settings } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { WorkoutProgram } from '@/types/workoutPrograms';
import { DAYS_OF_WEEK } from '@/types/workoutPrograms';

interface ProgramCardProps {
  program: WorkoutProgram;
  isEnrolled?: boolean;
  isAdmin?: boolean;
  onView: () => void;
  onEdit?: () => void;
  index?: number;
}

export function ProgramCard({ 
  program, 
  isEnrolled, 
  isAdmin, 
  onView, 
  onEdit,
  index = 0 
}: ProgramCardProps) {
  const daysLabel = program.admin_days_of_week
    ?.map(d => DAYS_OF_WEEK.find(day => day.value === d)?.short)
    .join(', ');

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Card 
        className="overflow-hidden bg-card/50 border-border/50 hover:bg-card/70 transition-colors cursor-pointer"
        onClick={onView}
      >
        {/* Cover Image */}
        {program.cover_image_url ? (
          <div 
            className="h-32 bg-cover bg-center" 
            style={{ backgroundImage: `url(${program.cover_image_url})` }}
          />
        ) : (
          <div className="h-32 bg-gradient-to-br from-primary/20 to-secondary flex items-center justify-center">
            <Calendar className="w-12 h-12 text-primary/50" />
          </div>
        )}

        <div className="p-4">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                {!program.published && isAdmin && (
                  <Badge variant="secondary" className="text-xs">Draft</Badge>
                )}
                {isEnrolled && (
                  <Badge className="bg-success/20 text-success border-success/30 text-xs">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Enrolled
                  </Badge>
                )}
              </div>
              <h3 className="font-semibold truncate">{program.title}</h3>
            </div>
            {isAdmin && onEdit && (
              <Button
                variant="ghost"
                size="icon"
                className="shrink-0 h-8 w-8"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit();
                }}
              >
                <Settings className="w-4 h-4" />
              </Button>
            )}
          </div>

          {program.description && (
            <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
              {program.description}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {program.weeks} weeks
            </span>
            <span className="flex items-center gap-1">
              <Users className="w-3.5 h-3.5" />
              {program.frequency_per_week}x/week
            </span>
            {program.schedule_mode === 'admin_selected' && daysLabel && (
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                {daysLabel}
              </span>
            )}
            {program.schedule_mode === 'user_selected' && (
              <Badge variant="outline" className="text-xs">
                Choose your days
              </Badge>
            )}
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
