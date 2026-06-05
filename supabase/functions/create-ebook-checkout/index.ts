import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-EBOOK-CHECKOUT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

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

    const body = await req.json().catch(() => ({}));
    const ebook_id = body?.ebook_id;
    if (!ebook_id || typeof ebook_id !== "string") {
      return new Response(JSON.stringify({ error: "ebook_id is required" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    logStep("Ebook checkout request", { ebook_id, email: user.email });

    // Server-side price lookup — never trust client price
    const { data: program, error: programErr } = await supabaseAdmin
      .from("workout_programs")
      .select("id, title, price_cents, access_type, published")
      .eq("id", ebook_id)
      .maybeSingle();

    if (programErr) {
      logStep("Program lookup error", { error: programErr.message });
      return new Response(JSON.stringify({ error: "Program lookup failed" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    if (!program) {
      return new Response(JSON.stringify({ error: "Program not found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }
    if (!program.published) {
      return new Response(JSON.stringify({ error: "Program is not available for purchase" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }
    if (program.access_type !== "one_time_purchase") {
      return new Response(JSON.stringify({ error: "Program is not a one-time purchase" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }
    if (!program.price_cents || program.price_cents <= 0) {
      return new Response(JSON.stringify({ error: "Program price is not configured" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // Prevent double purchase
    const { data: existingPurchase, error: purchaseErr } = await supabaseAdmin
      .from("ebook_purchases")
      .select("id")
      .eq("user_id", user.id)
      .eq("ebook_id", ebook_id)
      .maybeSingle();

    if (purchaseErr) {
      logStep("Purchase lookup error", { error: purchaseErr.message });
    }
    if (existingPurchase) {
      return new Response(JSON.stringify({ error: "Already purchased." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY") || "";
    const isSandbox = stripeKey.startsWith("sk_test_");
    console.log("[create-ebook-checkout] mode:", isSandbox ? "sandbox" : "live");

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    let customerId: string | undefined;

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("stripe_customer_id")
      .eq("id", user.id)
      .maybeSingle();

    if (profile?.stripe_customer_id) {
      customerId = profile.stripe_customer_id;
      logStep("Using stripe_customer_id from profiles", { customerId });
    } else {
      const customers = await stripe.customers.list({ email: user.email, limit: 1 });
      if (customers.data.length > 0) {
        customerId = customers.data[0].id;
        logStep("Found existing Stripe customer by email", { customerId });
      } else {
        const newCustomer = await stripe.customers.create({
          email: user.email,
          metadata: { user_id: user.id },
        });
        customerId = newCustomer.id;
        logStep("Created new Stripe customer", { customerId });
      }

      const { error: updateError } = await supabaseAdmin
        .from("profiles")
        .update({ stripe_customer_id: customerId })
        .eq("id", user.id);
      if (updateError) {
        logStep("Failed to persist stripe_customer_id", { error: updateError.message });
      }
    }

    const origin = req.headers.get("origin") || "https://soulfuelsociety.lovable.app";

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: { name: program.title },
            unit_amount: program.price_cents,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${origin}/workouts?ebook=success`,
      cancel_url: `${origin}/workouts?ebook=cancelled`,
      metadata: {
        user_id: user.id,
        ebook_id,
        type: "ebook_purchase",
      },
    });

    logStep("Ebook checkout session created", { sessionId: session.id });

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