import { predictFootballMatch } from "./src/models/football-pipeline.js";
const API="https://api.openligadb.de";
const TZ="Europe/Vienna";
const TARGETS=[
 {name:"England · Premier League",aliases:["Premier League"]},
 {name:"Spanien · LaLiga",aliases:["LaLiga","Primera Division"]},
 {name:"Deutschland · Bundesliga",aliases:["1. Bundesliga","Bundesliga"]},
 {name:"Italien · Serie A",aliases:["Serie A"]},
 {name:"Frankreich · Ligue 1",aliases:["Ligue 1"]},
 {name:"Niederlande · Eredivisie",aliases:["Eredivisie"]},
 {name:"Portugal · Primeira Liga",aliases:["Primeira Liga","Liga Portugal"]},
 {name:"Österreich · Bundesliga",aliases:["Österreichische Bundesliga","Admiral Bundesliga"]},
 {name:"Belgien · Pro League",aliases:["Pro League","Jupiler Pro League"]},
 {name:"Schweiz · Super League",aliases:["Super League"]}
];
const $=id=>document.getElementById(id);
const dayKey=d=>new Intl.DateTimeFormat("en-CA",{timeZone:TZ,year:"numeric",month:"2-digit",day:"2-digit"}).format(d);
const fmt=d=>new Intl.DateTimeFormat("de-AT",{timeZone:TZ,dateStyle:"short",timeStyle:"short"}).format(new Date(d));
const norm=s=>String(s||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g," ").trim();
async function json(url){const r=await fetch(url,{headers:{Accept:"application/json"},cache:"no-store"});if(!r.ok)throw Error("HTTP "+r.status+" bei "+url);return r.json()}
function findLeague(list,target){const aliases=target.aliases.map(norm);const found=list.map(l=>({l,n:norm(l.leagueName||l.LeagueName)})).filter(x=>aliases.some(a=>x.n===a));return found.length===1?found[0].l:null}
function mapMatch(m,shortcut,season){const home=m.team1||m.Team1,away=m.team2||m.Team2;const id1=home?.teamId??home?.TeamId,id2=away?.teamId??away?.TeamId;const start=m.matchDateTimeUTC||m.MatchDateTimeUTC;const finished=m.matchIsFinished??m.MatchIsFinished;const goals=m.matchResults||m.MatchResults||[];const final=goals.filter(x=>String(x.resultTypeID??x.ResultTypeID)==="2").slice(-1)[0]||goals.slice(-1)[0];return {id:m.matchID??m.MatchID,competition:shortcut,season:String(season),dateUtc:start,homeTeamId:id1==null?null:String(id1),awayTeamId:id2==null?null:String(id2),homeName:home?.teamName||home?.TeamName,awayName:away?.teamName||away?.TeamName,status:finished===true?"completed":finished===false&&Date.parse(start)>Date.now()?"scheduled":"unknown",homeGoals:null,awayGoals:null,raw:m}}
function score(m){const results=m.raw.matchResults||m.raw.MatchResults||[];const final=results.filter(x=>Number(x.resultTypeID??x.ResultTypeID)===2).slice(-1)[0]||results.slice(-1)[0];if(!final)return null;const h=Number(final.points??final.Points);const a=Number(final.opponentPoints??final.OpponentPoints);return Number.isInteger(h)&&Number.isInteger(a)?{homeGoals:h,awayGoals:a}:null}
function cleanMatch(m){const s=score(m);return {...m,...(s||{})}}
async function scan(){
 const diagnostics=[];const now=new Date();const currentYear=now.getUTCFullYear();const seasonYears=[currentYear,currentYear-1,currentYear-2,currentYear-3];
 const leagueMaps=new Map();let fixtures=[];let completed=0;let errors=0;
 const overviews=await Promise.all(seasonYears.map(async y=>{try{const a=await json(API+"/getavailableleagues/"+y);diagnostics.push("Ligaübersicht "+y+": "+a.length+" Einträge");return [y,a]}catch(e){diagnostics.push("Ligaübersicht "+y+": "+e.message);errors++;return [y,[]]}}));
 for(const target of TARGETS){
  const entries=[];
  for(const [year,list] of overviews){const l=findLeague(list,target);if(l)entries.push({year,league:l})}
  if(!entries.length){diagnostics.push(target.name+": keine eindeutige Liga-Zuordnung gefunden");continue}
  const unique=new Map(entries.map(x=>[String(x.league.leagueShortcut||x.league.LeagueShortcut),x]));
  for(const {year,league} of unique.values()){
   const shortcut=league.leagueShortcut||league.LeagueShortcut;
   try{
    const rows=await json(API+"/getmatchdata/"+encodeURIComponent(shortcut)+"/"+year);
    if(!Array.isArray(rows))throw Error("Spielplan ist kein Array");
    const mapped=rows.map(m=>cleanMatch(mapMatch(m,shortcut,year))).filter(m=>m.id!=null&&m.dateUtc&&m.homeTeamId&&m.awayTeamId&&m.homeTeamId!==m.awayTeamId);
    fixtures.push(...mapped);completed+=mapped.filter(m=>m.status==="completed"&&Number.isInteger(m.homeGoals)&&Number.isInteger(m.awayGoals)).length;
    diagnostics.push(target.name+" / "+year+" ("+shortcut+"): "+mapped.length+" Spiele, davon "+mapped.filter(m=>m.status==="completed"&&Number.isInteger(m.homeGoals)&&Number.isInteger(m.awayGoals)).length+" mit Ergebnis");
   }catch(e){errors++;diagnostics.push(target.name+" / "+year+": "+e.message)}
  }
 }
 const seen=new Set();fixtures=fixtures.filter(m=>{const k=m.competition+"|"+m.id;if(seen.has(k))return false;seen.add(k);return true});
 const todays=fixtures.filter(m=>m.status==="scheduled"&&dayKey(new Date(m.dateUtc))===dayKey(now));
 const historyByComp=new Map();
 for(const m of fixtures)if(m.status==="completed"&&Number.isInteger(m.homeGoals)&&Number.isInteger(m.awayGoals)){if(!historyByComp.has(m.competition))historyByComp.set(m.competition,[]);historyByComp.get(m.competition).push(m)}
 const picks=[];
 for(const m of todays){
  const history=historyByComp.get(m.competition)||[];
  try{
   const p=predictFootballMatch(history,{homeTeamId:m.homeTeamId,awayTeamId:m.awayTeamId,kickoffUtc:m.dateUtc},{minHistoryMatches:20});
   const probs=p.probabilities;const sorted=[["1","Heimsieg",probs.home_win],["X","Unentschieden",probs.draw],["2","Auswärtssieg",probs.away_win]].sort((a,b)=>b[2]-a[2]);
   const best=sorted[0];if(best[2]>=.65)picks.push({match:m,selection:best[1],probability:best[2],probabilities:probs,history:history.length});
  }catch(e){diagnostics.push(m.homeName+" – "+m.awayName+": keine Prognose ("+e.message+")")}
 }
 picks.sort((a,b)=>new Date(a.match.dateUtc)-new Date(b.match.dateUtc)||b.probability-a.probability);
 return {fixtures,todays,picks,completed,errors,diagnostics};
}
function render(result){
 $("summary").innerHTML="<div><b>"+result.todays.length+"</b><small>Spiele heute</small></div><div><b>"+result.completed+"</b><small>Historische Spiele</small></div><div><b>"+result.picks.length+"</b><small>Prognosen ≥ 65 %</small></div>";
 const root=$("results");root.replaceChildren();root.classList.toggle("empty",!result.picks.length);
 if(!result.picks.length){root.textContent="Keine belastbaren Prognosen für heute. Entweder fehlen Spiele, ausreichende Historie oder die 65-%-Schwelle wird nicht erreicht."}
 for(const p of result.picks){const el=document.createElement("article");el.className="card";el.innerHTML="<div class='meta'></div><h3></h3><div class='pick'></div><div class='prob'></div><div class='meta'></div>";const [meta,teams,pick,prob,foot]=el.children;meta.textContent=p.match.competition+" · "+fmt(p.match.dateUtc);teams.textContent=p.match.homeName+" – "+p.match.awayName;pick.textContent=p.selection;prob.textContent=(p.probability*100).toFixed(1)+" % Modellwahrscheinlichkeit";foot.textContent=p.history+" historische Spiele · Poisson-Modell · keine Quote verwendet";root.append(el)}
 $("diagnostics").textContent=result.diagnostics.join("\n");
}
$("scan").addEventListener("click",async()=>{const b=$("scan");b.disabled=true;$("status").textContent="Rufe Ligen, Spielpläne und historische Ergebnisse ab …";try{const r=await scan();render(r);$("status").textContent="Suchlauf abgeschlossen. "+r.fixtures.length+" Spiele geladen; "+r.errors+" Abruffehler. Keine künstlich erzeugten Tipps."}catch(e){$("status").textContent="Scannerfehler: "+e.message;$("diagnostics").textContent=e.stack||e.message}finally{b.disabled=false}});
$("clock").textContent=new Intl.DateTimeFormat("de-AT",{timeZone:TZ,dateStyle:"medium",timeStyle:"short"}).format(new Date());
