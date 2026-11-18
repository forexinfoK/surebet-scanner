/**
 * Chronological walk-forward evaluation for the football baseline.
 * Only completed matches strictly before kickoff are used.
 */
import { predictFootballMatch } from "../models/football-pipeline.js";
function outcomeIndex(m){return m.homeGoals>m.awayGoals?0:m.homeGoals===m.awayGoals?1:2}
function runFootballWalkForward(matches,options={}){
 if(!Array.isArray(matches))throw new TypeError("matches must be an array.");
 const minHistoryMatches=options.minHistoryMatches??20,minTeamVenueMatches=options.minTeamVenueMatches??3;
 const ordered=matches.filter(m=>m&&m.status==="completed"&&typeof m.dateUtc==="string"&&Number.isFinite(Date.parse(m.dateUtc))&&/(Z|[+-]\d{2}:?\d{2})$/.test(m.dateUtc)&&Number.isInteger(m.homeGoals)&&m.homeGoals>=0&&Number.isInteger(m.awayGoals)&&m.awayGoals>=0&&m.homeTeamId&&m.awayTeamId&&m.homeTeamId!==m.awayTeamId).slice().sort((a,b)=>Date.parse(a.dateUtc)-Date.parse(b.dateUtc));
 const rows=[],skipped=[];
 for(let i=0;i<ordered.length;i++){
  const match=ordered[i],history=ordered.slice(0,i);
  if(history.length<minHistoryMatches){skipped.push({event_id:match.event_id??null,reason:"insufficient_prior_history"});continue}
  try{
   const result=predictFootballMatch(history,{homeTeamId:String(match.homeTeamId),awayTeamId:String(match.awayTeamId),kickoffUtc:new Date(match.dateUtc).toISOString()},{minHistoryMatches,minTeamVenueMatches});
   const p=result.probabilities,actual=outcomeIndex(match),values=[p.home_win,p.draw,p.away_win];
   const predicted=values.reduce((best,value,index)=>value>values[best]?index:best,0);
   rows.push({event_id:match.event_id??null,dateUtc:match.dateUtc,hit:predicted===actual,brier:values.reduce((s,v,j)=>s+(v-(j===actual?1:0))**2,0),log_loss:-Math.log(Math.max(1e-15,values[actual]))});
  }catch(e){skipped.push({event_id:match.event_id??null,reason:e.message})}
 }
 const n=rows.length;
 return {method:"chronological walk-forward",model:"football-poisson-baseline",odds_used:false,input_matches:matches.length,valid_matches:ordered.length,evaluated:{sample_size:n,hit_rate:n?rows.filter(r=>r.hit).length/n:null,brier_score:n?rows.reduce((s,r)=>s+r.brier,0)/n:null,log_loss:n?rows.reduce((s,r)=>s+r.log_loss,0)/n:null},skipped_count:skipped.length,skipped_reasons:skipped.reduce((a,x)=>(a[x.reason]=(a[x.reason]||0)+1,a),{}),rows};
}
export {runFootballWalkForward};
