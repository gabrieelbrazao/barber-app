/** Error helpers for turning thrown values into user-facing pt-BR messages. */

/**
 * A domain error whose message is already a curated, user-facing pt-BR string.
 * Throw this from queries/mutations when you want the text shown verbatim;
 * `toUserMessage` passes it through instead of mapping or genericizing it.
 */
export class AppError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AppError';
  }
}

/** Maps known raw API/auth errors to friendly pt-BR text; everything else falls back to a generic line. */
const PATTERNS: [RegExp, string][] = [
  [/invalid login credentials/i, 'E-mail ou senha incorretos.'],
  [/email not confirmed/i, 'Confirme seu e-mail antes de entrar.'],
  [/user already registered|already been registered/i, 'Este e-mail já está cadastrado.'],
  [/password should be at least/i, 'A senha deve ter pelo menos 6 caracteres.'],
  [/unable to validate email|invalid email/i, 'E-mail inválido.'],
  [/email rate limit exceeded|over_email_send_rate_limit/i, 'Muitas tentativas. Aguarde um momento e tente novamente.'],
  [/network request failed|failed to fetch/i, 'Sem conexão. Verifique sua internet e tente novamente.'],
];

const GENERIC = 'Algo deu errado. Tente novamente.';

/**
 * Converts any thrown value into a message safe to show on screen.
 * - `AppError` → its message, untouched (already curated pt-BR).
 * - Known raw API/auth errors → mapped pt-BR text.
 * - Anything else → a generic pt-BR fallback (raw details are never surfaced).
 *
 * Pass `fallback` to override the generic line for a given context.
 */
export function toUserMessage(e: unknown, fallback: string = GENERIC): string {
  // Always keep the real error around for debugging — just not on screen.
  if (__DEV__) console.error(e);

  if (e instanceof AppError) return e.message;

  const raw = e instanceof Error ? e.message : '';
  for (const [pattern, message] of PATTERNS) {
    if (pattern.test(raw)) return message;
  }
  return fallback;
}
