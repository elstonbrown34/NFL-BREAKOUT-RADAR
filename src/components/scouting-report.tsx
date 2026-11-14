import {useEffect,useState} from 'react';
import {useServerFn} from '@tanstack/react-start';
import {Sparkles} from 'lucide-react';
import {generateScoutingReport} from '@/lib/scouting.functions';
import type {ScoutingSummary} from '@/lib/scouting-data';

export function ScoutingReport({report,season,cutoffWeek,playerId}:{report:ScoutingSummary|null;season:2024|2025|2026;cutoffWeek:number;playerId:string}) {
  const [summary,setSummary]=useState(report);
  const generate=useServerFn(generateScoutingReport);
  useEffect(()=>{
    setSummary(report);
    if (report) return;
    let active=true;
    void generate({data:{season,cutoffWeek,playerId}}).then(saved=>{if(active) setSummary(saved);}).catch(error=>{console.error('Scouting summary unavailable',error);if(active) setSummary(null);});
    return ()=>{active=false;};
  },[report,season,cutoffWeek,playerId,generate]);
  if (!summary) return null;
  return <section className="scouting-section" aria-label="AI Scouting Report">
    <div className="flex items-center justify-between flex-wrap gap-3"><h2 className="section-heading flex items-center gap-2"><Sparkles size={20} className="text-primary"/>AI Scouting Report</h2><span className="text-xs text-muted-foreground">Updated Week {cutoffWeek}</span></div>
    <div className="report-body"><div><h3>Why rising</h3><p>{summary.why_rising}</p></div><div><h3>What to watch</h3><p>{summary.what_to_watch}</p></div><div><h3>Verdict</h3><p className="report-verdict">{summary.verdict}</p></div></div>
    <p className="text-xs text-muted-foreground mt-5">AI generated from Breakout Radar data.</p>
  </section>;
}