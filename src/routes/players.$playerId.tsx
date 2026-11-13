import { createFileRoute, Link, notFound } from '@tanstack/react-router';
import { useSuspenseQuery } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { AppShell } from '@/components/app-shell';
import { Button } from '@/components/ui/button';
import { Headshot, ScoreDisplay } from '@/components/score-display';
import { playerScoreOptions } from '@/lib/scores.queries';
export const Route = createFileRoute('/players/$playerId')({
  validateSearch: (s:Record<string,unknown>) => ({season:([2024,2025,2026].includes(Number(s['season'])) ? Number(s['season']) : 2026) as 2024 | 2025 | 2026,cutoffWeek:Number.isInteger(Number(s['cutoffWeek'])) && Number(s['cutoffWeek']) >= 1 && Number(s['cutoffWeek']) <= 18 ? Number(s['cutoffWeek']) : 10}),
  loaderDeps: ({search}) => search,
  loader: async ({context,params,deps}) => {
    const data = await context.queryClient.ensureQueryData(playerScoreOptions(params.playerId,deps.cutoffWeek,deps.season));
    if (!data.player) throw notFound();
    return data;
  },
  head: ({loaderData}) => ({meta:[{title:`${loaderData?.player?.player_name ?? 'Player'} | NFL Breakout Radar`},{name:'description',content:`${loaderData?.player?.player_name ?? 'NFL player'} breakout analysis, role, opportunity, efficiency and weekly performance.`},{property:'og:title',content:`${loaderData?.player?.player_name ?? 'Player'} | NFL Breakout Radar`},{property:'og:description',content:'Position-relative breakout score and cutoff-based weekly NFL performance.'},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary_large_image'}]}),
  component: PlayerPage,
});
function PlayerPage() {
  const {playerId} = Route.useParams();
  const {season,cutoffWeek} = Route.useSearch();
  const {data} = useSuspenseQuery(playerScoreOptions(playerId,cutoffWeek,season));
  const player = data.player;
  if (!player) return null;
  return <AppShell><Button asChild variant="ghost" size="sm" className="mb-6"><Link to="/" search={{season:2026}}><ArrowLeft/>Back to Radar</Link></Button>
    <div className="flex items-center gap-5"><Headshot large url={player.headshot_url} name={player.player_name}/><div><div className="eyebrow">{player.team} · {player.position} · Rank {player.rank}</div><h1 className="page-title">{player.player_name}</h1><p className="subtitle">Data through Week {cutoffWeek} of the {season} season.</p></div></div>
    <div className="stat-grid">{[{label:'Breakout Score',value:<ScoreDisplay value={player.breakout_score}/>},{label:'Role',value:player.role_score.toFixed(1)},{label:'Opportunity',value:player.opportunity_score.toFixed(1)},{label:'Efficiency',value:player.efficiency_score.toFixed(1)}].map(s => <div className="stat-card" key={s.label}><div className="stat-label">{s.label}</div><div className="stat-value">{s.value}</div></div>)}</div>
    <dl className="detail-grid"><div className="detail-metric"><dt>Games with offensive snaps</dt><dd>{player.games}</dd></div><div className="detail-metric"><dt>PPR points per game</dt><dd>{player.ppg.toFixed(1)}</dd></div><div className="detail-metric"><dt>Average snap share</dt><dd>{(player.avg_snap_pct*100).toFixed(1)}%</dd></div><div className="detail-metric"><dt>Position comparison</dt><dd>{player.position}</dd></div></dl>
    <h2 className="section-heading mb-4">Weekly performance</h2><div className="table-wrap"><table className="radar-table"><thead><tr><th>Week</th><th>Team</th><th>Offensive snaps</th><th>Snap share</th><th>Targets</th><th>Carries</th><th>Target share</th><th>PPR</th></tr></thead><tbody>{data.weeks.map(w => <tr key={w.week}><td>{w.week}</td><td>{w.team}</td><td>{w.offense_snaps ?? '—'}</td><td>{w.offense_pct === null ? '—' : `${(w.offense_pct*100).toFixed(1)}%`}</td><td>{w.targets ?? '—'}</td><td>{w.carries ?? '—'}</td><td>{w.target_share === null ? '—' : `${(w.target_share*100).toFixed(1)}%`}</td><td>{w.fantasy_points_ppr?.toFixed(1) ?? '—'}</td></tr>)}</tbody></table></div>
  </AppShell>;
}