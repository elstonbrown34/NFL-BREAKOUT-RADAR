import { createFileRoute, Link, useRouter, type ErrorComponentProps } from '@tanstack/react-router';
import { useSuspenseQuery } from '@tanstack/react-query';
import { ChartColumn, RefreshCw } from 'lucide-react';
import { AppShell } from '@/components/app-shell';
import { BacktestChart } from '@/components/backtest-chart';
import { Button } from '@/components/ui/button';
import { summarizeBacktests } from '@/lib/backtest';
import { backtestOptions } from '@/lib/backtest.queries';
import { PageNotFound } from '@/components/page-states';

export const Route = createFileRoute('/backtest')({
  loader:({context})=>context.queryClient.ensureQueryData(backtestOptions),
  head:()=>({meta:[{title:'Historical Backtest | NFL Breakout Radar'},{name:'description',content:'Test week-10 Breakout Scores against weeks 11–18 in 2019–2025, comparing Top 10 and Top 20 hit rates with all eligible players.'},{property:'og:title',content:'Historical Backtest | NFL Breakout Radar'},{property:'og:description',content:'An honest historical check of NFL breakout rankings versus the random-pick baseline.'},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary_large_image'}]}),
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
  const summary = summarizeBacktests(seasons);
  return <AppShell>
    <div className="eyebrow"><ChartColumn size={14}/> Historical validation</div>
    <h1 className="page-title">Breakout model backtest</h1>
    <p className="subtitle">Rankings frozen at Week 10. Outcomes measured in Weeks 11–18 (through Week 17 in 2019–2020).</p>
    <div className="backtest-stats">{seasons.map(s=><div className="stat-card" key={s.season}>
      <div className="stat-label"><span>{s.season} SEASON · TOP 20</span><ChartColumn size={16}/></div>
      <div className="flex items-baseline flex-wrap gap-x-4 gap-y-2 my-4"><strong className="backtest-rate text-primary">{percent(s.top20.rate)}</strong><span className="text-muted-foreground">vs <strong className="text-foreground text-xl">{percent(s.baseline.rate)}</strong> baseline</span></div>
      <div className="flex flex-wrap justify-between gap-3 text-sm"><span className="text-muted-foreground">{s.top20.hits}/{s.top20.total} Top 20 hits · {s.baseline.hits}/{s.baseline.total} eligible hits</span><strong className="text-primary">{s.baseline.rate && s.top20.rate !== null ? `${(s.top20.rate/s.baseline.rate).toFixed(2)}× random` : 'Lift unavailable'}</strong></div>
      <div className="mt-4 pt-3 border-t border-border text-sm text-muted-foreground">Top 10: <strong className="text-foreground">{percent(s.top10.rate)}</strong> ({s.top10.hits}/{s.top10.total}) · {s.lift === null ? 'lift unavailable' : `${s.lift.toFixed(2)}× random`}</div>
    </div>)}</div>
    <section className="backtest-section"><h2 className="section-heading">Does the model beat simpler rankings?</h2><p className="text-muted-foreground text-sm mt-3 mb-5">Same eligible players. Same Week 10 cutoff. Same breakout definition. No Weeks 11–18 data is used to rank players.</p>
      <div className="table-wrap"><table className="radar-table"><thead><tr><th>Season</th><th>Ranking</th><th>Top 20 hit rate</th><th>Top 10 hit rate</th><th>Top 20 vs random</th></tr></thead><tbody>{summary.benchmarks.map(b=><tr key={`combined-${b.id}`} className="font-semibold"><td>2019–2025 combined</td><td className={b.id==='model'?'text-primary':'text-foreground'}>{b.label}</td><td>{percent(b.top20.rate)} <span className="text-muted-foreground text-xs">({b.top20.hits}/{b.top20.total})</span></td><td>—</td><td>{b.lift===null?'—':`${b.lift.toFixed(2)}×`}</td></tr>)}{seasons.flatMap(s=>s.benchmarks.map(b=><tr key={`${s.season}-${b.id}`}><td>{s.season}</td><td className={b.id==='model'?'text-primary font-semibold':'text-foreground'}>{b.label}</td><td>{percent(b.top20.rate)} <span className="text-muted-foreground text-xs">({b.top20.hits}/{b.top20.total})</span></td><td>{percent(b.top10.rate)} <span className="text-muted-foreground text-xs">({b.top10.hits}/{b.top10.total})</span></td><td>{s.baseline.rate && b.top20.rate !== null ? `${(b.top20.rate/s.baseline.rate).toFixed(2)}×` : '—'}</td></tr>))}</tbody></table></div>
      <p className="text-muted-foreground text-sm mt-4">Combined results pool hits and selections across all seven seasons; random baseline: {percent(summary.baseline.rate)} ({summary.baseline.hits}/{summary.baseline.total} eligible player-seasons). Rates are not averages of season percentages.</p>
      <div className="mt-5 space-y-3">{seasons.map(s=>{
        const alternatives=s.benchmarks.filter(b=>b.id!=='model' && b.top20.rate!==null);
        const best=alternatives.reduce<typeof alternatives[number]|undefined>((leader,b)=>!leader || (b.top20.rate ?? 0)>(leader.top20.rate ?? 0)?b:leader,undefined);
        const delta=s.top20.rate!==null && best?.top20.rate!==null && best?.top20.rate!==undefined?(s.top20.rate-best.top20.rate)*100:null;
        return <p key={s.season} className="text-sm text-muted-foreground"><strong className="text-foreground">{s.season}: </strong>{delta===null?'Not enough data to compare.':delta>0?`Breakout Score led the strongest simple ranking (${best?.label}) by ${delta.toFixed(1)} percentage points for the Top 20.`:delta<0?`Breakout Score trailed the strongest simple ranking (${best?.label}) by ${Math.abs(delta).toFixed(1)} percentage points for the Top 20.`:`Breakout Score tied the strongest simple ranking (${best?.label}) for the Top 20.`}</p>;
      })}</div>
      <p className="text-muted-foreground text-sm mt-5 leading-relaxed">Recent PPR ranks the last three games with offensive snaps. Snap-share growth ranks the last three non-limited games versus all earlier games, excluding games below 20% snap share. Missing ranking values sort last; ties use player name, then ID. Beating random picks alone does not establish an edge over these simpler alternatives.</p>
    </section>
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