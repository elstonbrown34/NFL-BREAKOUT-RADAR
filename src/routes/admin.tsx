import { createFileRoute } from '@tanstack/react-router';
import { useSuspenseQuery, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { useState } from 'react';
import { Database, RefreshCw, CheckCircle2, FileSpreadsheet, ExternalLink, AlertCircle } from 'lucide-react';
import { AppShell } from '@/components/app-shell';
import { Button } from '@/components/ui/button';
import { syncSeason } from '@/lib/nfl.functions';
import { seasonStatusOptions } from '@/lib/nfl.queries';
import { toast } from 'sonner';
export const Route = createFileRoute('/admin')({
  head: () => ({ meta: [{ title:'Data Admin | NFL Breakout Radar' },{ name:'description',content:'Sync 2024, 2025 and 2026 NFL player statistics and snap counts from nflverse.' },{ property:'og:title',content:'Data Admin | NFL Breakout Radar' },{ property:'og:description',content:'Season-by-season NFL data synchronization and import status.' },{ property:'og:type',content:'website' },{ name:'twitter:card',content:'summary_large_image' }] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(seasonStatusOptions),
  component: Admin,
});
function Admin() {
  const { data: seasons } = useSuspenseQuery(seasonStatusOptions);
  const queryClient = useQueryClient();
  const sync = useServerFn(syncSeason);
  const [busy,setBusy] = useState<number | null>(null);
  async function run(season: 2024 | 2025 | 2026) {
    setBusy(season);
    try {
      const result = await sync({ data:{ season } });
      if (result.success) toast.success(result.message); else toast.error(result.message);
    } catch { toast.error('Unable to sync this season. Please try again.'); }
    finally { setBusy(null); await queryClient.invalidateQueries(); }
  }
  return <AppShell><div className="eyebrow"><Database size={13}/> Data operations</div><h1 className="page-title">Season data center</h1><p className="subtitle">The foundation behind every breakout signal. Real stats. Real opportunity.</p>
    <div className="sync-grid">{seasons.map(s => <section className="sync-card" key={s.season}>
      <div className="flex items-center justify-between"><h2>{s.season} <span className="text-muted-foreground text-xl">SEASON</span></h2>{s.status === 'complete' ? <CheckCircle2 className="text-primary" size={19}/> : s.status === 'error' ? <AlertCircle className="text-caution" size={19}/> : <Database className="text-muted-foreground" size={19}/>}</div>
      <div className="mt-3 text-xs text-muted-foreground">{busy === s.season ? 'Syncing nflverse data…' : s.status === 'complete' ? 'Season loaded' : s.status === 'error' ? 'Sync needs attention' : s.status === 'syncing' ? 'Sync in progress' : 'Awaiting first sync'}</div>
      <dl className="sync-details"><div><dt>PLAYER WEEKS</dt><dd>{s.row_count.toLocaleString()}</dd></div><div><dt>LATEST WEEK</dt><dd>{s.latest_week ? `WK ${s.latest_week}` : '—'}</dd></div></dl>
      <Button className="w-full" variant={s.status === 'complete' ? 'outline' : 'default'} disabled={busy !== null} onClick={() => run(s.season as 2024 | 2025 | 2026)}><RefreshCw className={busy === s.season ? 'animate-spin' : ''}/>{busy === s.season ? 'Syncing season…' : `Sync ${s.season} season`}</Button>
      <p className="sync-note">{s.message || (s.completed_at ? `Last synced ${new Date(s.completed_at).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric',timeZone:'UTC'})}` : 'No data loaded yet.')}</p>
    </section>)}</div>
    <div className="mt-10"><div className="eyebrow">Source coverage</div><h2 className="section-heading">Open data. Clear provenance.</h2><div className="source-row"><div className="flex items-center gap-4"><FileSpreadsheet size={22} className="text-primary"/><div className="space-y-1"><p className="font-medium">Weekly player statistics</p><p className="text-xs text-muted-foreground">Targets, receptions, rushing, EPA, opportunity shares and PPR points</p></div></div><a href="https://github.com/nflverse/nflverse-data/releases/tag/stats_player" target="_blank" rel="noreferrer" aria-label="View player statistics source"><ExternalLink size={16} className="text-muted-foreground"/></a></div>
    <div className="source-row"><div className="flex items-center gap-4"><FileSpreadsheet size={22} className="text-info"/><div className="space-y-1"><p className="font-medium">Weekly snap counts</p><p className="text-xs text-muted-foreground">Offensive snaps and participation rate · WR, TE and RB</p></div></div><a href="https://github.com/nflverse/nflverse-data/releases/tag/snap_counts" target="_blank" rel="noreferrer" aria-label="View snap counts source"><ExternalLink size={16} className="text-muted-foreground"/></a></div><p className="mt-5 text-xs text-muted-foreground">Regular-season games only. Re-syncing updates existing player weeks without creating duplicates. Source availability varies by season.</p></div>
  </AppShell>;
}
