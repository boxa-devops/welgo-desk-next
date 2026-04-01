// src/lib/types.ts
export const ERROR_PATTERNS = {
  CREDITS_EXHAUSTED: /лимит поисков исчерпан/i,
  ORG_DISABLED: /организация деактивирована/i,
  PROFILE_NOT_FOUND: /профиль не найден|profile not found/i,
  DESK_NOT_CONFIGURED: /not configured|DEEPSEEK_TOKEN/i,
  DB_NOT_CONFIGURED: /database not configured|POSTGRES_DSN/i,
};

export function parseApiError(status: number, detail: string, t?: (key: string) => string) {
  const _t = t || ((key: string) => key);
  if (status === 403) {
    if (ERROR_PATTERNS.CREDITS_EXHAUSTED.test(detail)) {
      return { message: detail, type: "credits" };
    }
    if (ERROR_PATTERNS.ORG_DISABLED.test(detail)) {
      return { message: detail, type: "disabled" };
    }
    if (ERROR_PATTERNS.PROFILE_NOT_FOUND.test(detail)) {
      return {
        message: _t("error.profile_not_found"),
        type: "auth",
      };
    }
    return { message: detail, type: "generic" };
  }
  if (status === 503) {
    return {
      message: _t("error.service_unavailable"),
      type: "config",
    };
  }
  if (status === 404) {
    return { message: detail || _t("error.not_found"), type: "generic" };
  }
  return { message: detail || `${_t("error.server")} (${status})`, type: "generic" };
}
