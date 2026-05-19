import { format, parseISO, differenceInCalendarDays } from 'date-fns';

export function getDateLabel(dateStr: string): string {
  const d = parseISO(dateStr);
  const diff = differenceInCalendarDays(new Date(), d);
  if (diff === 1) return 'Yesterday';
  return format(d, 'EEE, MMM d');
}