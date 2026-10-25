export const supabase_base_url = process.env.SUPABASE_BASE_URL?.trim() ?? '';
export const supabase_publishable_key = process.env.SUPABASE_PUBLISHABLE_KEY?.trim() ?? '';

// Validate lazily: local tools and STDIO initialization do not need a remote backend.
export function requireSupabaseBaseUrl(): string {
  if (!supabase_base_url) {
    throw new Error('SUPABASE_BASE_URL is required for remote Supabase operations.');
  }
  let url: URL;
  try {
    url = new URL(supabase_base_url);
  } catch {
    throw new Error(
      'SUPABASE_BASE_URL must be an HTTP(S) URL without credentials, query, or hash.',
    );
  }
  if (
    !['http:', 'https:'].includes(url.protocol) ||
    supabase_base_url.includes('?') ||
    supabase_base_url.includes('#') ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  ) {
    throw new Error(
      'SUPABASE_BASE_URL must be an HTTP(S) URL without credentials, query, or hash.',
    );
  }
  return supabase_base_url.replace(/\/+$/u, '');
}

export function requireSupabasePublishableKey(): string {
  if (!supabase_publishable_key) {
    throw new Error(
      'SUPABASE_PUBLISHABLE_KEY is required for remote Supabase database operations.',
    );
  }
  return supabase_publishable_key;
}

export const x_region = process.env.X_REGION ?? 'us-east-1';

export const glad_api_base_url =
  process.env.GLAD_API_BASE_URL ?? 'https://www.globallcadataaccess.org/api/v1';
export const glad_api_key = process.env.GLAD_API_KEY ?? '';
