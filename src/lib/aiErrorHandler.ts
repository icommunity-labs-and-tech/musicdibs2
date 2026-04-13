/**
 * Centralised AI-provider error handler.
 * Maps raw backend / provider errors to user-friendly Spanish messages.
 */

const FRIENDLY_FALLBACK = 'El servicio no está disponible en este momento. Inténtalo de nuevo más tarde.';

const STATUS_MESSAGES: Record<number, string> = {
  429: 'Demasiadas solicitudes. Espera unos segundos e inténtalo de nuevo.',
  402: 'Créditos insuficientes para completar esta acción.',
  401: 'Tu sesión ha expirado. Vuelve a iniciar sesión.',
  403: 'No tienes permiso para realizar esta acción.',
  500: 'Error interno del servidor. Inténtalo de nuevo más tarde.',
  502: 'El proveedor de IA no respondió correctamente. Inténtalo de nuevo.',
  503: 'El servicio de IA está temporalmente fuera de servicio. Inténtalo más tarde.',
  504: 'La solicitud tardó demasiado. Inténtalo de nuevo con una descripción más corta.',
};

/** Known error strings from edge functions mapped to friendly messages. */
const KNOWN_ERRORS: Array<[RegExp, string]> = [
  [/rate_limit/i, STATUS_MESSAGES[429]],
  [/insufficient.?credits/i, STATUS_MESSAGES[402]],
  [/too many requests/i, STATUS_MESSAGES[429]],
  [/api.?key.?not.?configured/i, 'Configuración del servicio incompleta. Contacta con soporte.'],
  [/timeout|timed?\s*out/i, STATUS_MESSAGES[504]],
  [/bad_prompt|content.?policy|moderation/i, 'La descripción no cumple las políticas de contenido. Modifícala e inténtalo de nuevo.'],
  [/network|fetch|ECONNREFUSED|ENOTFOUND/i, 'Error de conexión con el proveedor de IA. Comprueba tu conexión e inténtalo de nuevo.'],
  [/unauthorized|jwt/i, STATUS_MESSAGES[401]],
  [/providers? failed/i, FRIENDLY_FALLBACK],
];

export interface AiErrorInfo {
  userMessage: string;
  isRetryable: boolean;
}

/**
 * Parses an error (from supabase.functions.invoke or a catch block)
 * and returns a user-friendly message in Spanish.
 */
export function parseAiError(
  error: unknown,
  responseData?: Record<string, unknown> | null,
): AiErrorInfo {
  // Check status code on FunctionsHttpError-like objects
  const status = (error as any)?.status ?? (error as any)?.context?.status;
  if (status && STATUS_MESSAGES[status]) {
    return {
      userMessage: STATUS_MESSAGES[status],
      isRetryable: status !== 402 && status !== 401 && status !== 403,
    };
  }

  // Check data-level error from the edge function response body
  const dataError = responseData?.error as string | undefined;
  const rawMessage = dataError
    || (error instanceof Error ? error.message : '')
    || String(error ?? '');

  for (const [pattern, msg] of KNOWN_ERRORS) {
    if (pattern.test(rawMessage)) {
      return {
        userMessage: msg,
        isRetryable: !(/insufficient|unauthorized|policy|moderation|api.?key/i.test(rawMessage)),
      };
    }
  }

  return { userMessage: FRIENDLY_FALLBACK, isRetryable: true };
}
