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

// Online training price
const ONLINE_PRICE_ID = "price_1TG82XROBuw9pDG0gF1Hax6r";

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

  try {
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    if (!user?.email) throw new Error("User not authenticated");

    const { plan, sessionCount, groupSize } = await req.json();
    logStep("Checkout request", { plan, sessionCount, groupSize, email: user.email });

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", { apiVersion: "2025-08-27.basil" });

    // Find or create customer
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId: string | undefined;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    }

    const origin = req.headers.get("origin") || "https://soulfuelsociety.lovable.app";
    let sessionConfig: Stripe.Checkout.SessionCreateParams;

    if (plan === "online") {
      sessionConfig = {
        customer: customerId,
        customer_email: customerId ? undefined : user.email,
        line_items: [{ price: ONLINE_PRICE_ID, quantity: 1 }],
        mode: "subscription",
        success_url: `${origin}/community?checkout=success`,
        cancel_url: `${origin}/upgrade?checkout=cancelled`,
        metadata: { user_id: user.id, plan: "online" },
      };
    } else {
      // In-person training
      const rate = SESSION_RATES[groupSize] || SESSION_RATES.solo;
      const totalCents = rate * (sessionCount || 4);
      const groupLabel = groupSize === "solo" ? "Solo" : groupSize === "partner" ? "Partner" : "Trio";

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
        success_url: `${origin}/${groupSize === "solo" ? "community" : "community"}?checkout=success`,
        cancel_url: `${origin}/upgrade?checkout=cancelled`,
        metadata: {
          user_id: user.id,
          plan: "in_person",
          session_count: String(sessionCount),
          group_size: groupSize,
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
