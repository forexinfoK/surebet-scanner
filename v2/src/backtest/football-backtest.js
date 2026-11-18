/**
 * Chronological, competition-isolated walk-forward evaluation.
 * Only completed matches in the same competition and strictly before kickoff
 * may enter a prediction's history. Odds are never used.
 */
import { predictFootballMatch } from "../models/football-pipeline.js";
function outcomeIndex(m){return m.homeGoals>m.awayGoals?0:m.homeGoals===m.awayGoals?1:2}
function runFootballWalkForward(matches,options={}){
 if(!Array.isArray(matches))throw new TypeError("matches must be an array.");
 const minHistoryMatches=options.minHistoryMatches??20,minTeamVenueMatches=options.minTeamVenueMatches??3;
 const valid=matches.filter(m=>m&&m.status==="completed"&&typeof m.dateUtc==="string"&&Number.isFinite(Date.parse(m.dateUtc))&&/(Z|[+-]\d{2}:?\d{2})$/.test(m.dateUtc)&&Number.isInteger(m.homeGoals)&&m.homeGoals>=0&&Number.isInteger(m.awayGoals)&&m.awayGoals>=0&&m.homeTeamId!=null&&m.awayTeamId!=null&&String(m.homeTeamId).trim()!==""&&String(m.awayTeamId).trim()!==""&&String(m.homeTeamId)!==String(m.awayTeamId)&&typeof(m.competition??"default")==="string");
 const groups=new Map();
 for(const m of valid){const key=m.competition??"default";if(!groups.has(key))groups.set(key,[]);groups.get(key).push(m)}
 const rows=[],skipped=[];
 for(const [competition,group] of groups){
  group.sort((a,b)=>Date.parse(a.dateUtc)-Date.parse(b.dateUtc));
  for(const match of group){
   const kickoff=Date.parse(match.dateUtc);
   // Strictly earlier kickoff prevents same-time fixtures leaking into each other.
   const history=group.filter(m=>Date.parse(m.dateUtc)<kickoff);
   if(history.length<minHistoryMatches){skipped.push({event_id:match.event_id??null,competition,reason:"insufficient_prior_history"});continue}
   try{
    const result=predictFootballMatch(history,{homeTeamId:String(match.homeTeamId),awayTeamId:String(match.awayTeamId),kickoffUtc:new Date(kickoff).toISOString()},{minHistoryMatches,minTeamVenueMatches});
    const p=result.probabilities,actual=outcomeIndex(match),values=[p.home_win,p.draw,p.away_win];
    if(values.some(v=>!Number.isFinite(v)||v<0||v>1)||Math.abs(values.reduce((s,v)=>s+v,0)-1)>1e-8)throw Error("Model probabilities are invalid or do not sum to 1.");
    const predicted=values.reduce((best,value,index)=>value>values[best]?index:best,0);
    rows.push({event_id:match.event_id??null,competition,dateUtc:match.dateUtc,hit:predicted===actual,brier:values.reduce((s,v,j)=>s+(v-(j===actual?1:0))**2,0),log_loss:-Math.log(Math.max(1e-15,values[actual]))});
   }catch(e){skipped.push({event_id:match.event_id??null,competition,reason:e.message})}
  }
 }
 rows.sort((a,b)=>Date.parse(a.dateUtc)-Date.parse(b.dateUtc));
 const n=rows.length;
 const byCompetition={};
 for(const competition of groups.keys()){
  const subset=rows.filter(r=>r.competition===competition),count=subset.length;
  byCompetition[competition]={sample_size:count,hit_rate:count?subset.filter(r=>r.hit).length/count:null,brier_score:count?subset.reduce((s,r)=>s+r.brier,0)/count:null,log_loss:count?subset.reduce((s,r)=>s+r.log_loss,0)/count:null};
 }
 return {method:"chronological competition-isolated walk-forward",model:"football-poisson-baseline",odds_used:false,input_matches:matches.length,valid_matches:valid.length,evaluated:{sample_size:n,hit_rate:n?rows.filter(r=>r.hit).length/n:null,brier_score:n?rows.reduce((s,r)=>s+r.brier,0)/n:null,log_loss:n?rows.reduce((s,r)=>s+r.log_loss,0)/n:null},by_competition:byCompetition,skipped_count:skipped.length,skipped_reasons:skipped.reduce((a,x)=>(a[x.reason]=(a[x.reason]||0)+1,a),{}),rows};
}
export {runFootballWalkForward};
