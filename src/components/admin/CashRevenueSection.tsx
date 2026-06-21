import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { supabase } from '@/integrations/supabase/client';
import { DollarSign, CalendarIcon } from 'lucide-react';
import { format, startOfMonth, endOfMonth } from 'date-fns';

// Convert an ISO timestamp to YYYY-MM-DD in America/New_York so sessions
// bucket by their local date, matching AdminRevenue's top panel.
const etDateString = (iso: string): string => {
  const d = new Date(iso);
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(d);
  const y = parts.find(p => p.type === 'year')?.value ?? '';
  const m = parts.find(p => p.type === 'month')?.value ?? '';
  const day = parts.find(p => p.type === 'day')?.value ?? '';
  return `${y}-${m}-${day}`;
};

type PaymentSource = 'cash' | 'session';

interface PaymentLogRow {
  id: string;
  source: PaymentSource;
  member_id: string;
  member_name: string;
  amount: number;
  date: string; // ISO
  method?: string;
  note?: string | null;
  coach_id: string;
  coach_name: string;
}

export function CashRevenueSection() {
  const navigate = useNavigate();
  const now = new Date();
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [monthRevenue, setMonthRevenue] = useState(0);
  const [payments, setPayments] = useState<PaymentLogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState<Date>(startOfMonth(now));
  const [dateTo, setDateTo] = useState<Date>(endOfMonth(now));

  const fetchPayments = async () => {
    // Cash payments
    const { data: allPayments } = await supabase
      .from('cash_payments')
      .select('*')
      .order('payment_date', { ascending: false });

    // Session payments (paid + completed sessions)
    const { data: sessionPayments } = await supabase
      .from('session_attendees')
      .select(`
        amount_charged,
        user_id,
        sessions!inner(id, scheduled_for, status, note, created_by)
      `)
      .eq('payment_received', true)
      .eq('sessions.status', 'completed');

    const cashRows = allPayments ?? [];
    const sessRows = (sessionPayments ?? []) as any[];

    // Collect all profile IDs
    const ids = new Set<string>();
    cashRows.forEach((p: any) => {
      if (p.user_id) ids.add(p.user_id);
      if (p.upgraded_by) ids.add(p.upgraded_by);
    });
    sessRows.forEach((s: any) => {
      if (s.user_id) ids.add(s.user_id);
      if (s.sessions?.created_by) ids.add(s.sessions.created_by);
    });

    const { data: profiles } = ids.size
      ? await supabase.from('profiles').select('id, full_name').in('id', Array.from(ids))
      : { data: [] as any[] };

    const nameMap = new Map((profiles ?? []).map((p: any) => [p.id, p.full_name || 'Unknown']));

    const unifiedRows: PaymentLogRow[] = [
      ...cashRows.map((p: any): PaymentLogRow => ({
        id: `cash:${p.id}`,
        source: 'cash',
        member_id: p.user_id,
        member_name: nameMap.get(p.user_id) || 'Unknown',
        amount: Number(p.amount),
        date: p.payment_date,
        method: p.payment_method,
        note: p.note,
        coach_id: p.upgraded_by,
        coach_name: nameMap.get(p.upgraded_by) || 'Unknown',
      })),
      ...sessRows.map((s: any): PaymentLogRow => ({
        id: `session:${s.sessions.id}:${s.user_id}`,
        source: 'session',
        member_id: s.user_id,
        member_name: nameMap.get(s.user_id) || 'Unknown',
        amount: Number(s.amount_charged ?? 0),
        date: s.sessions.scheduled_for,
        note: s.sessions.note,
        coach_id: s.sessions.created_by,
        coach_name: nameMap.get(s.sessions.created_by) || 'Unknown',
      })),
    ].sort((a, b) => (a.date < b.date ? 1 : -1));

    const total = unifiedRows.reduce((sum, r) => sum + r.amount, 0);
    const monthStart = format(startOfMonth(now), 'yyyy-MM-dd');
    const monthEnd = format(endOfMonth(now), 'yyyy-MM-dd');
    const thisMonth = unifiedRows
      .filter(r => {
        const d = r.source === 'session' ? etDateString(r.date) : r.date.slice(0, 10);
        return d >= monthStart && d <= monthEnd;
      })
      .reduce((sum, r) => sum + r.amount, 0);

    setTotalRevenue(total);
    setMonthRevenue(thisMonth);
    setPayments(unifiedRows);
    setLoading(false);
  };

  useEffect(() => {
    fetchPayments();

    const channel = supabase
      .channel('revenue-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cash_payments' }, () => fetchPayments())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'session_attendees' }, () => fetchPayments())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sessions' }, () => fetchPayments())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fromStr = format(dateFrom, 'yyyy-MM-dd');
  const toStr = format(dateTo, 'yyyy-MM-dd');
  const filteredPayments = payments.filter(p => {
    const d = p.source === 'session' ? etDateString(p.date) : p.date.slice(0, 10);
    return d >= fromStr && d <= toStr;
  });

  const methodLabel = (m?: string) => {
    if (m === 'bank_transfer') return 'Bank Transfer';
    if (m === 'cash') return 'Cash';
    return 'Other';
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Cash Revenue</h2>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3 md:gap-4">
        <Card>
          <CardContent className="p-4 md:p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-2xl md:text-3xl font-bold">
                  {loading ? '–' : `$${totalRevenue.toLocaleString()}`}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Total revenue</p>
              </div>
              <DollarSign className="w-5 h-5 text-chart-2 mt-1" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 md:p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-2xl md:text-3xl font-bold">
                  {loading ? '–' : `$${monthRevenue.toLocaleString()}`}
                </p>
                <p className="text-xs text-muted-foreground mt-1">This month</p>
              </div>
              <DollarSign className="w-5 h-5 text-primary mt-1" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filterable Table */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <CardTitle className="text-sm">Payment Log</CardTitle>
            <div className="flex items-center gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="text-xs gap-1.5 h-8">
                    <CalendarIcon className="w-3.5 h-3.5" />
                    {format(dateFrom, 'MMM d')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dateFrom}
                    onSelect={d => d && setDateFrom(d)}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
              <span className="text-xs text-muted-foreground">to</span>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="text-xs gap-1.5 h-8">
                    <CalendarIcon className="w-3.5 h-3.5" />
                    {format(dateTo, 'MMM d')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <Calendar
                    mode="single"
                    selected={dateTo}
                    onSelect={d => d && setDateTo(d)}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 text-xs text-muted-foreground font-medium">Member</th>
                  <th className="text-left py-2 text-xs text-muted-foreground font-medium">Amount</th>
                  <th className="text-left py-2 text-xs text-muted-foreground font-medium hidden sm:table-cell">Date</th>
                  <th className="text-left py-2 text-xs text-muted-foreground font-medium hidden md:table-cell">Type</th>
                  <th className="text-left py-2 text-xs text-muted-foreground font-medium hidden lg:table-cell">Details</th>
                  <th className="text-left py-2 text-xs text-muted-foreground font-medium hidden md:table-cell">Coach</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-muted-foreground text-xs">Loading...</td>
                  </tr>
                ) : filteredPayments.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-muted-foreground text-xs">No payments found in this date range.</td>
                  </tr>
                ) : (
                  filteredPayments.map(p => {
                    const details = p.source === 'cash'
                      ? [methodLabel(p.method), p.note].filter(Boolean).join(' — ')
                      : (p.note || '—');
                    return (
                      <tr key={p.id} className="border-b border-border/50">
                        <td className="py-2.5">
                          <button
                            onClick={() => navigate(`/admin/members/${p.member_id}`)}
                            className="text-sm font-medium text-primary hover:underline text-left"
                          >
                            {p.member_name}
                          </button>
                        </td>
                        <td className="py-2.5 text-sm">${p.amount.toFixed(2)}</td>
                        <td className="py-2.5 text-xs text-muted-foreground hidden sm:table-cell">
                          {format(new Date(p.date), 'MMM d, yyyy')}
                        </td>
                        <td className="py-2.5 hidden md:table-cell">
                          {p.source === 'session' ? (
                            <Badge variant="outline" className="text-[10px] border-primary/40 text-primary bg-primary/5">
                              Session
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px]">Cash</Badge>
                          )}
                        </td>
                        <td className="py-2.5 text-xs text-muted-foreground hidden lg:table-cell max-w-[200px] truncate">
                          {details || '—'}
                        </td>
                        <td className="py-2.5 text-xs text-muted-foreground hidden md:table-cell">
                          {p.coach_name}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
