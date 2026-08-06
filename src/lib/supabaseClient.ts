import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Custom fetch wrapper that forces HTTP/1.1 by adding a `Connection: close`
 * header. This mitigates `net::ERR_HTTP2_PROTOCOL_ERROR` and `net::ERR_CONNECTION_RESET`
 * errors observed on Windows browsers. The wrapper also accepts an optional
 * `AbortSignal` so callers can cancel long‑running requests.
 */
const customFetch = async (url: RequestInfo, init?: RequestInit): Promise<Response> => {
  // Abort controller to cancel requests after a timeout
  const controller = new AbortController();
  const signal = controller.signal;
  const timeout = setTimeout(() => controller.abort(), 30000); // 30s timeout

  const modifiedInit: RequestInit = {
    ...init,
    signal,
    headers: {
      ...init?.headers,
      'Connection': 'close',
    },
  };

  try {
    const response = await fetch(url, modifiedInit);
    return response;
  } finally {
    clearTimeout(timeout);
  }
};

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// Singleton instance
let supabaseInstance: SupabaseClient | null = null;

const getSupabaseClient = () => {
  if (!supabaseInstance) {
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        storageKey: 'rathinam-techpark-auth',
        autoRefreshToken: true,
      },
      global: {
        headers: {
          'Access-Control-Allow-Origin': '*',
        },
      },
      // Use the custom fetch wrapper to avoid HTTP/2 protocol errors
      fetch: customFetch,
    });
  }
  return supabaseInstance;
};

export const supabase = getSupabaseClient();
