interface SupabaseLikeError {
  message?: string;
  details?: string;
  hint?: string;
  code?: string;
}

export function formatError(err: unknown): string {
  if (err instanceof Error) {
    return err.message;
  }

  if (typeof err === 'object' && err !== null) {
    const supabaseError = err as SupabaseLikeError;
    const parts = [
      supabaseError.message,
      supabaseError.details,
      supabaseError.hint,
      supabaseError.code ? `Code: ${supabaseError.code}` : undefined,
    ].filter(Boolean);

    if (parts.length > 0) {
      if (supabaseError.code === '42501') {
        parts.push(
          'The current Supabase key does not have permission for this table. Add SUPABASE_SERVICE_ROLE_KEY to the local .env for the admin app, or create an explicit Supabase RLS policy for admin writes.',
        );
      }

      return parts.join(' ');
    }
  }

  return String(err);
}
