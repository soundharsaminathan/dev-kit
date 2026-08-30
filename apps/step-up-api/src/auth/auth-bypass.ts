/**
 * Local admin/dev sign-in uses AUTH_BYPASS. The web app also auto-enables
 * bypass in development when Firebase is not configured — keep that rule here
 * so /login "Continue as system admin" is not a 403 against a stock API.
 */
export function resolveAuthBypassEnabled(input: {
  authBypass: string | undefined;
  nodeEnv: string | undefined;
  e2e?: string;
  firebaseConfigured: boolean;
}): boolean {
  if (input.authBypass === "true") return true;
  if (input.authBypass === "false") return false;
  if (input.e2e === "true") return true;
  return input.nodeEnv === "development" && !input.firebaseConfigured;
}
