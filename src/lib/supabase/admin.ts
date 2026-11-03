import { createClient } from '@supabase/supabase-js';
import { normalizeSupabaseUrl } from './client';

export function getAdminClient() {
  const url = normalizeSupabaseUrl(
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  );
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SECRET_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    '';

  return createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
