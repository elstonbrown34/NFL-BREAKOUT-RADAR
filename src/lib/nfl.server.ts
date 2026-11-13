import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';
import type { PlayerWeek } from './nfl-data';
export function publicClient() {
  const url = process.env['SUPABASE_URL'];
  const key = process.env['SUPABASE_PUBLISHABLE_KEY'];
  if (!url || !key) throw new Error('Cloud connection is unavailable.');
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: (input, init) => {
      const headers = new Headers(init?.headers);
      if (headers.get('Authorization') === `Bearer ${key}` && key.startsWith('sb_')) headers.delete('Authorization');
      headers.set('apikey', key);
      return fetch(input, { ...init, headers });
    } },
  });
}
export async function readPlayerWeeks(season: number, cutoffWeek: number, playerId?: string) {
  const db = publicClient();
  const rows: PlayerWeek[] = [];
  for (let offset = 0; ; offset += 1000) {
    let query = db.from('player_weeks').select('*').eq('season', season).lte('week', cutoffWeek).order('week').order('player_id');
    if (playerId) query = query.eq('player_id', playerId);
    const result = await query.range(offset, offset + 999);
    if (result.error) throw new Error('Player statistics could not be loaded.');
    rows.push(...result.data);
    if (result.data.length < 1000) return rows;
  }
}