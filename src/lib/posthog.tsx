// src/lib/posthog.tsx
"use client";

import { createContext, useContext } from 'react';

export const PostHogCtx = createContext<any>(null);

export function usePostHog() {
  return useContext(PostHogCtx);
}
