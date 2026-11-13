import {useState} from 'react';
import {useQueryClient} from '@tanstack/react-query';
import {useServerFn} from '@tanstack/react-start';
import {Sparkles,RefreshCw,LoaderCircle} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {generateScoutingReport} from '@/lib/scouting.functions';
import {playerScoreOptions} from '@/lib/scores.queries';
import type {Tables} from '@/integrations/supabase/types';
export function ScoutingReport({report,season,cutoffWeek,playerId}:{report:Tables<'scouting_reports'> | null;season:2024 | 2025 | 2026;cutoffWeek:number;playerId:string}) {
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const generate=useServerFn(generateScoutingReport);
  const queryClient=useQueryClient();
  async function run() {
    setBusy(true);setError('');
    try {
      const saved=await generate({data:{season,cutoffWeek,playerId,regenerate:report!==null}});
      queryClient.setQueryData(playerScoreOptions(playerId,cutoffWeek,season).queryKey,old=>old ? {...old,report:saved}:old);
    } catch(e) {setError(e instanceof Error ? e.message:'The scouting report could not be generated.');}
    finally {setBusy(false);}
  }
  return <section className="scouting-section" aria-label="AI Scouting Report"><div className="report-heading"><div className="min-w-0"><div className="eyebrow"><Sparkles size={13}/>Player intelligence</div><h2 className="section-heading">AI Scouting Report</h2></div><Button variant={report ? 'outline':'default'} onClick={run} disabled={busy}>{busy ? <LoaderCircle className="animate-spin"/>:report ? <RefreshCw/>:<Sparkles/>}{busy ? 'Generating report…':report ? 'Regenerate':'Generate Scouting Report'}</Button></div>
    {error && <p role="alert" className="text-destructive mt-4">{error}</p>}
    {busy && <p role="status" className="text-muted-foreground mt-4">Analyzing season numbers and weekly trends…</p>}
    {!report && !busy && <p className="text-muted-foreground mt-5">No scouting report yet for this season and week.</p>}
    {report && <div className="report-body"><div><h3>Why he's on the radar</h3><p>{report.why_on_radar}</p></div><div><h3>What could stop it</h3><p>{report.risks}</p></div><div><h3>Verdict</h3><p className="report-verdict">{report.verdict}</p></div></div>}
    {report && <p className="text-xs text-muted-foreground mt-5">AI generated from the data above. Not based on news or injury reports.</p>}
  </section>;
}