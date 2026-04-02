import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { DollarSign, Users, TrendingUp, Wallet } from 'lucide-react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { CashRevenueSection } from '@/components/admin/CashRevenueSection';

interface SubRow {
  id: string;
  customer_name: string;
  customer_email: string;
  amount: number;
  status: string;
  current_period_end: string;
  created: string;
}

interface RevenueData {
  total_revenue_this_month: number;
  total_active_subscriptions: number;
  avg_revenue_per_member: number;
  monthly_revenue: { month: string; revenue: number }[];
  subscriptions: SubRow[];
}

export default function AdminRevenue() {
  const [data, setData] = useState<RevenueData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [cashTotal, setCashTotal] = useState(0);
  const [cashThisMonth, setCashThisMonth] = useState(0);
  const [cashLoading, setCashLoading] = useState(true);

  useEffect(() => {
    fetchRevenue();
    fetchCashTotals();

    const channel = supabase
      .channel('revenue-cash-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cash_payments' }, () => {
        fetchCashTotals();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchRevenue = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: result, error: fnError } = await supabase.functions.invoke('admin-revenue');
      if (fnError) throw fnError;
      if (result?.error) throw new Error(result.error);
      setData(result);
    } catch (e: any) {
      console.error('Revenue fetch error:', e);
      setError(e.message || 'Failed to load revenue data');
    } finally {
      setLoading(false);
    }
  };

  const fetchCashTotals = async () => {
    const { data: payments } = await supabase.from('cash_payments').select('amount, payment_date');
    if (payments) {
      const total = payments.reduce((sum, p) => sum + Number(p.amount), 0);
      const now = new Date();
      const monthStart = format(startOfMonth(now), 'yyyy-MM-dd');
      const monthEnd = format(endOfMonth(now), 'yyyy-MM-dd');
      const thisMonth = payments
        .filter(p => p.payment_date >= monthStart && p.payment_date <= monthEnd)
        .reduce((sum, p) => sum + Number(p.amount), 0);
      setCashTotal(total);
      setCashThisMonth(thisMonth);
    }
    setCashLoading(false);
  };

  const filteredSubs = data?.subscriptions.filter(s => {
    if (statusFilter === 'all') return true;
    return s.status === statusFilter;
  }) || [];

  const getStatusBadge = (status: string) => {
    if (status === 'active') return <Badge className="bg-chart-2/15 text-chart-2 border-chart-2/30 text-[10px]">Active</Badge>;
    if (status === 'past_due') return <Badge className="bg-yellow-500/15 text-yellow-600 border-yellow-500/30 text-[10px]">Past due</Badge>;
    if (status === 'canceled') return <Badge className="bg-destructive/15 text-destructive border-destructive/30 text-[10px]">Cancelled</Badge>;
    return <Badge variant="secondary" className="text-[10px]">{status}</Badge>;
  };

  const stripeThisMonth = data?.total_revenue_this_month || 0;
  const combinedThisMonth = stripeThisMonth + cashThisMonth;
  const allLoaded = !loading && !cashLoading;

  return (
    <AdminLayout title="Revenue">
      <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
        {/* Total Revenue Panel */}
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-3xl md:text-4xl font-bold">
                  {allLoaded ? `$${combinedThisMonth.toLocaleString()}` : '–'}
                </p>
                <p className="text-sm text-muted-foreground mt-1">Total revenue this month</p>
                {allLoaded && (
                  <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <DollarSign className="w-3 h-3" /> Stripe: ${stripeThisMonth.toLocaleString()}
                    </span>
                    <span className="flex items-center gap-1">
                      <Wallet className="w-3 h-3" /> Cash: ${cashThisMonth.toLocaleString()}
                    </span>
                  </div>
                )}
              </div>
              <TrendingUp className="w-6 h-6 text-primary mt-1" />
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : error ? (
          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-sm text-destructive mb-3">{error}</p>
              <button onClick={fetchRevenue} className="text-sm text-primary underline">Retry</button>
            </CardContent>
          </Card>
        ) : data ? (
          <>
            {/* Stripe Metric Cards */}
            <h2 className="text-lg font-semibold">Stripe Revenue</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-2xl font-bold">${data.total_revenue_this_month.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground mt-1">Stripe this month</p>
                    </div>
                    <DollarSign className="w-5 h-5 text-chart-2" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-2xl font-bold">{data.total_active_subscriptions}</p>
                      <p className="text-xs text-muted-foreground mt-1">Active subscriptions</p>
                    </div>
                    <Users className="w-5 h-5 text-primary" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-2xl font-bold">${data.avg_revenue_per_member}</p>
                      <p className="text-xs text-muted-foreground mt-1">Avg per member</p>
                    </div>
                    <TrendingUp className="w-5 h-5 text-chart-4" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Revenue Chart */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Monthly Stripe Revenue (Last 6 Months)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.monthly_revenue}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                      <YAxis tick={{ fontSize: 11 }} className="fill-muted-foreground" tickFormatter={v => `$${v}`} />
                      <Tooltip
                        formatter={(value: number) => [`$${value.toLocaleString()}`, 'Revenue']}
                        contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid hsl(var(--border))' }}
                      />
                      <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Subscriptions Table */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">Subscriptions</CardTitle>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[130px] h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All statuses</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="past_due">Past due</SelectItem>
                      <SelectItem value="canceled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-2 text-xs text-muted-foreground font-medium">Member</th>
                        <th className="text-left py-2 text-xs text-muted-foreground font-medium hidden sm:table-cell">Amount</th>
                        <th className="text-left py-2 text-xs text-muted-foreground font-medium hidden md:table-cell">Next billing</th>
                        <th className="text-right py-2 text-xs text-muted-foreground font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredSubs.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="py-8 text-center text-muted-foreground text-xs">No subscriptions found.</td>
                        </tr>
                      ) : (
                        filteredSubs.map(sub => (
                          <tr key={sub.id} className="border-b border-border/50">
                            <td className="py-2.5">
                              <p className="font-medium text-sm">{sub.customer_name}</p>
                              <p className="text-[11px] text-muted-foreground">{sub.customer_email}</p>
                            </td>
                            <td className="py-2.5 hidden sm:table-cell">
                              <span className="text-sm">${sub.amount}/mo</span>
                            </td>
                            <td className="py-2.5 hidden md:table-cell">
                              <span className="text-xs text-muted-foreground">
                                {format(new Date(sub.current_period_end), 'MMM d, yyyy')}
                              </span>
                            </td>
                            <td className="py-2.5 text-right">
                              {getStatusBadge(sub.status)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </>
        ) : null}

        {/* Cash Revenue Section */}
        <CashRevenueSection />
      </div>
    </AdminLayout>
  );
}
