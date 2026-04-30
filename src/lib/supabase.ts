import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Use a proxy to handle the supabase client lazily. 
// This prevents the application from crashing on startup if credentials are missing,
// while providing a clear error message when the database is actually accessed.
export const supabase = (supabaseUrl && supabaseAnonKey) 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : (new Proxy({}, {
      get: (_, prop) => {
        if (prop === 'then') return undefined; // Handle potential promise-like usage
        throw new Error(
          'Supabase credentials missing. Please add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY ' +
          'to your environment via the Secrets panel in the AI Studio settings.'
        );
      }
    }) as any);
