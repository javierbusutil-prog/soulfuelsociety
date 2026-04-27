import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Verify caller is admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");
    const token = authHeader.replace("Bearer ", "");
    const { data: userData } = await supabaseClient.auth.getUser(token);
    if (!userData.user) throw new Error("Not authenticated");

    // Check admin role
    const { data: roles } = await supabaseClient
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id);
    const isAdmin = roles?.some(r => r.role === "admin" || r.role === "pt_admin");
    if (!isAdmin) throw new Error("Unauthorized");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY not set");
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Get all active subscriptions
    const allSubs: any[] = [];
    let hasMore = true;
    let startingAfter: string | undefined;

    while (hasMore) {
      const params: any = { status: "all", limit: 100, expand: ["data.customer"] };
      if (startingAfter) params.starting_after = startingAfter;
      const batch = await stripe.subscriptions.list(params);
      allSubs.push(...batch.data);
      hasMore = batch.has_more;
      if (batch.data.length > 0) startingAfter = batch.data[batch.data.length - 1].id;
    }

    // Calculate metrics
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    let totalRevenueThisMonth = 0;
    let totalActive = 0;

    const activeSubs = allSubs.filter(s => s.status === "active");
    totalActive = activeSubs.length;

    // Get invoices for this month's revenue
    const invoices = await stripe.invoices.list({
      created: { gte: Math.floor(monthStart.getTime() / 1000) },
      status: "paid",
      limit: 100,
    });
    totalRevenueThisMonth = invoices.data.reduce((sum, inv) => sum + (inv.amount_paid || 0), 0) / 100;

    const avgRevenue = totalActive > 0 ? totalRevenueThisMonth / totalActive : 0;

    // Monthly revenue for last 6 months
    const monthlyRevenue: { month: string; revenue: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const mStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      const monthInvoices = await stripe.invoices.list({
        created: { gte: Math.floor(mStart.getTime() / 1000), lt: Math.floor(mEnd.getTime() / 1000) },
        status: "paid",
        limit: 100,
      });
      const rev = monthInvoices.data.reduce((sum, inv) => sum + (inv.amount_paid || 0), 0) / 100;
      monthlyRevenue.push({
        month: mStart.toLocaleString("en-US", { month: "short", year: "numeric" }),
        revenue: rev,
      });
    }

    // Subscription details
    const subscriptions = allSubs.map(sub => {
      const customer = sub.customer as any;
      const priceAmount = sub.items?.data?.[0]?.price?.unit_amount || 0;
      return {
        id: sub.id,
        customer_name: customer?.name || customer?.email || "Unknown",
        customer_email: customer?.email || "",
        amount: priceAmount / 100,
        status: sub.status,
        current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
        created: new Date(sub.created * 1000).toISOString(),
      };
    });

    return new Response(JSON.stringify({
      total_revenue_this_month: totalRevenueThisMonth,
      total_active_subscriptions: totalActive,
      avg_revenue_per_member: Math.round(avgRevenue * 100) / 100,
      monthly_revenue: monthlyRevenue,
      subscriptions,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
