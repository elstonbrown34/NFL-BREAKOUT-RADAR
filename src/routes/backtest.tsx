import { createFileRoute, Link, useRouter, type ErrorComponentProps } from '@tanstack/react-router';
import { useSuspenseQuery } from '@tanstack/react-query';
import { ChartColumn, RefreshCw } from 'lucide-react';
import { AppShell } from '@/components/app-shell';
import { BacktestChart } from '@/components/backtest-chart';
import { Button } from '@/components/ui/button';
import { backtestOptions } from '@/lib/backtest.queries';
import { PageNotFound } from '@/components/page-states';

export const Route = createFileRoute('/backtest')({
  loader:({context})=>context.queryClient.ensureQueryData(backtestOptions),
  head:()=>({meta:[{title:'Historical Backtest | NFL Breakout Radar'},{name:'description',content:'Test week-10 Breakout Scores against weeks 11–18 in 2024 and 2025, comparing Top 10 and Top 20 hit rates with all eligible players.'},{property:'og:title',content:'Historical Backtest | NFL Breakout Radar'},{property:'og:description',content:'An honest historical check of NFL breakout rankings versus the random-pick baseline.'},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary_large_image'}]}),
  component:BacktestPage,
  errorComponent:BacktestError,
  notFoundComponent:PageNotFound,
});
const percent = (rate:number|null)=>rate === null ? '—' : `${(rate*100).toFixed(1)}%`;
function BacktestError({error}:ErrorComponentProps) {
  const router = useRouter();
  return <AppShell><h1 className="page-title">Backtest unavailable</h1><p role="alert" className="subtitle">{error instanceof Error ? error.message : 'Historical results could not be loaded.'}</p><Button className="mt-6" onClick={()=>router.invalidate()}><RefreshCw/>Retry</Button></AppShell>;
}
function BacktestPage() {
  const {data:seasons} = useSuspenseQuery(backtestOptions);
  return <AppShell>
    <div className="eyebrow"><ChartColumn size={14}/> Historical validation</div>
    <h1 className="page-title">Breakout model backtest</h1>
    <p className="subtitle">Rankings frozen at Week 10. Outcomes measured in Weeks 11–18.</p>
    <div className="backtest-stats">{seasons.map(s=><div className="stat-card" key={s.season}>
      <div className="stat-label"><span>{s.season} SEASON · TOP 10</span><ChartColumn size={16}/></div>
      <div className="flex items-baseline flex-wrap gap-x-4 gap-y-2 my-4"><strong className="backtest-rate text-primary">{percent(s.top10.rate)}</strong><span className="text-muted-foreground">vs <strong className="text-foreground text-xl">{percent(s.baseline.rate)}</strong> baseline</span></div>
      <div className="flex flex-wrap justify-between gap-3 text-sm"><span className="text-muted-foreground">{s.top10.hits}/{s.top10.total} Top 10 hits · {s.baseline.hits}/{s.baseline.total} eligible hits</span><strong className="text-primary">{s.lift === null ? 'Lift unavailable' : `${s.lift.toFixed(2)}× random`}</strong></div>
    </div>)}</div>
    <section className="backtest-section"><h2 className="section-heading">Hit rates by selection</h2><BacktestChart seasons={seasons}/></section>
    <p className="text-muted-foreground text-sm leading-relaxed border-y border-border py-5">Breakout Hit: at least 4 games in Weeks 11–18, at least 12 PPR points per game for WR/RB or 9 for TE, and at least 4 PPR points per game above the Week 10 average. Games count when the player records offensive snaps; absent players remain in the baseline.</p>
    {seasons.map(s=><section key={s.season} className="backtest-section">
      <div className="flex flex-wrap items-baseline justify-between gap-3 mb-4"><h2 className="section-heading">{s.season} · Top 20 outcomes</h2><span className="text-muted-foreground text-sm">{s.top20.hits}/{s.top20.total} hits · {percent(s.top20.rate)} hit rate</span></div>
      {!s.players.length && <div className="empty-state"><h3>No eligible players for this season</h3><p>There are no week-10 rankings to evaluate yet.</p></div>}
      <div className="table-wrap"><table className="radar-table backtest-table"><thead><tr><th scope="col">Rank</th><th scope="col">Player</th><th scope="col">Team</th><th scope="col">PPG through W10</th><th scope="col">PPG W11–18</th><th scope="col">Outcome</th></tr></thead><tbody>{s.players.map(p=><tr key={p.player_id}><td className="rank">{String(p.rank).padStart(2,'0')}</td><td><Link className="player-name" to="/player/$playerId" params={{playerId:p.player_id}} search={{season:s.season,cutoffWeek:10}}>{p.player_name}</Link><span className={`position-tag ${p.position} ml-3`}>{p.position}</span></td><td className="text-muted-foreground">{p.team}</td><td>{p.ppg.toFixed(1)}</td><td>{p.afterPpg?.toFixed(1) ?? '—'}<span className="text-muted-foreground text-xs ml-2">({p.afterGames} G)</span></td><td><span className={`outcome-badge ${p.hit ? 'outcome-hit' : 'outcome-miss'}`}>{p.hit ? 'Hit' : 'Miss'}</span></td></tr>)}</tbody></table></div>
    </section>)}
    <p className="text-muted-foreground leading-relaxed text-sm border-t border-border pt-6">Small sample. The model flags rising roles, but injuries, trades and coaching changes can't be predicted from box scores.</p>
  </AppShell>;
}