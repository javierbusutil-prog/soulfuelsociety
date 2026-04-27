import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

const log = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[STRIPE-WEBHOOK] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

  if (!stripeKey || !webhookSecret) {
    log("Missing required env vars", { hasStripeKey: !!stripeKey, hasWebhookSecret: !!webhookSecret });
    return new Response(JSON.stringify({ error: "Server misconfigured" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }

  const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  // Read raw body — do NOT parse JSON first; needed for signature verification
  const rawBody = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    log("Missing stripe-signature header");
    return new Response(JSON.stringify({ error: "Missing signature" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(rawBody, signature, webhookSecret);
    log("Signature verified", { type: event.type, id: event.id });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log("Signature verification failed", { error: msg });
    return new Response(JSON.stringify({ error: `Webhook Error: ${msg}` }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.user_id;
        const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id;
        const subscriptionId =
          typeof session.subscription === "string" ? session.subscription : session.subscription?.id ?? null;

        log("checkout.session.completed", { userId, customerId, subscriptionId });

        if (!userId) {
          log("No user_id in session metadata — skipping");
          break;
        }

        const { error: profileErr } = await supabaseAdmin
          .from("profiles")
          .update({
            stripe_customer_id: customerId,
            stripe_subscription_id: subscriptionId,
            subscription_status: "active",
          })
          .eq("id", userId);
        if (profileErr) log("Profile update error", { error: profileErr.message });
        else log("Profile updated to active", { userId });

        const { error: roleErr } = await supabaseAdmin
          .from("user_roles")
          .insert({ user_id: userId, role: "paid" })
          .select()
          .maybeSingle();
        if (roleErr && !roleErr.message.toLowerCase().includes("duplicate")) {
          log("Role insert error (non-duplicate)", { error: roleErr.message });
        } else {
          log("Paid role ensured", { userId });
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;
        log("customer.subscription.updated", { customerId, status: subscription.status });

        const { data: profile, error: lookupErr } = await supabaseAdmin
          .from("profiles")
          .select("id")
          .eq("stripe_customer_id", customerId)
          .maybeSingle();
        if (lookupErr) log("Profile lookup error", { error: lookupErr.message });
        if (!profile?.id) {
          log("No profile found for customer", { customerId });
          break;
        }

        const { error: updateErr } = await supabaseAdmin
          .from("profiles")
          .update({ subscription_status: subscription.status })
          .eq("id", profile.id);
        if (updateErr) log("Status update error", { error: updateErr.message });
        else log("Profile status updated", { userId: profile.id, status: subscription.status });

        if (subscription.status === "active") {
          const { error: roleErr } = await supabaseAdmin
            .from("user_roles")
            .insert({ user_id: profile.id, role: "paid" })
            .select()
            .maybeSingle();
          if (roleErr && !roleErr.message.toLowerCase().includes("duplicate")) {
            log("Role insert error (non-duplicate)", { error: roleErr.message });
          } else {
            log("Paid role ensured", { userId: profile.id });
          }
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;
        log("customer.subscription.deleted", { customerId });

        const { data: profile, error: lookupErr } = await supabaseAdmin
          .from("profiles")
          .select("id")
          .eq("stripe_customer_id", customerId)
          .maybeSingle();
        if (lookupErr) log("Profile lookup error", { error: lookupErr.message });
        if (!profile?.id) {
          log("No profile found for customer", { customerId });
          break;
        }

        const { error: updateErr } = await supabaseAdmin
          .from("profiles")
          .update({ subscription_status: "canceled", stripe_subscription_id: null })
          .eq("id", profile.id);
        if (updateErr) log("Cancel update error", { error: updateErr.message });
        else log("Profile marked canceled", { userId: profile.id });

        const { error: roleDelErr } = await supabaseAdmin
          .from("user_roles")
          .delete()
          .eq("user_id", profile.id)
          .eq("role", "paid");
        if (roleDelErr) log("Role delete error", { error: roleDelErr.message });
        else log("Paid role removed", { userId: profile.id });
        break;
      }

      default:
        log("Unhandled event type — acknowledging", { type: event.type });
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : undefined;
    log("Handler error", { error: msg, stack });
    // Acknowledge to avoid Stripe retry storms on app-level bugs; signature was valid.
    return new Response(JSON.stringify({ received: true, error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  }
});