/**
 * Centralised AI-provider error handler.
 * Maps raw backend / provider errors to i18n keys for user-friendly messages.
 */
import i18n from 'i18next';

const t = (key: string) => i18n.t(key);

const statusToKey: Record<number, string> = {
  429: 'aiShared.aiRateLimit',
  402: 'aiShared.aiInsufficientCredits',
  401: 'aiShared.aiSessionExpired',
  403: 'aiShared.aiForbidden',
  500: 'aiShared.aiServerError',
  502: 'aiShared.aiBadGateway',
  503: 'aiShared.aiServiceDown',
  504: 'aiShared.aiTimeout',
};

/** Known error strings mapped to i18n keys. */
const KNOWN_ERRORS: Array<[RegExp, string]> = [
  [/rate_limit|auphonic_rate_limited/i, 'aiShared.aiRateLimit'],
  [/insufficient.?credits/i, 'aiShared.aiInsufficientCredits'],
  [/too many requests/i, 'aiShared.aiRateLimit'],
  [/api.?key.?not.?configured|auphonic_auth_error/i, 'aiShared.aiConfigError'],
  [/timeout|timed?\s*out/i, 'aiShared.aiTimeout'],
  [/bad_prompt|content.?policy|moderation/i, 'aiShared.aiContentPolicy'],
  [/network|fetch|ECONNREFUSED|ENOTFOUND/i, 'aiShared.aiNetworkError'],
  [/unauthorized|jwt/i, 'aiShared.aiSessionExpired'],
  [/providers? failed|auphonic_service_unavailable/i, 'aiShared.aiServiceDown'],
  [/auphonic_invalid_audio|invalid.?audio|unsupported.?format/i, 'aiShared.aiInvalidAudio'],
  [/auphonic_error/i, 'aiShared.aiServiceDown'],
];

export interface AiErrorInfo {
  userMessage: string;
  isRetryable: boolean;
}

/**
 * Parses an error (from supabase.functions.invoke or a catch block)
 * and returns a user-friendly, localised message.
 */
export function parseAiError(
  error: unknown,
  responseData?: Record<string, unknown> | null,
): AiErrorInfo {
  const status = (error as any)?.status ?? (error as any)?.context?.status;
  if (status && statusToKey[status]) {
    return {
      userMessage: t(statusToKey[status]),
      isRetryable: status !== 402 && status !== 401 && status !== 403,
    };
  }

  const dataError = responseData?.error as string | undefined;
  const rawMessage = dataError
    || (error instanceof Error ? error.message : '')
    || String(error ?? '');

  for (const [pattern, key] of KNOWN_ERRORS) {
    if (pattern.test(rawMessage)) {
      return {
        userMessage: t(key),
        isRetryable: !(/insufficient|unauthorized|policy|moderation|api.?key/i.test(rawMessage)),
      };
    }
  }

  return { userMessage: t('aiShared.aiUnavailable'), isRetryable: true };
}
