// src/lib/i18n/index.tsx
"use client";

import { createContext, useState, useContext, useCallback, useMemo } from "react";
import ru from "./ru";
import uz from "./uz";

const CATALOGS: Record<string, Record<string, string>> = { ru, uz };
const SUPPORTED = ["ru", "uz"];
const DEFAULT_LANG = "ru";

const I18nContext = createContext<any>(null);

function translate(catalog: Record<string, string>, key: string, params?: Record<string, any>) {
  let text = catalog[key] ?? CATALOGS.ru[key] ?? key;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      text = text.replaceAll(`{${k}}`, String(v));
    }
  }
  return text;
}

export function I18nProvider({ initialLang = DEFAULT_LANG, children }: { initialLang?: string; children: React.ReactNode }) {
  const [lang, setLangState] = useState(
    SUPPORTED.includes(initialLang) ? initialLang : DEFAULT_LANG
  );
  const catalog = useMemo(() => CATALOGS[lang] ?? CATALOGS.ru, [lang]);
  const t = useCallback(
    (key: string, params?: Record<string, any>) => translate(catalog, key, params),
    [catalog]
  );
  const setLang = useCallback((newLang: string) => {
    if (SUPPORTED.includes(newLang)) setLangState(newLang);
  }, []);

  return (
    <I18nContext.Provider value={{ t, lang, setLang }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    return {
      t: (key: string, params?: Record<string, any>) => translate(CATALOGS.ru, key, params),
      lang: DEFAULT_LANG,
      setLang: () => {},
    };
  }
  return ctx;
}
