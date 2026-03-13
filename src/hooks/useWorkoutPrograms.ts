import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { 
  WorkoutProgram, 
  WorkoutSessionTemplate, 
  UserProgramEnrollment,
  CalendarEvent,
  SessionContent
} from '@/types/workoutPrograms';
import { addDays, format, getDay, startOfWeek } from 'date-fns';
import { Json } from '@/integrations/supabase/types';

export function useWorkoutPrograms() {
  const { user, isAdmin } = useAuth();
  const [programs, setPrograms] = useState<WorkoutProgram[]>([]);
  const [enrollments, setEnrollments] = useState<UserProgramEnrollment[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPrograms = useCallback(async () => {
    const { data, error } = await supabase
      .from('workout_programs')
      .select('*')
      .order('created_at', { ascending: false });

    if (data && !error) {
      setPrograms(data as unknown as WorkoutProgram[]);
    }
    setLoading(false);
  }, []);

  const fetchEnrollments = useCallback(async () => {
    if (!user) return;

    const { data } = await supabase
      .from('user_program_enrollments')
      .select('*')
      .eq('user_id', user.id);

    if (data) {
      setEnrollments(data as unknown as UserProgramEnrollment[]);
    }
  }, [user]);

  useEffect(() => {
    fetchPrograms();
    if (user) {
      fetchEnrollments();
    }
  }, [user, fetchPrograms, fetchEnrollments]);

  const createProgram = async (program: Partial<WorkoutProgram>) => {
    const insertData = {
      title: program.title || '',
      description: program.description || null,
      cover_image_url: program.cover_image_url || null,
      weeks: program.weeks || 4,
      frequency_per_week: program.frequency_per_week || 3,
      schedule_mode: program.schedule_mode || 'admin_selected',
      admin_days_of_week: program.admin_days_of_week || null,
      published: program.published || false,
      created_by: user?.id || null,
      ebook_url: program.ebook_url || null,
    };
    
    const { data, error } = await supabase
      .from('workout_programs')
      .insert(insertData)
      .select()
      .single();

    if (data && !error) {
      setPrograms(prev => [data as unknown as WorkoutProgram, ...prev]);
      return data as unknown as WorkoutProgram;
    }
    throw error;
  };

  const updateProgram = async (id: string, updates: Partial<WorkoutProgram>) => {
    const { data, error } = await supabase
      .from('workout_programs')
      .update(updates as any)
      .eq('id', id)
      .select()
      .single();

    if (data && !error) {
      setPrograms(prev => prev.map(p => p.id === id ? data as unknown as WorkoutProgram : p));
      return data as unknown as WorkoutProgram;
    }
    throw error;
  };

  const deleteProgram = async (id: string) => {
    const { error } = await supabase
      .from('workout_programs')
      .delete()
      .eq('id', id);

    if (!error) {
      setPrograms(prev => prev.filter(p => p.id !== id));
    }
    throw error;
  };

  const isEnrolled = (programId: string) => {
    return enrollments.some(e => e.program_id === programId);
  };

  const getEnrollment = (programId: string) => {
    return enrollments.find(e => e.program_id === programId);
  };

  return {
    programs,
    enrollments,
    loading,
    isAdmin,
    createProgram,
    updateProgram,
    deleteProgram,
    isEnrolled,
    getEnrollment,
    refetchPrograms: fetchPrograms,
    refetchEnrollments: fetchEnrollments,
  };
}

export function useSessionTemplates(programId: string | null) {
  const [sessions, setSessions] = useState<WorkoutSessionTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSessions = useCallback(async () => {
    if (!programId) {
      setSessions([]);
      setLoading(false);
      return;
    }

    const { data } = await supabase
      .from('workout_session_templates')
      .select('*')
      .eq('program_id', programId)
      .order('week_number')
      .order('session_index');

    if (data) {
      setSessions(data.map(s => ({
        ...s,
        content_json: s.content_json as SessionContent || {}
      })) as WorkoutSessionTemplate[]);
    }
    setLoading(false);
  }, [programId]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const createSession = async (session: Partial<WorkoutSessionTemplate>) => {
    const insertData = {
      program_id: session.program_id!,
      week_number: session.week_number!,
      session_index: session.session_index!,
      title: session.title!,
      content_json: (session.content_json || {}) as Json,
    };
    
    const { data, error } = await supabase
      .from('workout_session_templates')
      .insert(insertData)
      .select()
      .single();

    if (data && !error) {
      const newSession = {
        ...data,
        content_json: data.content_json as SessionContent || {}
      } as WorkoutSessionTemplate;
      setSessions(prev => [...prev, newSession].sort((a, b) => 
        a.week_number - b.week_number || a.session_index - b.session_index
      ));
      return newSession;
    }
    throw error;
  };

  const updateSession = async (id: string, updates: Partial<WorkoutSessionTemplate>) => {
    const updateData: any = {};
    if (updates.title !== undefined) updateData.title = updates.title;
    if (updates.content_json !== undefined) updateData.content_json = updates.content_json as Json;
    if (updates.week_number !== undefined) updateData.week_number = updates.week_number;
    if (updates.session_index !== undefined) updateData.session_index = updates.session_index;
    
    const { data, error } = await supabase
      .from('workout_session_templates')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (data && !error) {
      const updatedSession = {
        ...data,
        content_json: data.content_json as SessionContent || {}
      } as WorkoutSessionTemplate;
      setSessions(prev => prev.map(s => s.id === id ? updatedSession : s));
      return updatedSession;
    }
    throw error;
  };

  const deleteSession = async (id: string) => {
    const { error } = await supabase
      .from('workout_session_templates')
      .delete()
      .eq('id', id);

    if (!error) {
      setSessions(prev => prev.filter(s => s.id !== id));
    }
  };

  return {
    sessions,
    loading,
    createSession,
    updateSession,
    deleteSession,
    refetch: fetchSessions,
  };
}

export function useCalendarEvents() {
  const { user } = useAuth();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEvents = useCallback(async () => {
    if (!user) {
      setEvents([]);
      setLoading(false);
      return;
    }

    const { data } = await supabase
      .from('calendar_events')
      .select('*')
      .eq('user_id', user.id)
      .order('event_date');

    if (data) {
      setEvents(data as CalendarEvent[]);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const toggleComplete = async (eventId: string) => {
    const event = events.find(e => e.id === eventId);
    if (!event) return;

    const { data, error } = await supabase
      .from('calendar_events')
      .update({
        completed: !event.completed,
        completed_at: !event.completed ? new Date().toISOString() : null,
      })
      .eq('id', eventId)
      .select()
      .single();

    if (data && !error) {
      setEvents(prev => prev.map(e => e.id === eventId ? data as CalendarEvent : e));
    }
  };

  const deleteEnrollmentEvents = async (enrollmentId: string) => {
    await supabase
      .from('calendar_events')
      .delete()
      .eq('enrollment_id', enrollmentId);

    setEvents(prev => prev.filter(e => e.enrollment_id !== enrollmentId));
  };

  return {
    events,
    loading,
    toggleComplete,
    deleteEnrollmentEvents,
    refetch: fetchEvents,
  };
}

export function useEnrollProgram() {
  const { user } = useAuth();

  const enrollInProgram = async (
    program: WorkoutProgram,
    sessions: WorkoutSessionTemplate[],
    startDate: Date,
    selectedDays?: number[]
  ) => {
    if (!user) throw new Error('Not authenticated');

    const daysOfWeek = program.schedule_mode === 'admin_selected' 
      ? program.admin_days_of_week 
      : selectedDays;

    if (!daysOfWeek || daysOfWeek.length === 0) {
      throw new Error('No days selected');
    }

    // Create enrollment
    const { data: enrollment, error: enrollError } = await supabase
      .from('user_program_enrollments')
      .insert({
        user_id: user.id,
        program_id: program.id,
        start_date: format(startDate, 'yyyy-MM-dd'),
        selected_days_of_week: selectedDays || null,
      })
      .select()
      .single();

    if (enrollError) throw enrollError;

    // Generate calendar events
    type CalendarEventInsert = {
      user_id: string;
      event_date: string;
      event_type: string;
      title: string;
      description: string;
      linked_program_id: string;
      linked_session_id: string;
      enrollment_id: string;
      completed: boolean;
      reminder_enabled: boolean;
    };
    
    const calendarEvents: CalendarEventInsert[] = [];
    
    // Sort sessions by week and index
    const sortedSessions = [...sessions].sort((a, b) => 
      a.week_number - b.week_number || a.session_index - b.session_index
    );

    // Anchor to the start of the week containing startDate so day-of-week math is consistent
    const weekAnchor = startOfWeek(startDate, { weekStartsOn: 0 });

    // For each week of the program
    for (let week = 1; week <= program.weeks; week++) {
      const weekStart = addDays(weekAnchor, (week - 1) * 7);
      
      // Get sessions for this week
      const weekSessions = sortedSessions.filter(s => s.week_number === week);
      
      // Map sessions to days of week
      const sortedDays = [...daysOfWeek].sort((a, b) => a - b);
      
      sortedDays.forEach((day, index) => {
        const session = weekSessions[index];
        if (!session) return;

        // Calculate the date for this day of week within this week
        const eventDate = addDays(weekStart, day);

        // Build description with exercise details
        let description = `Week ${week} - ${program.title}`;
        const content = session.content_json;
        if (content?.exercises && content.exercises.length > 0) {
          const exerciseLines = content.exercises.map(ex => {
            let line = ex.name;
            if (ex.sets && ex.reps) line += ` — ${ex.sets}×${ex.reps}`;
            return line;
          });
          description += '\n\n' + exerciseLines.join('\n');
        }
        if (content?.notes) {
          description += '\n\n' + content.notes;
        }

        calendarEvents.push({
          user_id: user.id,
          event_date: format(eventDate, 'yyyy-MM-dd'),
          event_type: 'workout',
          title: session.title,
          description,
          linked_program_id: program.id,
          linked_session_id: session.id,
          enrollment_id: enrollment.id,
          completed: false,
          reminder_enabled: true,
        });
      });
    }

    // Insert all calendar events
    if (calendarEvents.length > 0) {
      const { error: eventsError } = await supabase
        .from('calendar_events')
        .insert(calendarEvents);

      if (eventsError) throw eventsError;
    }

    return {
      enrollment,
      eventsCreated: calendarEvents.length,
    };
  };

  const unenrollFromProgram = async (enrollmentId: string) => {
    if (!user) throw new Error('Not authenticated');

    // Delete enrollment (cascade will delete events)
    const { error } = await supabase
      .from('user_program_enrollments')
      .delete()
      .eq('id', enrollmentId);

    if (error) throw error;
  };

  return {
    enrollInProgram,
    unenrollFromProgram,
  };
}
