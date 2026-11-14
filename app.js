const API='https://tipsaudit.com/api/v1/predictions', SKOR='https://skorbot.live/api/v1/matches.json';
const TENNIS_API='https://api.tipero.app/api/picks/';
const ESPN_ATP='https://site.api.espn.com/apis/site/v2/sports/tennis/atp/scoreboard';
const ESPN_WTA='https://site.api.espn.com/apis/site/v2/sports/tennis/wta/scoreboard';
const TZ='Europe/Vienna', MIN_MAIN=65, MIN_DC=60, MAX=7;
const SB_URL='https://wxqbfvskzabyqdigknon.supabase.co';
const SB_KEY='sb_publishable_La06T4Qp35bL4sL5TTfKVw_R-Vu4PSp';
let sbSession=null, latestPicks=[];
const $=id=>document.getElementById(id);
function nowVienna(){return new Date(new Date().toLocaleString('en-US',{timeZone:TZ}))}
function dateKey(d){return new Intl.DateTimeFormat('en-CA',{timeZone:TZ,year:'numeric',month:'2-digit',day:'2-digit'}).format(d)}
function parseDate(v){if(!v)return null;let d=new Date(v);return isNaN(d)?null:d}
function isUpcoming(v){let d=parseDate(v),n=new Date();return d&&dateKey(d)===dateKey(n)&&d>n}
function fmt(v){let d=parseDate(v);return d?new Intl.DateTimeFormat('de-AT',{timeZone:TZ,hour:'2-digit',minute:'2-digit'}).format(d):'—'}
function teamKey(s){return String(s||'').toLowerCase().replace(/\b(sv|fc|sc|vfb|club|afc)\b/g,'').replace(/[^a-z0-9]+/g,' ').trim()}
function key(x){return [dateKey(parseDate(x.kickoff)||new Date()),fmt(x.kickoff),teamKey(x.home),teamKey(x.away)].join('|')}
function norm(payload,diag){
 const arr=Array.isArray(payload)?payload:(Array.isArray(payload?.predictions)?payload.predictions:[]);
 const main=[],dc=[];
 let upcoming=0,validProb=0,withValue=0,validSelection=0,belowThreshold=0,missingOdds=0,noPositiveEdge=0,fallbackAdded=0;
 const mainKeys=new Set();
 diag.push(`TipsAudit: ${arr.length} Rohdatensätze`);
 for(const x of arr){
  if(!x || !isUpcoming(x.kickoff_utc)) continue;
  upcoming++;
  const p=x.fair_probabilities||{},v=x.value||{};
  const probs={1:Number(p.home),X:Number(p.draw),2:Number(p.away)};
  const probsValid=['1','X','2'].every(k=>Number.isFinite(probs[k])&&probs[k]>=0&&probs[k]<=1);
  if(probsValid) validProb++;
  const rawSel=String(v.selection??'').trim().toLowerCase();
  const sel=({home:'1',draw:'X',away:'2',x:'X','1':'1','2':'2'})[rawSel]||rawSel.toUpperCase();
  if(Object.keys(v).length) withValue++;
  let valueAdded=false;
  if(['1','X','2'].includes(sel)){
   validSelection++;
   const prob=probs[sel];
   const best=Number(v.best_soft_odds);
   if(!Number.isFinite(prob)||prob<MIN_MAIN/100){belowThreshold++;}
   else if(!Number.isFinite(best)||best<=1){missingOdds++;}
   else {
    const fairPrice=1/prob;
    if(best<=fairPrice){noPositiveEdge++;}
    else {
     main.push({home:x.home,away:x.away,league:x.league||'Unbekannte Liga',kickoff:x.kickoff_utc,
      pick:({'1':'Heimsieg',X:'Unentschieden','2':'Auswärtssieg'})[sel],prob:prob*100,
      source:'TipsAudit · aktuelles Value-Signal',odds:best});
     mainKeys.add([x.kickoff_utc,teamKey(x.home),teamKey(x.away)].join('|'));
     valueAdded=true;
    }
   }
  }
  // Fallback: TipsAudit publishes fair probabilities for every priced match, but only
  // publishes a value block when a soft bookmaker currently beats the fair price.
  // Show the strongest 1X2 probability as a statistical candidate if no value signal exists.
  if(probsValid&&!valueAdded){
   const bestSelection=Object.entries(probs).sort((a,b)=>b[1]-a[1])[0];
   const [fallbackSel,fallbackProb]=bestSelection;
   const matchKey=[x.kickoff_utc,teamKey(x.home),teamKey(x.away)].join('|');
   if(fallbackProb>=MIN_MAIN/100&&!mainKeys.has(matchKey)){
    main.push({home:x.home,away:x.away,league:x.league||'Unbekannte Liga',kickoff:x.kickoff_utc,
     pick:({'1':'Heimsieg',X:'Unentschieden','2':'Auswärtssieg'})[fallbackSel],prob:fallbackProb*100,
     source:'TipsAudit · Wahrscheinlichkeitsauswahl',
     modelInfo:'Kein aktuelles Value-Signal mit bestätigter Soft-Quote. Quote und Spielbarkeit vor dem Einsatz selbst prüfen.'});
    fallbackAdded++;
   }
  }
  if(probsValid){
   for(const [s,label,prob] of [['1X','Heim oder Unentschieden',probs[1]+probs.X],['X2','Unentschieden oder Auswärts',probs.X+probs[2]]])
    if(prob>=MIN_DC/100) dc.push({home:x.home,away:x.away,league:x.league||'Unbekannte Liga',kickoff:x.kickoff_utc,pick:s+' · '+label,prob:prob*100,source:'TipsAudit abgeleitet'});
  }
 }
 diag.push(`TipsAudit 1X2-Prüfung: heute & offen=${upcoming}; gültige Wahrscheinlichkeiten=${validProb}; Value-Blöcke=${withValue}; gültige Auswahlen=${validSelection}; unter ${MIN_MAIN} %=${belowThreshold}; Quote fehlt=${missingOdds}; kein positiver EV=${noPositiveEdge}; Wahrscheinlichkeitsauswahlen=${fallbackAdded}`);
 diag.push(`TipsAudit: ${main.length} 1X2-Kandidaten (Value + Wahrscheinlichkeitsauswahl), ${dc.length} X1/X2-Kandidaten`);
 return {main,dc};
}
async function skor(diag){let r=await fetch(SKOR,{headers:{Accept:'application/json'}});if(!r.ok)throw Error('Skorbot HTTP '+r.status);let p=await r.json(),a=p.matches||p||[],out=[];diag.push(`Skorbot: ${a.length} Rohspiele`);for(let m of a){if(!['scheduled','pending','not_started'].includes(String(m.status||'').toLowerCase()))continue;let k=m.kickoff||m.kickoff_utc||m.start_time;if(!isUpcoming(k))continue;let q=m.probabilities||m.prediction||{},p1=Number(q.home),px=Number(q.draw),p2=Number(q.away),sum=p1+px+p2;if(!(p1>=0&&px>=0&&p2>=0&&sum>0))continue;for(let [s,label,pb] of [['1X','Heim oder Unentschieden',(p1+px)/sum],['X2','Unentschieden oder Auswärts',(px+p2)/sum]])if(pb>=MIN_DC/100)out.push({home:m.home||m.home_team,away:m.away||m.away_team,league:m.competition||m.league||'Unbekannte Liga',kickoff:k,pick:s+' · '+label,prob:pb*100,source:'Skorbot'})}diag.push(`Skorbot: ${out.length} X1/X2-Kandidaten`);return out}
function dedupe(arr){let out=[];for(let x of arr){let k=key(x);if(!out.some(y=>key(y)===k))out.push(x)}return out.sort((a,b)=>new Date(a.kickoff)-new Date(b.kickoff)||b.prob-a.prob)}
function tennisPicks(payload,diag){
  const picks=Array.isArray(payload?.picks)?payload.picks:[];
  const today=dateKey(new Date());
  const out=[];
  diag.push(`TIPERO: ${picks.length} veröffentlichte Tennispicks`);
  for(const x of picks){
    if(!x || x.source_type!=='public' || Number(x.is_locked)===1) continue;
    if(String(x.match_date||'')!==today) continue;
    const confidence=Number(x.confidence);
    if(!Number.isFinite(confidence) || confidence<60) continue;
    const home=String(x.player1||'').trim(), away=String(x.player2||'').trim();
    if(!home || !away || !x.pick) continue;
    const kickoff=x.start_time||x.kickoff||x.scheduled_at||x.startTime||null;
    if(kickoff && !isUpcoming(kickoff)) continue;
    out.push({home,away,league:[x.tour,x.tournament].filter(Boolean).join(' · ')||'Tennis',
      kickoff,matchDate:x.match_date,pick:String(x.pick),prob:confidence,source:'TIPERO · öffentlich'});
  }
  const seen=new Set();
  return out.sort((a,b)=>b.prob-a.prob).filter(x=>{
    const k=[x.matchDate,teamKey(x.home),teamKey(x.away)].join('|');
    if(seen.has(k)) return false; seen.add(k); return true;
  }).slice(0,5);
}
async function diagnosticJson(url,label,diag){
  const started=performance.now();
  let response;
  try{
    response=await fetch(url,{headers:{Accept:'application/json'}});
  }catch(e){
    const kind=e instanceof TypeError?'Netzwerk/CORS/Browserblockade':'Fetch-Fehler';
    diag.push(`${label}: FEHLER ${kind}: ${e.message||String(e)} (${Math.round(performance.now()-started)} ms)`);
    throw new Error(`${label}: ${kind} – ${e.message||String(e)}`);
  }
  const elapsed=Math.round(performance.now()-started);
  const contentType=response.headers.get('content-type')||'(kein Content-Type)';
  const text=await response.text();
  const preview=text.replace(/\s+/g,' ').slice(0,220)||'(leerer Antworttext)';
  diag.push(`${label}: HTTP ${response.status} ${response.statusText||''}; ${contentType}; ${elapsed} ms; ${text.length} Zeichen`);
  diag.push(`${label} Antwortvorschau: ${preview}`);
  if(!response.ok) throw new Error(`${label}: HTTP ${response.status} ${response.statusText}`);
  try{return JSON.parse(text)}catch(e){
    diag.push(`${label}: JSON-Fehler: ${e.message}`);
    throw new Error(`${label}: Antwort ist kein gültiges JSON`);
  }
}
async function fetchTennis(diag){
  const day=dateKey(new Date());
  const url=TENNIS_API+day;
  diag.push('TIPERO URL: '+url);
  const payload=await diagnosticJson(url,'TIPERO',diag);
  diag.push('TIPERO Struktur: '+Object.keys(payload||{}).slice(0,20).join(', '));
  diag.push('TIPERO Antwortstatus: ok=' + String(payload?.ok ?? 'nicht angegeben') + ', match_date=' + String(payload?.run?.match_date ?? day));
  const picks=Array.isArray(payload?.picks)?payload.picks:[];
  diag.push(`TIPERO Picks im JSON: ${picks.length}; Laufdatum=${day}`);
  const result=tennisPicks(payload,diag);
  diag.push(`TIPERO nach Filter: ${result.length}; geprüft=${picks.length}; öffentlich=${picks.filter(x=>x?.source_type==='public').length}; gesperrt=${picks.filter(x=>Number(x?.is_locked)===1).length}; Datum passend=${picks.filter(x=>String(x?.match_date||'')===day).length}; Confidence >=60=${picks.filter(x=>Number(x?.confidence)>=60).length}`);
  if(!picks.length && payload && typeof payload==='object') diag.push('TIPERO Hinweis: Antwort enthält kein Array "picks" oder dieses ist leer.');
  return result;
}

