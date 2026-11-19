import { predictFootballMatch } from "./src/models/football-pipeline.js";
import { normalizeMatch } from "./src/adapters/openligadb.js";
const API="https://api.openligadb.de";
const TZ="Europe/Vienna";
const TARGETS=[
 {id:"eng-prem",name:"England · Premier League",aliases:["Premier League"]},
 {id:"esp-laliga",name:"Spanien · LaLiga",aliases:["LaLiga","Primera Division"]},
 {id:"ger-bundesliga",name:"Deutschland · Bundesliga",aliases:["1. deutsche bundesliga","1. bundesliga"]},
 {id:"ita-serie-a",name:"Italien · Serie A",aliases:["Serie A"]},
 {id:"fra-ligue-1",name:"Frankreich · Ligue 1",aliases:["Ligue 1"]},
 {id:"ned-eredivisie",name:"Niederlande · Eredivisie",aliases:["Eredivisie"]},
 {id:"por-primeira",name:"Portugal · Primeira Liga",aliases:["Primeira Liga","Liga Portugal"]},
 {id:"aut-bundesliga",name:"Österreich · Bundesliga",aliases:["österreichische bundesliga","admiral bundesliga"]},
 {id:"bel-pro-league",name:"Belgien · Pro League",aliases:["jupiler pro league","pro league belgium"]},
 {id:"sui-super-league",name:"Schweiz · Super League",aliases:["schweizer super league","credit suisse super league"]}
];
const $=id=>document.getElementById(id);
const dayKey=d=>new Intl.DateTimeFormat("en-CA",{timeZone:TZ,year:"numeric",month:"2-digit",day:"2-digit"}).format(d);
const fmt=d=>new Intl.DateTimeFormat("de-AT",{timeZone:TZ,dateStyle:"short",timeStyle:"short"}).format(new Date(d));
const norm=s=>String(s||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g," ").trim();
async function json(url){const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),12000);try{const r=await fetch(url,{headers:{Accept:"application/json"},cache:"no-store",signal:controller.signal});if(!r.ok)throw Error("HTTP "+r.status+" bei "+url);const data=await r.json();return data}finally{clearTimeout(timer)}}
function findLeague(list,target){
 const names=list.map(l=>({league:l,name:norm(l.leagueName||l.LeagueName),shortcut:norm(l.leagueShortcut||l.LeagueShortcut)}));
 const aliases=target.aliases.map(norm);
 for(const alias of aliases){const exact=names.filter(x=>x.name===alias);if(exact.length===1)return exact[0].league}
 // Community league names can contain season sponsors or branding. Accept a
 // substring only when it identifies exactly one league in that season.
 for(const alias of aliases){const matches=names.filter(x=>x.name.includes(alias));if(matches.length===1)return matches[0].league}
 return null
}
function mapMatch(m,shortcut,season,nowMs=Date.now()){
 const normalized=normalizeMatch(m,{
  leagueShortcut:shortcut,
  season,
  nowMs,
  fetchedAtUtc:new Date(nowMs).toISOString()
 });
 return {...normalized,competition:shortcut,raw:m};
}
async function scan(){
 const diagnostics=[];const now=new Date();const currentYear=now.getUTCFullYear();const localMonth=Number(new Intl.DateTimeFormat("en",{timeZone:TZ,month:"numeric"}).format(now));const seasonStartYear=localMonth>=7?currentYear:currentYear-1;const seasonYears=[seasonStartYear,seasonStartYear-1,seasonStartYear-2,seasonStartYear-3];
 const leagueMaps=new Map();let fixtures=[];let completed=0;let errors=0;
 const overviews=await Promise.all(seasonYears.map(async y=>{try{const a=await json(API+"/getavailableleagues/"+y);diagnostics.push("Ligaübersicht "+y+": "+a.length+" Einträge");return [y,a]}catch(e){diagnostics.push("Ligaübersicht "+y+": "+e.message);errors++;return [y,[]]}}));
 const jobs=[];
 for(const target of TARGETS){
  const entries=[];
  for(const [year,list] of overviews){const l=findLeague(list,target);if(l)entries.push({year,league:l})}
  if(!entries.length){diagnostics.push(target.name+": keine eindeutige Liga-Zuordnung gefunden");continue}
  const unique=new Map(entries.map(x=>[String(x.league.leagueShortcut||x.league.LeagueShortcut)+"|"+x.year,x]));
  for(const {year,league} of unique.values()){
   const shortcut=league.leagueShortcut||league.LeagueShortcut;
   jobs.push({target,year,shortcut});
  }
 }
 // Four concurrent requests stay comfortably below the documented API limit
 // while avoiding the former long serial loop across every competition/season.
 let cursor=0;
 const workers=Array.from({length:Math.min(4,jobs.length)},async()=>{
  while(cursor<jobs.length){
   const job=jobs[cursor++];
   const {target,year,shortcut}=job;
   try{
    const rows=await json(API+"/getmatchdata/"+encodeURIComponent(shortcut)+"/"+year);
    if(!Array.isArray(rows))throw Error("Spielplan ist kein Array");
    const fetchedAt=Date.now();
    const mapped=rows.map(m=>mapMatch(m,shortcut,year,fetchedAt)).filter(m=>m.data_quality?.eligible&&m.id!=null&&m.dateUtc&&m.homeTeamId&&m.awayTeamId&&m.homeTeamId!==m.awayTeamId);
    fixtures.push(...mapped.map(match=>({...match,competition:target.id,competition_name:target.name,source_league_shortcut:shortcut})));
    completed+=mapped.filter(m=>m.status==="completed"&&Number.isInteger(m.homeGoals)&&Number.isInteger(m.awayGoals)).length;
    const missingSourceTimestamps=mapped.filter(m=>m.data_quality?.reasons?.includes("SOURCE_TIMESTAMP_MISSING")).length;
    diagnostics.push(target.name+" / "+year+" ("+shortcut+"): "+mapped.length+" valide Spiele, davon "+mapped.filter(m=>m.status==="completed"&&Number.isInteger(m.homeGoals)&&Number.isInteger(m.awayGoals)).length+" mit Ergebnis; "+missingSourceTimestamps+" ohne Quell-Aktualisierungszeitpunkt");
   }catch(e){errors++;diagnostics.push(target.name+" / "+year+": "+e.message)}
  }
 });
 await Promise.all(workers);
 const seen=new Set();fixtures=fixtures.filter(m=>{const k=m.competition+"|"+m.id;if(seen.has(k))return false;seen.add(k);return true});
 const todays=fixtures.filter(m=>m.status==="scheduled"&&Number.isFinite(Date.parse(m.dateUtc))&&dayKey(new Date(m.dateUtc))===dayKey(now));
 const historyByComp=new Map();
 for(const m of fixtures)if(m.status==="completed"&&Number.isInteger(m.homeGoals)&&Number.isInteger(m.awayGoals)){if(!historyByComp.has(m.competition))historyByComp.set(m.competition,[]);historyByComp.get(m.competition).push({...m,dateUtc:new Date(m.dateUtc).toISOString()})}
 const picks=[];const doublePicks=[];let rejectedPredictions=0;
 for(const m of todays){
  const history=historyByComp.get(m.competition)||[];
  try{
   const p=predictFootballMatch(history,{homeTeamId:m.homeTeamId,awayTeamId:m.awayTeamId,kickoffUtc:m.dateUtc},{minHistoryMatches:20,minTeamVenueMatches:3});
   const probs=p.probabilities;const sorted=[["1","Heimsieg",probs.home_win],["X","Unentschieden",probs.draw],["2","Auswärtssieg",probs.away_win]].sort((a,b)=>b[2]-a[2]);
   const best=sorted[0];if(best[2]>=.65)picks.push({match:m,selection:best[1],probability:best[2],probabilities:probs,history:history.length});
   for(const [selection,label,probability] of [["1X","Heim oder Unentschieden",probs.double_chance_1x],["X2","Unentschieden oder Auswärts",probs.double_chance_x2],["12","Kein Unentschieden",probs.double_chance_12]]) if(probability>=.65) doublePicks.push({match:m,selection:selection+" · "+label,probability,history:history.length});
  }catch(e){rejectedPredictions++;diagnostics.push(m.homeName+" – "+m.awayName+": keine Prognose ("+e.message+")")}
 }
 picks.sort((a,b)=>new Date(a.match.dateUtc)-new Date(b.match.dateUtc)||b.probability-a.probability);
 doublePicks.sort((a,b)=>new Date(a.match.dateUtc)-new Date(b.match.dateUtc)||b.probability-a.probability);
 return {fixtures,todays,picks,doublePicks,completed,errors,rejectedPredictions,diagnostics};
}
function render(result){
 $("summary").innerHTML="<div><b>"+result.todays.length+"</b><small>Spiele heute</small></div><div><b>"+result.completed+"</b><small>Historische Spiele</small></div><div><b>"+result.picks.length+"</b><small>Prognosen ≥ 65 %</small></div>";
 const root=$("results");root.replaceChildren();root.classList.toggle("empty",!result.picks.length);
 if(!result.picks.length){root.textContent="Keine belastbaren Prognosen für heute. Entweder fehlen Spiele, ausreichende Historie oder die 65-%-Schwelle wird nicht erreicht."}
 for(const p of result.picks){const el=document.createElement("article");el.className="card";el.innerHTML="<div class='meta'></div><h3></h3><div class='pick'></div><div class='prob'></div><div class='meta'></div>";const [meta,teams,pick,prob,foot]=el.children;meta.textContent=p.match.competition+" · "+fmt(p.match.dateUtc);teams.textContent=p.match.homeName+" – "+p.match.awayName;pick.textContent=p.selection;prob.textContent=(p.probability*100).toFixed(1)+" % Modellwahrscheinlichkeit";foot.textContent=p.history+" historische Spiele · Poisson-Modell · keine Quote verwendet";root.append(el)}
 const dc=$("doubleResults");if(dc){dc.replaceChildren();dc.classList.toggle("empty",!result.doublePicks.length);if(!result.doublePicks.length)dc.textContent="Keine Doppelte-Chance-Prognose erreicht 65 %.";for(const p of result.doublePicks){const el=document.createElement("article");el.className="card";const meta=document.createElement("div");meta.className="meta";meta.textContent=p.match.competition+" · "+fmt(p.match.dateUtc);const teams=document.createElement("h3");teams.textContent=p.match.homeName+" – "+p.match.awayName;const pick=document.createElement("div");pick.className="pick";pick.textContent=p.selection;const prob=document.createElement("div");prob.className="prob";prob.textContent=(p.probability*100).toFixed(1)+" % Modellwahrscheinlichkeit";const foot=document.createElement("div");foot.className="meta";foot.textContent=p.history+" historische Spiele · aus 1X2 abgeleitet";el.append(meta,teams,pick,prob,foot);dc.append(el)}}
 $("diagnostics").textContent=result.diagnostics.join("\n");
}
$("scan").addEventListener("click",async()=>{const b=$("scan");b.disabled=true;$("status").textContent="Rufe Ligen, Spielpläne und historische Ergebnisse ab …";try{const r=await scan();render(r);$("status").textContent="Suchlauf abgeschlossen. "+r.fixtures.length+" Spiele geladen; "+r.errors+" Abruffehler; "+r.rejectedPredictions+" Spiele wegen unzureichender Historie ausgelassen. Keine künstlich erzeugten Tipps."}catch(e){$("status").textContent="Scannerfehler: "+e.message;$("diagnostics").textContent=e.stack||e.message}finally{b.disabled=false}});
function updateClock(){$("clock").textContent=new Intl.DateTimeFormat("de-AT",{timeZone:TZ,dateStyle:"medium",timeStyle:"short"}).format(new Date())}
updateClock();setInterval(updateClock,30000);
