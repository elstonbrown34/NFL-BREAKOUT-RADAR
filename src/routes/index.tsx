import { createFileRoute, Link } from '@tanstack/react-router';
import { useSuspenseQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Users, TrendingUp, Activity, Radar, ChevronRight, X as XIcon } from 'lucide-react';
import { AppShell } from '@/components/app-shell';
import { Button } from '@/components/ui/button';
import { Headshot, ScoreDisplay } from '@/components/score-display';
import { scoresOptions } from '@/lib/scores.queries';
import field from '@/assets/football-field.jpg';
import { PageError, PageNotFound } from '@/components/page-states';
import { AskRadar } from '@/components/ask-radar';
import { applyRadarFilters,RADAR_TEAMS,restrictiveChip,removeChip,type RadarFilters } from '@/lib/radar-filters';

export const Route = createFileRoute('/')({
  validateSearch: () => ({ season: 2026 as const }),
  loader: ({ context }) => context.queryClient.ensureQueryData(scoresOptions),
  head: () => ({ meta: [{ title:'NFL Breakout Radar | 2026 Breakout Scores' },{ name:'description',content:'Rank under-the-radar NFL receivers, tight ends and running backs using position-relative role, opportunity and efficiency scores.' },{ property:'og:title',content:'NFL Breakout Radar | 2026 Breakout Scores' },{ property:'og:description',content:'Discover the next NFL breakout with percentile-based player rankings through the latest loaded week.' },{ property:'og:type',content:'website' },{ name:'twitter:card',content:'summary_large_image' }] }),
  component: RadarPage,
  errorComponent: PageError,
  notFoundComponent: PageNotFound,
});
function RadarPage() {
  const { data } = useSuspenseQuery(scoresOptions);
  const [filters,setFilters] = useState<RadarFilters>({});
  const [limit,setLimit] = useState(25);
  const position=filters.positions?.length===1?filters.positions[0]:filters.positions?.length?'MULTIPLE':'ALL';
  const team=filters.teams?.length===1?filters.teams[0]:filters.teams?.length?'MULTIPLE':'ALL';
  const updateFilters=(next:RadarFilters)=>{setFilters(next);setLimit(25);};
  const players=applyRadarFilters(data.players,filters);
  const suggestion=!players.length?restrictiveChip(data.players,filters):undefined;
  return <AppShell>
    <div className="flex flex-wrap items-start justify-between gap-5"><div><div className="eyebrow"><span className="live-dot"/> Opportunity intelligence</div><h1 className="page-title">NFL Breakout Radar</h1><p className="subtitle">Who's about to break out, before the box score shows it.</p><p className="hero-note">Every receiver, tight end and running back is scored on role, opportunity and efficiency — then ranked against players at the same position.</p></div><div className="hero-ask"><span className="season-label">2026 REGULAR SEASON</span><AskRadar filters={filters} onChange={updateFilters} cutoffWeek={data.cutoffWeek} disabled={!data.computedAt}/></div></div>
    <div className="stat-grid">{[
      {label:'Eligible players',value:data.players.length,icon:Users},
      {label:'Leading Breakout Score',value:data.players[0]?.breakout_score.toFixed(1) ?? '—',icon:TrendingUp},
      {label:'Position groups',value:'WR / TE / RB',icon:Radar},
      {label:'Data cutoff',value:data.cutoffWeek ? `WK ${data.cutoffWeek}` : '—',icon:Activity},
    ].map(s => <div className="stat-card" key={s.label}><div className="stat-label">{s.label}<s.icon size={16}/></div><div className="stat-value">{s.value}</div></div>)}</div>
    <section className="field-band"><img src={field} alt="Football on the turf at a stadium" width={1536} height={512}/><div className="field-copy"><div className="eyebrow">THE OPPORTUNITY EDGE</div><h2>Growing roles. Bigger possibilities.</h2><p>Role 40% · Opportunity 40% · Efficiency 20%</p></div></section>
    <div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="section-heading">Breakout leaderboard</h2><p className="text-muted-foreground text-sm mt-2">{data.cutoffWeek ? `Data through Week ${data.cutoffWeek} of the 2026 season.` : '2026 season data has not been loaded.'}</p></div><span className="text-muted-foreground text-xs">{players.length} players</span></div>
    <div className="toolbar"><div className="segment">{(['ALL','WR','TE','RB'] as const).map(p => <Button key={p} size="sm" variant={position === p || filters.positions?.some(v=>v===p) ? 'secondary' : 'ghost'} className={position === p || filters.positions?.some(v=>v===p) ? 'text-primary' : 'text-muted-foreground'} onClick={() => updateFilters({...filters,positions:p==='ALL'?undefined:[p]})}>{p === 'ALL' ? 'All positions' : p}</Button>)}</div><label className="flex items-center gap-3 text-muted-foreground text-xs">TEAM<select className="select-control" aria-label="Team" value={team} onChange={e => updateFilters({...filters,teams:RADAR_TEAMS.filter(t=>t===e.target.value)})}><option value="ALL">All teams</option>{team==='MULTIPLE'&&<option value="MULTIPLE" disabled>Selected teams ({filters.teams?.length})</option>}{RADAR_TEAMS.map(t => <option key={t} value={t}>{t === 'LA' ? 'LAR' : t}</option>)}</select></label></div>
    <div className="table-wrap"><table className="radar-table breakout-table"><thead><tr><th>Rank</th><th>Headshot</th><th>Player</th><th>Position</th><th>Team</th><th>Breakout Score</th><th>Role</th><th>Opportunity</th><th>Efficiency</th><th>PPR / G</th><th/></tr></thead><tbody>{players.slice(0,limit).map(p => <tr key={p.player_id}><td className="rank">{String(p.rank).padStart(2,'0')}</td><td><Headshot url={p.headshot_url} name={p.player_name}/></td><td><Link className="player-name text-foreground" to="/player/$playerId" params={{playerId:p.player_id}} search={{season:2026,cutoffWeek:data.cutoffWeek}}>{p.player_name}</Link></td><td><span className={`position-tag ${p.position}`}>{p.position}</span></td><td className="text-muted-foreground">{p.team}</td><td><ScoreDisplay value={p.breakout_score}/></td><td>{p.role_score.toFixed(1)}</td><td>{p.opportunity_score.toFixed(1)}</td><td>{p.efficiency_score.toFixed(1)}</td><td>{p.ppg.toFixed(1)}</td><td><Button variant="ghost" size="icon" asChild><Link to="/player/$playerId" params={{playerId:p.player_id}} search={{season:2026,cutoffWeek:data.cutoffWeek}} aria-label={`View ${p.player_name}`}><ChevronRight/></Link></Button></td></tr>)}</tbody></table>
    {!players.length && <div className="empty-state"><Radar size={40} className="mx-auto text-primary"/><h3>{!data.computedAt ? 'This season is getting ready' : 'No players match all of these filters'}</h3><p>{!data.computedAt ? 'Scores are not available yet. Historical results are ready to explore.' : suggestion?`Try removing “${suggestion.label}”.`:'Try removing a filter.'}</p>{!data.computedAt ? <Button asChild className="mt-5" variant="outline"><Link to="/backtest">Explore the backtest<ChevronRight/></Link></Button> : <Button className="mt-5" variant="outline" onClick={()=>updateFilters(suggestion?removeChip(filters,suggestion):{})}>{suggestion?`Remove ${suggestion.label}`:'Clear filters'}<XIcon/></Button>}</div>}</div>
    <div className="flex items-center justify-between gap-3 mt-4 text-xs text-muted-foreground"><span>Showing {Math.min(limit,players.length)} of {players.length} players</span>{players.length > limit && <Button variant="outline" size="sm" onClick={() => setLimit(limit+25)}>Load more<ChevronRight/></Button>}</div>
  </AppShell>;
}