function espnFixtures(payload,tour,diag){
  const events=Array.isArray(payload?.events)?payload.events:[];
  const out=[]; let grouped=0, rawMatches=0;
  for(const event of events){
    const groups=Array.isArray(event.groupings)?event.groupings:[];
    const entries=[];
    for(const g of groups){
      const groupName=String(g.grouping?.displayName||g.name||'');
      const comps=Array.isArray(g.competitions)?g.competitions:[];
      grouped+=comps.length;
      if(/double/i.test(groupName)) continue;
      for(const c of comps) entries.push({c,groupName});
    }
    // Fallback for ESPN responses that expose competitions directly.
    if(!entries.length && Array.isArray(event.competitions))
      for(const c of event.competitions) entries.push({c,groupName:''});
    for(const {c,groupName} of entries){
      rawMatches++;
      const status=String(c.status?.type?.state||'').toLowerCase();
      if(['post','in'].includes(status)) continue;
      const competitors=Array.isArray(c.competitors)?[...c.competitors]:[];
      competitors.sort((a,b)=>{const oa=a.order!=null?Number(a.order):(a.homeAway==='home'?0:1);const ob=b.order!=null?Number(b.order):(b.homeAway==='home'?0:1);return oa-ob;});
      const names=competitors.map(v=>v.athlete?.displayName||v.athlete?.fullName||v.displayName||v.name||'').filter(Boolean);
      if(names.length<2 || /double/i.test(groupName) || names.some(n=>n.includes('/'))) continue;
      const start=c.date||c.startDate||event.date||null;
      if(!start || !isUpcoming(start)) continue;
      const type=String(c.type?.text||c.type?.slug||'');
      if(/double/i.test(type)) continue;
      out.push({home:names[0],away:names[1],league:[tour,event.name,groupName,c.round?.displayName].filter(Boolean).join(' · '),kickoff:start,surface:c.surface?.displayName||event.surface?.displayName||event.surface||null,pick:'Spielplan – keine Tippempfehlung',prob:null,source:'ESPN Spielplan'});
    }
  }
  if(diag) diag.push(`ESPN ${tour}: ${events.length} Turniere, ${grouped} Gruppenspiele, ${rawMatches} geprüfte Matches`);
  return out;
}
async function fetchTennisFixtures(diag){
  const date=new Intl.DateTimeFormat('en-CA',{timeZone:TZ,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()).replaceAll('-','');
  const urls=[ESPN_ATP,ESPN_WTA].map(u=>u+'?dates='+date+'&limit=300');
  const labels=['ESPN ATP','ESPN WTA'];
  const settled=await Promise.allSettled(urls.map((url,i)=>diagnosticJson(url,labels[i],diag)));
  const matches=[];
  for(let i=0;i<settled.length;i++){
    const item=settled[i];
    if(item.status==='rejected'){
      diag.push(`${labels[i]} Ergebnis: NICHT VERFÜGBAR – ${item.reason?.message||item.reason}`);
      continue;
    }
    const payload=item.value;
    const events=Array.isArray(payload?.events)?payload.events:[];
    diag.push(`${labels[i]} Struktur: keys=${Object.keys(payload||{}).slice(0,16).join(', ')}; events=${events.length}`);
    if(events.length) diag.push(`${labels[i]} erstes Event: keys=${Object.keys(events[0]||{}).join(', ')}; groupings=${Array.isArray(events[0]?.groupings)?events[0].groupings.length:0}; direkte competitions=${Array.isArray(events[0]?.competitions)?events[0].competitions.length:0}`);
    const before=matches.length;
    matches.push(...espnFixtures(payload,i===0?'ATP':'WTA',diag));
    diag.push(`${labels[i]} Ergebnis: ${matches.length-before} kommende Einzelspiele`);
  }
  const unique=new Map();
  for(const m of matches){const k=[teamKey(m.home),teamKey(m.away),m.kickoff].join('|');unique.set(k,m)}
  const out=[...unique.values()].sort((a,b)=>new Date(a.kickoff)-new Date(b.kickoff));
  diag.push(`ESPN Spielplan gesamt: ${out.length} kommende Einzelspiele (Datum ${date})`);
  return out;
}


// Independent ATP/WTA model based on historical match results.
// Sackmann-derived match data is CC BY-NC-SA 4.0: personal/non-commercial use only.
const TENNIS_DATA_URLS = {
  atp: [2026,2025,2024,2023].map(y=>
    `https://raw.githubusercontent.com/Aneeshers/tennis-sackmann-archive/main/atp/atp_matches_${y}.csv`
  ),
  wta: [2026,2025,2024,2023].map(y=>
    `https://raw.githubusercontent.com/Aneeshers/tennis-sackmann-archive/main/wta/wta_matches_${y}.csv`
  )
};
function parseCSV(text){
  const lines=String(text||'').replace(/^\uFEFF/,'').split(/\r?\n/).filter(Boolean);
  if(lines.length<2) return [];
  const splitLine=line=>{
    const out=[]; let cur='', quoted=false;
    for(let i=0;i<line.length;i++){
      const ch=line[i];
      if(ch==='"' && line[i+1]==='"' && quoted){cur+='"';i++;}
      else if(ch==='"') quoted=!quoted;
      else if(ch===',' && !quoted){out.push(cur);cur='';}
      else cur+=ch;
    }
    out.push(cur); return out;
  };
  const headers=splitLine(lines[0]).map(x=>x.trim());
  return lines.slice(1).map(line=>{
    const vals=splitLine(line), row={};
    headers.forEach((h,i)=>row[h]=(vals[i]||'').trim());
    return row;
  });
}
function normPlayer(s){
  return String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .toLowerCase().replace(/\b(jr|sr|ii|iii|iv)\b/g,'')
    .replace(/[^a-z0-9]+/g,' ').trim().replace(/\s+/g,' ');
}
function eloExpected(a,b){return 1/(1+Math.pow(10,(b-a)/400))}
async function loadTourData(tour,diag){
  const urls=TENNIS_DATA_URLS[tour];
  const settled=await Promise.allSettled(urls.map(async url=>{
    const r=await fetch(url,{headers:{Accept:'text/csv'}});
    if(!r.ok) throw Error('HTTP '+r.status);
    const txt=await r.text();
    if(!txt.includes('winner_name') || !txt.includes('loser_name')) throw Error('CSV-Schema nicht erkannt');
    return {url,rows:parseCSV(txt)};
  }));
  const rows=[]; let ok=0, failed=0;
  settled.forEach((v,i)=>{
    if(v.status==='fulfilled'){
      ok++;
      diag.push(`Matchdaten ${tour.toUpperCase()} ${urls[i].split('/').pop()}: ${v.value.rows.length} Datensätze`);
      rows.push(...v.value.rows);
    }else{
      failed++;
      diag.push(`Matchdaten ${tour.toUpperCase()} ${urls[i].split('/').pop()}: nicht verfügbar (${v.reason?.message||v.reason})`);
    }
  });
  diag.push(`Matchdaten ${tour.toUpperCase()} Gesamt: ${rows.length} Datensätze aus ${ok}/${urls.length} verifizierten Tour-Dateien; ${failed} Quellen nicht verfügbar`);
  if(!rows.length) throw Error(`${tour.toUpperCase()}: keine historischen Matchdaten erreichbar`);
  return rows;
}
function buildTourRatings(rows){
  const overall=new Map(), surfaces=new Map(), recent=new Map(), h2h=new Map(), counts=new Map();
  const names=new Set();
  const get=(map,k)=>map.get(k)||1500;
  const bump=(map,k,v)=>map.set(k,v);
  const sorted=rows.map(r=>({r,date:String(r.tourney_date||'')})).filter(x=>
    x.r.winner_name && x.r.loser_name && /^\d{8}$/.test(x.date)
  ).sort((a,b)=>a.date.localeCompare(b.date));
  for(const {r,date} of sorted){
    const w=normPlayer(r.winner_name), l=normPlayer(r.loser_name);
    if(!w||!l) continue;
    names.add(w); names.add(l);
    const surf=String(r.surface||'').toLowerCase();
    const rw=get(overall,w), rl=get(overall,l);
    const ew=eloExpected(rw,rl), k=24;
    bump(overall,w,rw+k*(1-ew)); bump(overall,l,rl-k*(1-ew));
    if(surf){
      const sw=get(surfaces,w+'|'+surf), sl=get(surfaces,l+'|'+surf), es=eloExpected(sw,sl), sk=24;
      bump(surfaces,w+'|'+surf,sw+sk*(1-es)); bump(surfaces,l+'|'+surf,sl-sk*(1-es));
    }
    for(const [player,won] of [[w,true],[l,false]]){
      const arr=recent.get(player)||[]; arr.push({won,date}); if(arr.length>20) arr.shift(); recent.set(player,arr);
      counts.set(player,(counts.get(player)||0)+1);
    }
    const pair=[w,l].sort().join('|'), prior=h2h.get(pair)||{a:0,b:0};
    if(w===pair.split('|')[0]) prior.a++; else prior.b++;
    h2h.set(pair,prior);
  }
  return {overall,surfaces,recent,h2h,counts,names};
}
function playerMatch(name,ratings){
  const target=normPlayer(name);
  if(ratings.names.has(target)) return target;
  const tokens=target.split(' ').filter(Boolean);
  if(tokens.length<2) return null;
  const last=tokens[tokens.length-1], first=tokens[0];
  const candidates=[];
  for(const candidate of ratings.names){
    const ct=candidate.split(' ');
    const clast=ct[ct.length-1], cfirst=ct[0];
    if(clast!==last) continue;
    if(cfirst===first || (cfirst[0]===first[0] && first.length===1)) candidates.push(candidate);
  }
  if(candidates.length===1) return candidates[0];
  // Conservative token similarity fallback; accept only a unique strong match.
  const scored=[...ratings.names].map(candidate=>{
    const a=new Set(tokens), b=new Set(candidate.split(' '));
    const overlap=[...a].filter(x=>b.has(x)).length;
    return {candidate,score:overlap/Math.max(a.size,b.size)};
  }).sort((a,b)=>b.score-a.score);
  if(scored[0]?.score>=0.8 && (!scored[1] || scored[0].score-scored[1].score>=0.2)) return scored[0].candidate;
  return null;
}
function modelProbability(a,b,ratings,surface){
  const pa=playerMatch(a,ratings), pb=playerMatch(b,ratings);
  if(!pa||!pb) return {unmatched:[!pa?a:null,!pb?b:null].filter(Boolean)};
  const ca=ratings.counts.get(pa)||0, cb=ratings.counts.get(pb)||0;
  if(ca<8||cb<8) return {insufficient:[ca<8?`${a} (${ca})`:null,cb<8?`${b} (${cb})`:null].filter(Boolean)};
  const ra=ratings.overall.get(pa)||1500, rb=ratings.overall.get(pb)||1500;
  let diff=ra-rb, usedSurface=false;
  if(surface){
    const s=String(surface).toLowerCase();
    const sa=ratings.surfaces.get(pa+'|'+s), sb=ratings.surfaces.get(pb+'|'+s);
    if(sa&&sb){diff=diff*.65+(sa-sb)*.35;usedSurface=true;}
  }
  const formA=(ratings.recent.get(pa)||[]).slice(-10), formB=(ratings.recent.get(pb)||[]).slice(-10);
  const winA=formA.length?formA.filter(x=>x.won).length/formA.length:.5;
  const winB=formB.length?formB.filter(x=>x.won).length/formB.length:.5;
  diff += (winA-winB)*55;
  const pair=[pa,pb].sort().join('|'), h=ratings.h2h.get(pair);
  if(h){
    const aWins=pa===pair.split('|')[0]?h.a:h.b, total=h.a+h.b;
    if(total>=2) diff += ((aWins/total)-.5)*35;
  }
  const probability=eloExpected(1500+diff,1500);
  return {probability,ca,cb,usedSurface,formA:formA.length?winA:null,formB:formB.length?winB:null,matched:[pa,pb]};
}
async function createTennisModelTips(fixtures,diag){
  const results=await Promise.allSettled([loadTourData('atp',diag),loadTourData('wta',diag)]);
  const ratings={};
  ['atp','wta'].forEach((tour,i)=>{
    if(results[i].status==='fulfilled'){
      ratings[tour]=buildTourRatings(results[i].value);
      diag.push(`Tennis-Modell ${tour.toUpperCase()}: ${ratings[tour].counts.size} Spielerprofile`);
    }else diag.push(`Tennis-Modell ${tour.toUpperCase()} nicht verfügbar: ${results[i].reason?.message||results[i].reason}`);
  });
  const out=[]; let evaluated=0, unmatched=0, insufficient=0, below=0, challenger=0;
  for(const m of fixtures){
    const league=String(m.league||'').toLowerCase();
    const tour=league.includes('wta')?'wta':'atp';
    if(/challenger|itf|futures/i.test(league)){challenger++;diag.push(`Nicht bewertet: ${m.league} – Challenger/ITF-Ergebnisdaten sind in dieser Datenquelle nicht enthalten.`);continue;}
    if(!ratings[tour]) continue;
    const p=modelProbability(m.home,m.away,ratings[tour],m.surface);
    if(p.unmatched){unmatched++;diag.push(`Spieler nicht zugeordnet (${tour.toUpperCase()}): ${p.unmatched.join(' / ')} – ${m.home} vs. ${m.away}`);continue;}
    if(p.insufficient){insufficient++;diag.push(`Zu wenig Historie (${tour.toUpperCase()}): ${p.insufficient.join(' / ')} – ${m.home} vs. ${m.away}`);continue;}
    evaluated++;
    const confidence=p.probability*100;
    if(confidence>=60) out.push({
      home:m.home,away:m.away,league:m.league||'Tennis',kickoff:m.kickoff,
      pick:`${m.home} gewinnt`,prob:confidence,source:'Eigenes Elo-Modell',
      modelInfo:`Elo · ${p.ca}/${p.cb} Matches · ${p.usedSurface?'Belag berücksichtigt':'ohne Belagsdaten'}`
    });
    else if(confidence<=40) out.push({
      home:m.home,away:m.away,league:m.league||'Tennis',kickoff:m.kickoff,
      pick:`${m.away} gewinnt`,prob:(1-p.probability)*100,source:'Eigenes Elo-Modell',
      modelInfo:`Elo · ${p.ca}/${p.cb} Matches · ${p.usedSurface?'Belag berücksichtigt':'ohne Belagsdaten'}`
    });
    else below++;
  }
  const unique=new Map();
  for(const x of out){const k=[normPlayer(x.home),normPlayer(x.away),x.kickoff].join('|');unique.set(k,x);}
  const sorted=[...unique.values()].sort((a,b)=>b.prob-a.prob).slice(0,5);
  diag.push(`Eigenes Tennis-Modell: ${sorted.length} Tipps ≥60 %; Spiele=${fixtures.length}; bewertet=${evaluated}; Spieler nicht zugeordnet=${unmatched}; zu wenig Historie=${insufficient}; unter 60 %=${below}; Challenger/ITF nicht abgedeckt=${challenger}`);
  return sorted;
}

function renderFixtures(arr){
  const el=$('tennisFixtures');
  el.className='cards'+(arr.length?'':' empty');
  if(!arr.length){el.textContent='ESPN meldet derzeit keine kommenden Einzelspiele für heute. Das ist keine Aussage über alle Challenger-/ITF-Turniere.';return}
  el.innerHTML=arr.map(x=>`<article class="tip"><div class="tiptop"><span class="league">${esc(x.league)}</span><span>${fmt(x.kickoff)} Uhr</span></div><div class="teams">${esc(x.home)} – ${esc(x.away)}</div><div class="meta">Spielplan-Eintrag · keine eigene Gewinnwahrscheinlichkeit</div><span class="source">${esc(x.source)}</span></article>`).join('');
}

function render(id,arr,empty){let el=$(id);el.className='cards'+(arr.length?'':' empty');if(!arr.length){el.textContent=empty;return}el.innerHTML=arr.map(x=>`<article class="tip"><div class="tiptop"><span class="league">${esc(x.league)}</span><span>${x.kickoff?fmt(x.kickoff)+' Uhr':'Beginn nicht angegeben'}</span></div><div class="teams">${esc(x.home)} – ${esc(x.away)}</div><div class="pickrow"><span class="pick">${esc(x.pick)}</span><span class="prob">${x.prob.toFixed(1)} %</span></div>${x.odds?`<div class="meta">Erfasste Quote: ${x.odds.toFixed(2)}</div>`:''}${x.modelInfo?`<div class="meta">${esc(x.modelInfo)}</div>`:''}<span class="source">${esc(x.source)}</span></article>`).join('')}
function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function eligible(arr){return dedupe(arr).filter(x=>isUpcoming(x.kickoff)).slice(0,MAX)}
async function search(){
 let b=$('searchBtn');b.disabled=true;b.textContent='Suche läuft …';$('status').className='status';$('status').textContent='Datenquellen werden abgefragt …';
 let diag=[`Abruf: ${new Date().toLocaleString('de-AT',{timeZone:TZ})}`],main=[],dc=[],tennis=[]; latestPicks=[];
 try{
  let r=await fetch(API,{headers:{Accept:'application/json'}});
  if(!r.ok)throw Error('TipsAudit HTTP '+r.status);
  let p=await r.json(),n=norm(p,diag);main=n.main;dc=n.dc;
  try{dc=dedupe([...await skor(diag),...dc])}catch(e){diag.push('Skorbot Fehler: '+e.message)}
  let fm=eligible(main),fd=eligible(dc);
  render('mainList',fm,'Keine passenden, noch nicht gestarteten Fußballtipps.');
  render('dcList',fd,'Keine passenden, noch nicht gestarteten X1/X2-Tipps.');
  $('mainCount').textContent=fm.length;$('dcCount').textContent=fd.length;
  diag.push(`Aktuelle Tipps: 1X2 ${fm.length}/${MAX}; X1/X2 ${fd.length}/${MAX}`);
  let fixtures=[];
  try{fixtures=await fetchTennisFixtures(diag);renderFixtures(fixtures)}catch(e){renderFixtures([]);diag.push('ESPN Spielplan Fehler: '+e.message)}
  try{
    const own=await createTennisModelTips(fixtures,diag);
    let publicTips=[];
    try{publicTips=await fetchTennis(diag)}catch(e){diag.push('TIPERO Zusatzquelle nicht verfügbar: '+e.message)}
    const combined=[...own,...publicTips].sort((a,b)=>b.prob-a.prob).slice(0,5);
    tennis=combined;
    render('tennisList',tennis,'Keine belastbaren Tennisprognosen mit mindestens 60 % Modellwahrscheinlichkeit. Es werden keine Tipps künstlich erzeugt.');
    $('tennisCount').textContent=tennis.length;
    diag.push(`Tennis-Tipps gesamt: ${tennis.length}/5 (eigenes Modell=${own.length}, TIPERO öffentlich=${publicTips.length})`);
    $('status').textContent=`Suchlauf abgeschlossen: ${fm.length} Fußballtipps, ${fd.length} X1/X2-Tipps, ${tennis.length} Tennistipps und ${fixtures.length} Spielplan-Einträge.`;
    latestPicks=[...fm.map(x=>({...x,sport:'Fußball',market:'1X2'})),...fd.map(x=>({...x,sport:'Fußball',market:'X1/X2'})),...tennis.map(x=>({...x,sport:'Tennis',market:'Einzel'}))];
    if(sbSession){try{const saved=await saveTips(latestPicks);diag.push(`Performance: ${saved} Tipps in Supabase gespeichert/aktualisiert.`)}catch(err){diag.push('Performance-Speicherung FEHLER: '+err.message)}}
  }catch(e){
    render('tennisList',[],'Eigenes Tennis-Modell derzeit nicht verfügbar. Bitte Diagnose prüfen.');
    $('tennisCount').textContent='0';
    diag.push('Tennis-Modell Fehler: '+e.message);
    $('status').textContent=`Suchlauf abgeschlossen: ${fm.length} Fußballtipps, ${fd.length} X1/X2-Tipps, 0 eigene Tennisprognosen und ${fixtures.length} Spielplan-Einträge.`;
  }
 }catch(e){
  $('status').className='status error';$('status').textContent='Fußball-Abruf nicht möglich: '+e.message+'. Tennis wird bei einem erfolgreichen Fußballabruf separat geladen.';
  diag.push('FEHLER: '+e.message,'Wenn CORS blockiert, ist ein kleiner sicherer API-Proxy erforderlich.');
 }finally{
  $('diagnostics').textContent=diag.join('\n');b.disabled=false;b.textContent='Jetzt suchen';
 }
}
$('searchBtn').addEventListener('click',search);document.querySelectorAll('.tab').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('.tab,.panel').forEach(x=>x.classList.remove('active'));b.classList.add('active');$(b.dataset.tab).classList.add('active')}));
function clock(){$('clock').textContent=new Intl.DateTimeFormat('de-AT',{timeZone:TZ,dateStyle:'short',timeStyle:'short'}).format(new Date())}clock();setInterval(clock,30000);
if('serviceWorker'in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));


