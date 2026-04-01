// app/providers.tsx
"use client";

import posthog from "posthog-js";
import { useEffect, useRef } from "react";
import { PostHogCtx } from "@/lib/posthog";
import { AuthProvider } from "@/lib/AuthContext";
import { I18nProvider } from "@/lib/i18n";

export function Providers({ children }: { children: React.ReactNode }) {
  const initialized = useRef(false);

  useEffect(() => {
    if (!initialized.current) {
      posthog.init(process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN!, {
        api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
        defaults: "2026-01-30" as any,
      });
      initialized.current = true;
    }
  }, []);

  return (
    <PostHogCtx.Provider value={posthog}>
      <AuthProvider>
        <I18nProvider>{children}</I18nProvider>
      </AuthProvider>
    </PostHogCtx.Provider>
  );
}
