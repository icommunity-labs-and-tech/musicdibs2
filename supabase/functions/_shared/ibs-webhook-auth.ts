// Shared validator for iBS webhook authentication via ?secret= query param.
// Returns true when authorized (or when secret is not configured — logged as warning).
export function validateIbsWebhookAuth(req: Request, logTag: string): boolean {
  const webhookSecret = Deno.env.get("IBS_WEBHOOK_SECRET");
  const url = new URL(req.url);
  const secretParam = url.searchParams.get("secret");

  if (!webhookSecret) {
    console.warn(`[${logTag}] IBS_WEBHOOK_SECRET not configured, skipping validation`);
    return true;
  }

  const expectedPrefix = webhookSecret.substring(0, 4);
  const receivedPrefix = secretParam ? secretParam.substring(0, 4) : "(none)";
  const match = secretParam === webhookSecret;
  console.log(
    `[${logTag}] Secret check — expected starts: "${expectedPrefix}…", received starts: "${receivedPrefix}…", match: ${match}`,
  );
  return match;
}
