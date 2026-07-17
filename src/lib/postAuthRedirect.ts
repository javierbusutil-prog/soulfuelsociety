// Safely capture and consume a post-auth return path so that OAuth consent
// (and any other flow that lands on /login?next=...) can return the user to
// their original URL after sign-in / sign-up, including through Google OAuth
// (which forces redirect_uri back to window.location.origin).

const KEY = "sf.postAuthRedirect";

export function isSafeReturnPath(p: string | null | undefined): p is string {
  if (!p) return false;
  if (!p.startsWith("/")) return false;
  if (p.startsWith("//")) return false;
  return true;
}

export function stashPostAuthRedirect(path: string | null | undefined) {
  if (isSafeReturnPath(path)) {
    try {
      sessionStorage.setItem(KEY, path);
    } catch {
      /* ignore */
    }
  }
}

export function consumePostAuthRedirect(): string | null {
  try {
    const v = sessionStorage.getItem(KEY);
    if (v) sessionStorage.removeItem(KEY);
    return isSafeReturnPath(v) ? v : null;
  } catch {
    return null;
  }
}