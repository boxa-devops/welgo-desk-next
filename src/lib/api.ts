// src/lib/api.ts
import { supabase } from './supabase';

export const API_PREFIX = '/api';

export async function apiFetch(url: string, options: RequestInit = {}) {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  const resolvedUrl = url.startsWith('/api') ? url : `${API_PREFIX}${url}`;
  return fetch(resolvedUrl, {
    ...options,
    headers: {
      ...(options.headers ?? {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
}
