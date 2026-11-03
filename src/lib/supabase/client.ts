import { createBrowserClient } from '@supabase/ssr';

export function normalizeSupabaseUrl(rawUrl?: string): string {
  if (!rawUrl) return '';
  return rawUrl
    .trim()
    .replace(/\/rest\/v1\/?$/i, '')
    .replace(/\/+$/, '');
}

export function isSupabaseConfigured(): boolean {
  const url = normalizeSupabaseUrl(
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  );
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    '';
  return Boolean(
    url &&
      key &&
      !url.includes('seu-projeto.supabase.co') &&
      !key.includes('sua-anon-key-aqui')
  );
}

export function createClient() {
  const supabaseUrl = normalizeSupabaseUrl(
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  );
  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    '';

  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}
