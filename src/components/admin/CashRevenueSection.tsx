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
import { cn } from '@/lib/utils';

interface CashPaymentRow {
  id: string;
  user_id: string;
  amount: number;
  payment_date: string;
  payment_method: string;
  note: string | null;
  upgraded_by: string;
  created_at: string;
  member_name?: string;
  coach_name?: string;
}

export function CashRevenueSection() {
  const navigate = useNavigate();
  const now = new Date();
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [monthRevenue, setMonthRevenue] = useState(0);
  const [payments, setPayments] = useState<CashPaymentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState<Date>(startOfMonth(now));
  const [dateTo, setDateTo] = useState<Date>(endOfMonth(now));

  const fetchPayments = async () => {
    // Fetch all cash payments
    const { data: allPayments } = await supabase
      .from('cash_payments')
      .select('*')
      .order('payment_date', { ascending: false });

    if (!allPayments) {
      setLoading(false);
      return;
    }

    // Get unique user IDs (members + coaches)
    const memberIds = [...new Set(allPayments.map(p => p.user_id))];
    const coachIds = [...new Set(allPayments.map(p => p.upgraded_by))];
    const allIds = [...new Set([...memberIds, ...coachIds])];

    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', allIds);

    const nameMap = new Map(profiles?.map(p => [p.id, p.full_name || 'Unknown']) || []);

    const enriched: CashPaymentRow[] = allPayments.map(p => ({
      ...p,
      member_name: nameMap.get(p.user_id) || 'Unknown',
      coach_name: nameMap.get(p.upgraded_by) || 'Unknown',
    }));

    // Compute totals
    const total = allPayments.reduce((sum, p) => sum + Number(p.amount), 0);
    const monthStart = format(startOfMonth(now), 'yyyy-MM-dd');
    const monthEnd = format(endOfMonth(now), 'yyyy-MM-dd');
    const thisMonth = allPayments
      .filter(p => p.payment_date >= monthStart && p.payment_date <= monthEnd)
      .reduce((sum, p) => sum + Number(p.amount), 0);

    setTotalRevenue(total);
    setMonthRevenue(thisMonth);
    setPayments(enriched);
    setLoading(false);
  };

  useEffect(() => {
    fetchPayments();

    // Realtime subscription
    const channel = supabase
      .channel('cash-payments-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cash_payments' }, () => {
        fetchPayments();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fromStr = format(dateFrom, 'yyyy-MM-dd');
  const toStr = format(dateTo, 'yyyy-MM-dd');
  const filteredPayments = payments.filter(
    p => p.payment_date >= fromStr && p.payment_date <= toStr
  );

  const methodLabel = (m: string) => {
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
                <p className="text-xs text-muted-foreground mt-1">Total cash revenue</p>
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
                  <th className="text-left py-2 text-xs text-muted-foreground font-medium hidden md:table-cell">Method</th>
                  <th className="text-left py-2 text-xs text-muted-foreground font-medium hidden lg:table-cell">Note</th>
                  <th className="text-left py-2 text-xs text-muted-foreground font-medium hidden md:table-cell">Upgraded By</th>
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
                  filteredPayments.map(p => (
                    <tr key={p.id} className="border-b border-border/50">
                      <td className="py-2.5">
                        <button
                          onClick={() => navigate(`/admin/members/${p.user_id}`)}
                          className="text-sm font-medium text-primary hover:underline text-left"
                        >
                          {p.member_name}
                        </button>
                      </td>
                      <td className="py-2.5 text-sm">${Number(p.amount).toFixed(2)}</td>
                      <td className="py-2.5 text-xs text-muted-foreground hidden sm:table-cell">
                        {format(new Date(p.payment_date), 'MMM d, yyyy')}
                      </td>
                      <td className="py-2.5 hidden md:table-cell">
                        <Badge variant="outline" className="text-[10px]">{methodLabel(p.payment_method)}</Badge>
                      </td>
                      <td className="py-2.5 text-xs text-muted-foreground hidden lg:table-cell max-w-[200px] truncate">
                        {p.note || '—'}
                      </td>
                      <td className="py-2.5 text-xs text-muted-foreground hidden md:table-cell">
                        {p.coach_name}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