// Performance-Erweiterung v1.3.1 – getrennt von den Tippberechnungen.
const SB_STORE='surebet_sb_session_v1';
function authHeaders(token){return {'apikey':SB_KEY,'Authorization':'Bearer '+(token||SB_KEY),'Content-Type':'application/json'}}
function setAuthMessage(msg,isError=false){const el=$('authMessage');if(el){el.textContent=msg;el.style.color=isError?'#fca5a5':'#94a3b8'}}
async function sbAuth(path,body){const r=await fetch(SB_URL+'/auth/v1/'+path,{method:'POST',headers:authHeaders(),body:JSON.stringify(body)});const j=await r.json().catch(()=>({}));if(!r.ok)throw Error(j.msg||j.message||j.error_description||'Anmeldung fehlgeschlagen (HTTP '+r.status+')');return j}
function storeSession(s){if(s?.expires_in&&!s.expires_at)s.expires_at=Math.floor(Date.now()/1000)+Number(s.expires_in);sbSession=s; if(s)localStorage.setItem(SB_STORE,JSON.stringify(s));else localStorage.removeItem(SB_STORE); updateAuthUI()}
async function restoreSession(){try{const raw=localStorage.getItem(SB_STORE);if(!raw)return;let s=JSON.parse(raw);if(s.expires_at && s.expires_at*1000<Date.now()+60000){const j=await fetch(SB_URL+'/auth/v1/token?grant_type=refresh_token',{method:'POST',headers:authHeaders(),body:JSON.stringify({refresh_token:s.refresh_token})});const v=await j.json();if(!j.ok)throw Error('Sitzung abgelaufen');s={...v,expires_at:Math.floor(Date.now()/1000)+(v.expires_in||3600)}}storeSession(s);await loadPerformance()}catch(e){storeSession(null);setAuthMessage('Bitte erneut anmelden: '+e.message,true)}}
function updateAuthUI(){const logged=!!sbSession?.access_token;$('authBox').hidden=logged;$('perfArea').hidden=!logged;if(logged)$('signedInAs').textContent=sbSession.user?.email||'Angemeldet'}
async function sbRequest(path,opts={}){if(!sbSession?.access_token)throw Error('Nicht angemeldet');const r=await fetch(SB_URL+'/rest/v1/'+path,{...opts,headers:{...authHeaders(sbSession.access_token),Prefer:opts.prefer||'return=representation',...(opts.headers||{})}});const t=await r.text();let j;try{j=t?JSON.parse(t):[]}catch{j=t}if(!r.ok)throw Error((j?.message||j?.hint||t||'Datenbankfehler')+' (HTTP '+r.status+')');return j}
function makeTipKey(x){return [x.sport,x.market,x.kickoff||'',teamKey(x.home),teamKey(x.away),x.pick].join('|').toLowerCase()}
async function saveTips(arr){let rows=arr.map(x=>({tip_key:makeTipKey(x),sport:x.sport,market:x.market,league:x.league||'',home:x.home||'',away:x.away||'',kickoff:x.kickoff||null,pick:x.pick||'',probability:Number(x.prob)||null,source:x.source||'',status:'pending'}));if(!rows.length)return 0;let saved=0;for(let i=0;i<rows.length;i+=50){const batch=rows.slice(i,i+50);await sbRequest('performance_tips?on_conflict=user_id,tip_key',{method:'POST',headers:{'Prefer':'resolution=merge-duplicates,return=representation'},body:JSON.stringify(batch)});saved+=batch.length}return saved}
function euro(n){return Number.isFinite(n)?new Intl.NumberFormat('de-AT',{style:'currency',currency:'EUR'}).format(n):'—'}
async function loadPerformance(){const rows=await sbRequest('performance_tips?select=*&order=created_at.desc&limit=500');const done=rows.filter(x=>x.status==='won'||x.status==='lost');const won=done.filter(x=>x.status==='won').length;const stakes=done.reduce((a,x)=>a+(Number(x.stake)||0),0);const profit=done.reduce((a,x)=>a+(x.status==='won'?(Number(x.stake)||0)*((Number(x.odds)||0)-1):-(Number(x.stake)||0)),0);$('mSettled').textContent=done.length;$('mHit').textContent=done.length?(won/done.length*100).toFixed(1)+' %':'—';$('mProfit').textContent=stakes?euro(profit):'—';$('mRoi').textContent=stakes?(profit/stakes*100).toFixed(1)+' %':'—';const el=$('perfList');el.className='cards'+(rows.length?'':' empty');if(!rows.length){el.textContent='Noch keine gespeicherten Tipps. Starte einen Suchlauf.';return}el.innerHTML=rows.map(x=>`<article class="tip"><div class="tiptop"><span class="league">${esc(x.sport)} · ${esc(x.market)}</span><span>${x.kickoff?fmt(x.kickoff):'Termin offen'}</span></div><div class="teams">${esc(x.home)} – ${esc(x.away)}</div><div class="pickrow"><span class="pick">${esc(x.pick)}</span><span class="prob">${x.probability?Number(x.probability).toFixed(1)+' %':''}</span></div><div class="meta">${esc(x.league)} · ${esc(x.source)} · Status: ${esc(x.status)}</div><div class="tipcontrols"><label>Quote<input type="number" min="1.01" step="0.01" id="odds-${x.id}" value="${x.odds??''}" placeholder="z. B. 1.80"></label><label>Einsatz €<input type="number" min="0" step="0.50" id="stake-${x.id}" value="${x.stake??''}" placeholder="z. B. 10"></label><label>Ergebnis<select id="result-${x.id}"><option value="pending" ${x.status==='pending'?'selected':''}>Offen</option><option value="won" ${x.status==='won'?'selected':''}>Gewonnen</option><option value="lost" ${x.status==='lost'?'selected':''}>Verloren</option><option value="void" ${x.status==='void'?'selected':''}>Storniert</option></select></label><button onclick="saveTipResult('${x.id}')">Speichern</button></div></article>`).join('')}
window.saveTipResult=async function(id){try{const odds=Number($('odds-'+id).value)||null,stake=Number($('stake-'+id).value)||null,status=$('result-'+id).value;if(odds!==null&&odds<1.01)throw Error('Quote muss mindestens 1,01 sein');if(stake!==null&&stake<0)throw Error('Einsatz darf nicht negativ sein');await sbRequest('performance_tips?id=eq.'+encodeURIComponent(id),{method:'PATCH',body:JSON.stringify({odds,stake,status,settled_at:status==='pending'?null:new Date().toISOString()})});await loadPerformance()}catch(e){alert('Speichern nicht möglich: '+e.message)}};
async function authAction(which){try{const email=$('authEmail').value.trim(),password=$('authPassword').value;if(!email||!password)throw Error('Bitte E-Mail und Passwort eingeben.');if(password.length<8)throw Error('Passwort muss mindestens 8 Zeichen haben.');setAuthMessage('Bitte warten …');const j=await sbAuth(which,{email,password});if(which==='signup'&&!j.access_token){setAuthMessage('Konto angelegt. Bitte E-Mail bestätigen und danach anmelden.');return}storeSession(j);setAuthMessage('Erfolgreich angemeldet.');await loadPerformance();if(latestPicks.length)await saveTips(latestPicks)}catch(e){setAuthMessage(e.message,true)}}
$('signInBtn')?.addEventListener('click',()=>authAction('token?grant_type=password'));
$('signUpBtn')?.addEventListener('click',()=>authAction('signup'));
$('signOutBtn')?.addEventListener('click',async()=>{try{await fetch(SB_URL+'/auth/v1/logout',{method:'POST',headers:authHeaders(sbSession?.access_token)});}finally{storeSession(null);setAuthMessage('Abgemeldet.')}});
$('refreshPerfBtn')?.addEventListener('click',()=>loadPerformance().catch(e=>setAuthMessage(e.message,true)));
document.querySelectorAll('.tab').forEach(b=>b.addEventListener('click',()=>{if(b.dataset.tab==='performance'&&sbSession)loadPerformance().catch(e=>setAuthMessage(e.message,true))}));
restoreSession();


