import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-SUBSCRIPTION] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });

    if (customers.data.length === 0) {
      logStep("No customer found");
      return new Response(JSON.stringify({ subscribed: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const customerId = customers.data[0].id;
    logStep("Found Stripe customer", { customerId });

    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 1,
    });

    const hasActiveSub = subscriptions.data.length > 0;
    let subscriptionEnd = null;
    let subscriptionId = null;

    if (hasActiveSub) {
      const subscription = subscriptions.data[0];
      subscriptionEnd = new Date(subscription.current_period_end * 1000).toISOString();
      subscriptionId = subscription.id;
      logStep("Active subscription found", { subscriptionId });

      const metadata = subscription.metadata || {};

      const profileUpdate: Record<string, any> = {
        subscription_status: "active",
        stripe_subscription_id: subscriptionId,
      };
      if (metadata.plan) profileUpdate.selected_plan = metadata.plan === "in_person" ? "in-person" : "online";
      if (metadata.session_count) profileUpdate.session_count = parseInt(metadata.session_count);
      if (metadata.group_size) profileUpdate.group_size = metadata.group_size;

      await supabaseClient.from("profiles").update(profileUpdate).eq("id", user.id);

      // Ensure user has 'paid' role
      const { data: existingRole } = await supabaseClient
        .from("user_roles")
        .select("id")
        .eq("user_id", user.id)
        .eq("role", "paid")
        .maybeSingle();

      if (!existingRole) {
        await supabaseClient.from("user_roles").insert({ user_id: user.id, role: "paid" });
      }

      // If this user accepted a group invite, mark it as accepted
      if (metadata.invite_token) {
        await supabaseClient
          .from("group_invites")
          .update({ status: "accepted", accepted_by: user.id })
          .eq("invite_token", metadata.invite_token);
        logStep("Marked invite as accepted", { token: metadata.invite_token });
      }
    } else {
      logStep("No active subscription");
      await supabaseClient.from("profiles").update({
        subscription_status: "inactive",
      }).eq("id", user.id);
    }

    return new Response(JSON.stringify({
      subscribed: hasActiveSub,
      subscription_end: subscriptionEnd,
      subscription_id: subscriptionId,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
