/** Turns a Supabase/Postgres error into a sentence a non-technical user can act on. */
export function friendlyError(err: unknown): string {
  const e = err as { code?: string; message?: string } | null
  const msg = e?.message ?? String(err)
  if (e?.code === '23505') return 'That name is already in use.'
  if (e?.code === '23503') return 'This record is linked to something that no longer exists, or is still used elsewhere.'
  if (e?.code === '23502') return 'A required field is missing.'
  if (e?.code === '22P02') return 'One of the selected values is missing or invalid.'
  if (e?.code === '23514') return 'One of the values is not allowed.'
  if (e?.code === 'PGRST205' || e?.code === '42P01') return 'The database is missing a table. Apply the latest migrations, then reload.'
  if (e?.code === 'PGRST202' || e?.code === '42883') return 'The database is missing a function. Apply the latest migrations, then reload.'
  if (e?.code === '42703' || e?.code === 'PGRST204') return 'The database is missing a column. Apply the latest migrations, then reload.'
  if (e?.code === '42501') return "You don't have permission to do that."
  if (/Failed to fetch|NetworkError|Load failed/i.test(msg)) return "Can't reach the database. Check your connection and try again."
  return msg
}
