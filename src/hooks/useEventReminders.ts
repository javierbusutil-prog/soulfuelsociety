import { useEffect, useRef, useCallback } from 'react';
import { Event } from '@/types/database';
import { toast } from '@/hooks/use-toast';
import { differenceInMinutes, format } from 'date-fns';

interface ExpandedEvent extends Event {
  occurrenceDate: Date;
}

const REMINDER_MINUTES = 15; // Remind 15 minutes before event
const CHECK_INTERVAL = 60000; // Check every minute
const NOTIFIED_KEY = 'notified_events';

// Get already notified event IDs from localStorage
const getNotifiedEvents = (): Set<string> => {
  try {
    const stored = localStorage.getItem(NOTIFIED_KEY);
    return stored ? new Set(JSON.parse(stored)) : new Set();
  } catch {
    return new Set();
  }
};

// Save notified event ID to localStorage
const markEventNotified = (eventId: string, occurrenceDate: Date) => {
  const notified = getNotifiedEvents();
  const key = `${eventId}_${occurrenceDate.toISOString()}`;
  notified.add(key);
  
  // Keep only last 100 entries to prevent storage bloat
  const entries = Array.from(notified);
  if (entries.length > 100) {
    localStorage.setItem(NOTIFIED_KEY, JSON.stringify(entries.slice(-100)));
  } else {
    localStorage.setItem(NOTIFIED_KEY, JSON.stringify(entries));
  }
};

// Check if event was already notified
const wasEventNotified = (eventId: string, occurrenceDate: Date): boolean => {
  const key = `${eventId}_${occurrenceDate.toISOString()}`;
  return getNotifiedEvents().has(key);
};

// Request browser notification permission
export const requestNotificationPermission = async (): Promise<boolean> => {
  if (!('Notification' in window)) {
    return false;
  }
  
  if (Notification.permission === 'granted') {
    return true;
  }
  
  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }
  
  return false;
};

// Show browser notification
const showBrowserNotification = (title: string, body: string) => {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(title, {
      body,
      icon: '/favicon.ico',
      tag: 'event-reminder',
    });
    return true;
  }
  return false;
};

// Show toast notification as fallback
const showToastNotification = (title: string, description: string) => {
  toast({
    title: `⏰ ${title}`,
    description,
    duration: 10000,
  });
};

interface ExpandedEvent extends Event {
  occurrenceDate: Date;
}

export const useEventReminders = (events: ExpandedEvent[]) => {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const hasRequestedPermission = useRef(false);

  // Request permission on first use
  useEffect(() => {
    if (!hasRequestedPermission.current) {
      hasRequestedPermission.current = true;
      requestNotificationPermission();
    }
  }, []);

  const checkUpcomingEvents = useCallback(() => {
    const now = new Date();
    
    events.forEach((event) => {
      const eventTime = new Date(event.occurrenceDate);
      // Set the actual time from start_datetime
      const originalTime = new Date(event.start_datetime);
      eventTime.setHours(originalTime.getHours(), originalTime.getMinutes(), 0, 0);
      
      const minutesUntilEvent = differenceInMinutes(eventTime, now);
      
      // Check if event is coming up within reminder window and hasn't been notified
      if (
        minutesUntilEvent > 0 &&
        minutesUntilEvent <= REMINDER_MINUTES &&
        !wasEventNotified(event.id, event.occurrenceDate)
      ) {
        const timeStr = format(eventTime, 'h:mm a');
        const title = `Upcoming: ${event.title}`;
        const body = `Starting at ${timeStr} (in ${minutesUntilEvent} minute${minutesUntilEvent === 1 ? '' : 's'})`;
        
        // Try browser notification first, fall back to toast
        const browserNotified = showBrowserNotification(title, body);
        if (!browserNotified) {
          showToastNotification(event.title, body);
        }
        
        markEventNotified(event.id, event.occurrenceDate);
      }
    });
  }, [events]);

  // Set up periodic check
  useEffect(() => {
    // Initial check
    checkUpcomingEvents();
    
    // Set up interval
    intervalRef.current = setInterval(checkUpcomingEvents, CHECK_INTERVAL);
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [checkUpcomingEvents]);

  return { checkUpcomingEvents };
};
