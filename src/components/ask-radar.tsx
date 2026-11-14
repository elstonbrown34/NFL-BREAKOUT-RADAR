import { useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { ArrowUpRight,LoaderCircle,Search,Sparkles,X } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { askRadar } from '@/lib/radar.functions';
import { filterChips,removeChip,type RadarFilters } from '@/lib/radar-filters';
const EXAMPLES=['Wide receivers with elite role scores','Running backs rising in the last 3 weeks','Tight ends with rising opportunity on bad teams','Top 10 breakout candidates under 10 PPR per game'];
export function AskRadar({filters,onChange,cutoffWeek,disabled}:{filters:RadarFilters;onChange:(filters:RadarFilters)=>void;cutoffWeek:number;disabled:boolean}) {
  const [question,setQuestion]=useState('');
  const [pending,setPending]=useState(false);
  const [error,setError]=useState('');
  const search=useServerFn(askRadar);
  const chips=filterChips(filters);
  async function submit(value:string) {
    if(pending||disabled||!value.trim()) return;
    setQuestion(value);setPending(true);setError('');
    try {
      const result=await search({data:{question:value,season:2026,cutoffWeek}});
      if('error' in result) setError(result.error);
      else onChange(result.filters);
    }catch{setError('Search is temporarily unavailable. Please try again.');}
    finally{setPending(false);}
  }
  return <section className="ask-radar" aria-labelledby="ask-radar-heading">
    <div className="flex items-center justify-between gap-3 mb-3"><h3 id="ask-radar-heading" className="flex items-center gap-2 font-semibold text-base"><Sparkles size={17} className="text-primary"/>Ask the Radar</h3><span className="text-xs text-muted-foreground">{cutoffWeek?`Week ${cutoffWeek}`:'Awaiting data'}</span></div>
    <form onSubmit={e=>{e.preventDefault();void submit(question);}} className="ask-form">
      <div className="relative min-w-0 flex-1"><Search size={18} className="absolute left-3 top-3 text-muted-foreground pointer-events-none"/><Input aria-label="Ask the Radar" placeholder="Ask the Radar... e.g. tight ends with rising opportunity on bad teams" value={question} maxLength={200} onChange={e=>setQuestion(e.target.value)} disabled={pending||disabled} className="h-11 pl-10 bg-card"/></div>
      <Button type="submit" disabled={pending||disabled||!question.trim()} className="h-11 shrink-0">{pending?<LoaderCircle className="animate-spin"/>:<ArrowUpRight/>}{pending?'Searching':'Ask'}</Button>
    </form>
    <div className="ask-examples">{EXAMPLES.map(example=><Button key={example} variant="ghost" size="sm" disabled={pending||disabled} onClick={()=>void submit(example)} className="ask-example"><ArrowUpRight size={12}/>{example}</Button>)}</div>
    {pending&&<p role="status" className="text-muted-foreground text-xs mt-3">Interpreting your question…</p>}
    {error&&<p role="alert" className="text-destructive text-sm mt-3">{error}</p>}
    {!!chips.length&&<div className="filter-chips" aria-label="Applied filters">{chips.map(chip=><Button key={chip.id} variant="outline" size="sm" disabled={pending} className="filter-chip" aria-label={`Remove ${chip.label}`} onClick={()=>onChange(removeChip(filters,chip))}>{chip.label}<X size={13}/></Button>)}<Button variant="ghost" size="sm" disabled={pending} onClick={()=>onChange({})}>Clear all</Button></div>}
    {filters.unsupported&&<p className="text-xs text-muted-foreground mt-3">Ignored: {filters.unsupported}</p>}
  </section>;
}