import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-CHECKOUT] ${step}${detailsStr}`);
};

// In-person per-session rates
const SESSION_RATES: Record<string, number> = {
  solo: 5000,    // $50/session in cents
  partner: 4000, // $40/session
  trio: 3500,    // $35/session
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  // Service-role client for writing stripe_customer_id back to profiles (bypasses RLS)
  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    if (!user?.email) throw new Error("User not authenticated");

    const { plan, sessionCount, groupSize, inviteToken, groupId } = await req.json();
    logStep("Checkout request", { plan, sessionCount, groupSize, email: user.email, inviteToken });

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY") || "";
    const isSandbox = stripeKey.startsWith("sk_test_");
    console.log("[create-checkout] mode:", isSandbox ? "sandbox" : "live");

    const onlinePriceId = isSandbox
      ? Deno.env.get("STRIPE_ONLINE_PRICE_ID_TEST")
      : Deno.env.get("STRIPE_ONLINE_PRICE_ID_LIVE");

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Find or create Stripe customer, persisting the ID to profiles to avoid duplicates
    let customerId: string | undefined;

    // 1. Check profiles for an existing stripe_customer_id
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("stripe_customer_id")
      .eq("id", user.id)
      .maybeSingle();

    if (profile?.stripe_customer_id) {
      customerId = profile.stripe_customer_id;
      logStep("Using stripe_customer_id from profiles", { customerId });
    } else {
      // 2. Look up an existing Stripe customer by email
      const customers = await stripe.customers.list({ email: user.email, limit: 1 });
      if (customers.data.length > 0) {
        customerId = customers.data[0].id;
        logStep("Found existing Stripe customer by email", { customerId });
      } else {
        // 3. Create a new Stripe customer
        const newCustomer = await stripe.customers.create({
          email: user.email,
          metadata: { user_id: user.id },
        });
        customerId = newCustomer.id;
        logStep("Created new Stripe customer", { customerId });
      }

      // Persist the customer ID back to profiles
      const { error: updateError } = await supabaseAdmin
        .from("profiles")
        .update({ stripe_customer_id: customerId })
        .eq("id", user.id);
      if (updateError) {
        logStep("Failed to persist stripe_customer_id", { error: updateError.message });
      }
    }

    const origin = req.headers.get("origin") || "https://soulfuelsociety.lovable.app";
    let sessionConfig: Stripe.Checkout.SessionCreateParams;

    if (plan === "online") {
      if (!onlinePriceId) {
        throw new Error("Online price ID not configured for this environment");
      }
      sessionConfig = {
        customer: customerId,
        customer_email: customerId ? undefined : user.email,
        line_items: [{ price: onlinePriceId, quantity: 1 }],
        mode: "subscription",
        success_url: `${origin}/onboarding?checkout=success`,
        cancel_url: `${origin}/upgrade?checkout=cancelled`,
        metadata: { user_id: user.id, plan: "online" },
      };
    } else {
      // In-person training
      const rate = SESSION_RATES[groupSize] || SESSION_RATES.solo;
      const totalCents = rate * (sessionCount || 4);
      const groupLabel = groupSize === "solo" ? "Solo" : groupSize === "partner" ? "Partner" : "Trio";

      // Determine success URL based on context
      let successUrl: string;
      if (inviteToken) {
        // Invited member paying — go to onboarding
        successUrl = `${origin}/onboarding?checkout=success&invite_token=${inviteToken}`;
      } else if (groupSize === "solo") {
        successUrl = `${origin}/onboarding?checkout=success`;
      } else {
        // Group organizer — redirect to invite page
        successUrl = `${origin}/invite?checkout=success`;
      }

      sessionConfig = {
        customer: customerId,
        customer_email: customerId ? undefined : user.email,
        line_items: [{
          price_data: {
            currency: "usd",
            product_data: {
              name: `In-Person Training — ${groupLabel}, ${sessionCount} sessions/mo`,
            },
            unit_amount: totalCents,
            recurring: { interval: "month" },
          },
          quantity: 1,
        }],
        mode: "subscription",
        success_url: successUrl,
        cancel_url: `${origin}/upgrade?checkout=cancelled`,
        metadata: {
          user_id: user.id,
          plan: "in_person",
          session_count: String(sessionCount),
          group_size: groupSize,
          ...(inviteToken ? { invite_token: inviteToken, group_id: groupId } : {}),
        },
      };
    }

    const session = await stripe.checkout.sessions.create(sessionConfig);
    logStep("Checkout session created", { sessionId: session.id });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: msg });
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
