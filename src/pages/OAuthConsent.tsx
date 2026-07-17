import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import logoStacked from "@/assets/logo-stacked.svg";

// Beta auth.oauth namespace — typed shim so TS sees the three methods we use.
type OAuthApi = {
  getAuthorizationDetails: (id: string) => Promise<{ data: any; error: any }>;
  approveAuthorization: (id: string) => Promise<{ data: any; error: any }>;
  denyAuthorization: (id: string) => Promise<{ data: any; error: any }>;
};
const oauthApi = () => (supabase.auth as unknown as { oauth: OAuthApi }).oauth;

export default function OAuthConsent() {
  const [params] = useSearchParams();
  const authorizationId = params.get("authorization_id") ?? "";
  const { user, loading: authLoading, profile } = useAuth();
  const [details, setDetails] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!authorizationId) {
      setError("Missing authorization_id");
      return;
    }
    if (!user) {
      const next = window.location.pathname + window.location.search;
      window.location.href = "/login?next=" + encodeURIComponent(next);
      return;
    }
    let active = true;
    (async () => {
      const { data, error } = await oauthApi().getAuthorizationDetails(authorizationId);
      if (!active) return;
      if (error) {
        setError(error.message ?? "Could not load this authorization request");
        return;
      }
      const immediate = data?.redirect_url ?? data?.redirect_to;
      if (immediate && !data?.client) {
        window.location.href = immediate;
        return;
      }
      setDetails(data);
    })();
    return () => {
      active = false;
    };
  }, [authLoading, user, authorizationId]);

  async function decide(approve: boolean) {
    setBusy(true);
    setError(null);
    const api = oauthApi();
    const { data, error } = approve
      ? await api.approveAuthorization(authorizationId)
      : await api.denyAuthorization(authorizationId);
    if (error) {
      setBusy(false);
      setError(error.message ?? "Something went wrong");
      return;
    }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) {
      setBusy(false);
      setError("No redirect returned by the authorization server.");
      return;
    }
    window.location.href = target;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-8">
          <img src={logoStacked} alt="Soul Fuel" className="h-12 w-auto" />
        </div>
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
          {error ? (
            <>
              <h1 className="font-display text-xl mb-2">Authorization error</h1>
              <p className="text-sm text-muted-foreground">{error}</p>
            </>
          ) : !details ? (
            <p className="text-sm text-muted-foreground text-center">Loading…</p>
          ) : (
            <>
              <h1 className="font-display text-xl mb-2">
                Connect {details.client?.name ?? details.client?.client_name ?? "an app"} to Soul Fuel
              </h1>
              <p className="text-sm text-muted-foreground mb-4">
                Signed in as{" "}
                <span className="font-medium text-foreground">
                  {profile?.full_name ?? user?.email}
                </span>
                .
              </p>
              <p className="text-sm mb-6">
                This lets{" "}
                <span className="font-medium">
                  {details.client?.name ?? details.client?.client_name ?? "the client"}
                </span>{" "}
                use Soul Fuel Society tools while you are signed in. It cannot bypass Soul Fuel's own permissions.
              </p>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  disabled={busy}
                  onClick={() => decide(false)}
                >
                  Cancel
                </Button>
                <Button className="flex-1" disabled={busy} onClick={() => decide(true)}>
                  {busy ? "Working…" : "Approve"}
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}