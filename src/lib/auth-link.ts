// Email links from Supabase (judge invites, magic links, password resets)
// land with the session or an error in the URL hash. The Supabase client
// strips that hash as soon as it starts, so read it first, at app start.

export type AuthLink = {
  type: string | null; // invite | magiclink | signup | recovery | email_change
  error: string | null;
};

let captured: AuthLink | null = null;

export function captureAuthLink() {
  if (typeof window === "undefined" || captured) return;
  const params = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const hasSession = params.has("access_token");
  const error = params.get("error_description") || params.get("error_code") || params.get("error");
  if (!hasSession && !error) return;

  captured = { type: params.get("type"), error: error ? error.replace(/\+/g, " ") : null };

  // Finish every email-link sign-in on /auth, wherever Supabase sent it
  // (e.g. the Site URL root, which forwards to the public /hackathon page).
  if (window.location.pathname !== "/auth") {
    window.location.replace(`/auth${window.location.hash}`);
  }
}

export function getAuthLink(): AuthLink | null {
  if (captured) return captured;
  if (typeof window === "undefined") return null;
  // After the forward to /auth, read the hash again on this page load.
  captureAuthLink();
  return captured;
}
