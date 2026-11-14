import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { searchInput,filtersSchema,normalizeQuestion,ASK_SYSTEM,ASK_ERROR,applyRadarFilters,type RadarFilters } from './radar-filters';

export type AskResult={filters:RadarFilters;cached:boolean}|{error:string};
// Bounded maintenance for already-loaded seasons; fixed nflverse source and atomic cooldown.
export const refreshRadarStandings=createServerFn({method:'POST'}).inputValidator(searchInput.pick({season:true,cutoffWeek:true})).handler(async({data})=>{
  const {publicClient}=await import('./nfl.server');
  const latest=await publicClient().from('player_weeks').select('week').eq('season',data.season).order('week',{ascending:false}).limit(1).maybeSingle();
  if(latest.error||!latest.data||data.cutoffWeek>latest.data.week) throw new Error('Choose a loaded week.');
  const {syncTeamQuality}=await import('./radar-standings.server');
  await syncTeamQuality(data.season,data.cutoffWeek);
  return {success:true};
});
export const askRadar=createServerFn({method:'POST'}).inputValidator(searchInput).handler(async({data}):Promise<AskResult>=>{
  const {getCookie,setCookie,getRequest,setResponseHeader}=await import('@tanstack/react-start/server');
  setResponseHeader('Cache-Control','no-store');
  const {supabaseAdmin:db}=await import('@/integrations/supabase/client.server');
  const cookie=getCookie('radar_visitor');
  const visitor=z.string().uuid().safeParse(cookie);
  const visitorId=visitor.success?visitor.data:crypto.randomUUID();
  if(!visitor.success) setCookie('radar_visitor',visitorId,{httpOnly:true,secure:new URL(getRequest().url).protocol==='https:',sameSite:'lax',maxAge:60*60*24*365,path:'/'});
  const allowed=await db.rpc('claim_radar_search',{p_visitor:visitorId});
  if(allowed.error) return {error:'Search is temporarily unavailable. Please try again.'};
  if(!allowed.data) return {error:'You’ve reached 20 searches this hour. Please try again later.'};
  const question=normalizeQuestion(data.question);
  const key={season:data.season,cutoff_week:data.cutoffWeek,question};
  const {publicClient}=await import('./nfl.server');
  const latest=await publicClient().from('player_weeks').select('week').eq('season',data.season).order('week',{ascending:false}).limit(1).maybeSingle();
  if(latest.error||!latest.data||latest.data.week!==data.cutoffWeek) return {error:'The data week changed. Refresh the leaderboard before searching.'};
  const {radarContext}=await import('./radar-context.server');
  const players=await radarContext(data.season,data.cutoffWeek);
  const log=async(returned:unknown,passed:boolean,cached:boolean,filters?:RadarFilters)=>{
    // JSON roundtrip narrows untrusted model output to database JSON without accepting caller rows.
    const returnedJson=z.union([z.string(),z.record(z.unknown())]).safeParse(returned);
    const result=await db.from('radar_queries').insert({...key,returned_json:returnedJson.success?JSON.parse(JSON.stringify(returnedJson.data)):null,validation_passed:passed,result_count:filters?applyRadarFilters(players,filters).length:0,cached});
    if(result.error) console.error('Radar query logging failed',result.error.message);
  };
  const existing=await db.from('radar_question_cache').select('filters,status').match(key).maybeSingle();
  if(existing.error) return {error:'Search is temporarily unavailable. Please try again.'};
  if(existing.data) {
    const parsed=filtersSchema.safeParse(existing.data.filters);
    await log(existing.data.filters,existing.data.status==='complete'&&parsed.success,true,parsed.success?parsed.data:undefined);
    if(existing.data.status==='complete'&&parsed.success) return {filters:parsed.data,cached:true};
    return {error:existing.data.status==='pending'?'That question is being interpreted. Please try again shortly.':ASK_ERROR};
  }
  const claim=await db.from('radar_question_cache').insert(key);
  if(claim.error) return {error:claim.error.code==='23505'?'That question is being interpreted. Please try again shortly.':'Search is temporarily unavailable. Please try again.'};
  try {
    const {generateResponse}=await import('@lovable.dev/ai-gateway');
    for(let attempt=0;attempt<2;attempt++) {
      // Retry only a successfully delivered but invalid JSON answer, never a transport/credit failure.
      const response=await generateResponse({model:'openai/gpt-6-astra',instructions:ASK_SYSTEM,input:[{role:'user',content:'Return JSON filters for this question: '+JSON.stringify(question)+(attempt?' Your previous JSON failed validation. Return only the allowed fields with valid values.':'')}],text:{format:{type:'json_object'}}});
      const text=response.output.flatMap(item=>item.type==='message'?item.content.flatMap(c=>c.type==='output_text'?[c.text]:[]):[]).join('');
      if(response.output.some(item=>item.type==='message'&&item.content.some(c=>c.type==='refusal'))) {
        await log(text,false,false);break;
      }
      let raw:unknown;
      try{raw=JSON.parse(text);}catch{await log(text,false,false);continue;}
      const parsed=filtersSchema.safeParse(raw);
      await log(raw,parsed.success,false,parsed.success?parsed.data:undefined);
      if(parsed.success) {
        const saved=await db.from('radar_question_cache').update({filters:parsed.data,status:'complete'}).match(key);
        if(saved.error) throw new Error('Filter cache save failed');
        return {filters:parsed.data,cached:false};
      }
    }
  }catch(error){console.error('Ask the Radar failed',error instanceof Error?error.message:'Unknown failure');await log(null,false,false);}
  await db.from('radar_question_cache').update({status:'failed'}).match(key);
  return {error:ASK_ERROR};
});