// Automatische Ergebnisprüfung (ESPN öffentliche Scoreboards; unbekannte Spiele bleiben offen).
const ESPN_SOCCER_RESULTS='https://site.api.espn.com/apis/site/v2/sports/soccer/all/scoreboard';
function resultDate(kickoff){const d=parseDate(kickoff);return d?new Intl.DateTimeFormat('en-CA',{timeZone:TZ,year:'numeric',month:'2-digit',day:'2-digit'}).format(d).replaceAll('-',''):null}
function resultName(s){return normPlayer(String(s||'').replace(/\b(fc|sc|cf|afc|sv|club|calcio|united|city)\b/gi,' '))}
function sameTeam(a,b){const x=resultName(a),y=resultName(b);if(!x||!y)return false;if(x===y)return true;const ax=x.split(' '),by=y.split(' ');return x.includes(y)||y.includes(x)||(ax.length>1&&by.length>1&&ax[ax.length-1]===by[by.length-1]&&ax[0]===by[0])}
function collectCompetitions(payload){const out=[];const walk=v=>{if(!v||typeof v!=='object')return;if(Array.isArray(v)){v.forEach(walk);return}if(Array.isArray(v.competitors)&&v.status?.type)out.push(v);for(const [k,val] of Object.entries(v)){if(k==='competitions'&&Array.isArray(val))val.forEach(walk);else if(['events','groupings','items'].includes(k))walk(val)}};walk(payload?.events||payload);return out}
function eventResult(c,sport){const state=String(c.status?.type?.state||'').toLowerCase();if(!['post','final'].includes(state)&&c.status?.type?.completed!==true)return null;const comps=Array.isArray(c.competitors)?c.competitors:[];if(comps.length<2)return null;const names=comps.map(v=>v.athlete?.displayName||v.athlete?.fullName||v.team?.displayName||v.team?.name||v.displayName||v.name||'');if(!names[0]||!names[1])return null;let winner=comps.findIndex(v=>v.winner===true);let scores=comps.map(v=>Number(v.score));if(winner<0&&scores.every(Number.isFinite)&&scores[0]!==scores[1])winner=scores[0]>scores[1]?0:1;if(winner<0)return null;return {home:names[0],away:names[1],winner,homeScore:scores[0],awayScore:scores[1],sport}}
function settledStatus(tip,res){if(!sameTeam(tip.home,res.home)||!sameTeam(tip.away,res.away))return null;if(tip.sport==='Tennis')return (tip.pick||'').toLowerCase().includes(resultName(res.winner===0?res.home:res.away))?'won':'lost';if(!Number.isFinite(res.homeScore)||!Number.isFinite(res.awayScore))return null;const h=res.homeScore,a=res.awayScore,p=String(tip.pick||'').toLowerCase();if(tip.market==='X1/X2'){if(p.startsWith('1x'))return h>=a?'won':'lost';if(p.startsWith('x2'))return a>=h?'won':'lost';return null}if(p.includes('heimsieg'))return h>a?'won':'lost';if(p.includes('auswärtssieg'))return a>h?'won':'lost';if(p.includes('unentschieden'))return h===a?'won':'lost';return null}
async function getScoreboard(url){const r=await fetch(url,{headers:{Accept:'application/json'}});if(!r.ok)throw Error('Scoreboard HTTP '+r.status);return r.json()}
async function autoCheckResults(){const btn=$('checkResultsBtn'),msg=$('resultCheckMessage');btn.disabled=true;btn.textContent='Prüfe …';msg.textContent='Abgeschlossene Spiele werden mit den öffentlichen Ergebnisdaten abgeglichen …';try{const rows=await sbRequest('performance_tips?select=*&status=eq.pending&kickoff=not.is.null&order=kickoff.desc&limit=500');const candidates=rows.filter(x=>x.kickoff&&parseDate(x.kickoff)&&parseDate(x.kickoff)<new Date());if(!candidates.length){msg.textContent='Keine offenen Tipps mit vergangenem Spielbeginn gefunden.';return}const dates=[...new Set(candidates.map(x=>resultDate(x.kickoff)).filter(Boolean))];const feeds=new Map();for(const day of dates){const [soccer,atp,wta]=await Promise.allSettled([getScoreboard(ESPN_SOCCER_RESULTS+'?dates='+day),getScoreboard(ESPN_ATP+'?dates='+day+'&limit=300'),getScoreboard(ESPN_WTA+'?dates='+day+'&limit=300')]);feeds.set(day,[soccer,atp,wta])}let updated=0,unmatched=0;for(const tip of candidates){const day=resultDate(tip.kickoff),pack=feeds.get(day);if(!pack)continue;const feed=tip.sport==='Tennis'?(pack[1].status==='fulfilled'?[pack[1].value,pack[2].status==='fulfilled'?pack[2].value:null]:[pack[2].status==='fulfilled'?pack[2].value:null]):[pack[0].status==='fulfilled'?pack[0].value:null];let found=null;for(const payload of feed.filter(Boolean)){for(const c of collectCompetitions(payload)){const r=eventResult(c,tip.sport);if(r&&sameTeam(tip.home,r.home)&&sameTeam(tip.away,r.away)){if(found){found=null;break}found=r}}if(found)break}if(!found){unmatched++;continue}const status=settledStatus(tip,found);if(!status){unmatched++;continue}await sbRequest('performance_tips?id=eq.'+encodeURIComponent(tip.id),{method:'PATCH',body:JSON.stringify({status,settled_at:new Date().toISOString()})});updated++}await loadPerformance();msg.textContent=`Prüfung abgeschlossen: ${updated} Ergebnis(se) automatisch übernommen; ${unmatched} Tipp(s) bleiben offen und können manuell korrigiert werden.`}catch(e){msg.textContent='Ergebnisprüfung nicht möglich: '+e.message}finally{btn.disabled=false;btn.textContent='Ergebnisse prüfen'}}
$('checkResultsBtn')?.addEventListener('click',autoCheckResults);
