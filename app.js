const API='https://tipsaudit.com/api/v1/predictions', SKOR='https://skorbot.live/api/v1/matches.json';
const TENNIS_API='https://api.tipero.app/api/picks/';
const ESPN_ATP='https://site.api.espn.com/apis/site/v2/sports/tennis/atp/scoreboard';
const ESPN_WTA='https://site.api.espn.com/apis/site/v2/sports/tennis/wta/scoreboard';
const TZ='Europe/Vienna', MIN=60, MAX=7;
const $=id=>document.getElementById(id);
function nowVienna(){return new Date(new Date().toLocaleString('en-US',{timeZone:TZ}))}
function dateKey(d){return new Intl.DateTimeFormat('en-CA',{timeZone:TZ,year:'numeric',month:'2-digit',day:'2-digit'}).format(d)}
function parseDate(v){if(!v)return null;let d=new Date(v);return isNaN(d)?null:d}
function isUpcoming(v){let d=parseDate(v),n=new Date();return d&&dateKey(d)===dateKey(n)&&d>n}
function fmt(v){let d=parseDate(v);return d?new Intl.DateTimeFormat('de-AT',{timeZone:TZ,hour:'2-digit',minute:'2-digit'}).format(d):'—'}
function teamKey(s){return String(s||'').toLowerCase().replace(/\b(sv|fc|sc|vfb|club|afc)\b/g,'').replace(/[^a-z0-9]+/g,' ').trim()}
function key(x){return [dateKey(parseDate(x.kickoff)||new Date()),fmt(x.kickoff),teamKey(x.home),teamKey(x.away)].join('|')}
function norm(payload,diag){let arr=Array.isArray(payload)?payload:(payload?.predictions||[]),main=[],dc=[];diag.push(`TipsAudit: ${arr.length} Rohdatensätze`);for(let x of arr){if(!x||!isUpcoming(x.kickoff_utc))continue;let p=x.fair_probabilities||{},v=x.value||{},od=x.fair_odds||{};let probs={1:Number(p.home),X:Number(p.draw),2:Number(p.away)};let sel=String(v.selection||'').toLowerCase();sel=({home:'1',draw:'X',away:'2',x:'X'})[sel]||sel.toUpperCase();if(['1','X','2'].includes(sel)){let prob=probs[sel],best=Number(v.best_soft_odds);if(prob>=.6&&best>1)main.push({home:x.home,away:x.away,league:x.league||'Unbekannte Liga',kickoff:x.kickoff_utc,pick:({1:'Heimsieg',X:'Unentschieden',2:'Auswärtssieg'})[sel],prob:prob*100,source:'TipsAudit',odds:best})}
if(Object.values(probs).every(Number.isFinite)){for(let [s,label,prob] of [['1X','Heim oder Unentschieden',probs[1]+probs.X],['X2','Unentschieden oder Auswärts',probs.X+probs[2]]])if(prob>=.6)dc.push({home:x.home,away:x.away,league:x.league||'Unbekannte Liga',kickoff:x.kickoff_utc,pick:s+' · '+label,prob:prob*100,source:'TipsAudit abgeleitet'})}}
diag.push(`TipsAudit: ${main.length} 1X2-Kandidaten, ${dc.length} X1/X2-Kandidaten`);return {main,dc}}
async function skor(diag){let r=await fetch(SKOR,{headers:{Accept:'application/json'}});if(!r.ok)throw Error('Skorbot HTTP '+r.status);let p=await r.json(),a=p.matches||p||[],out=[];diag.push(`Skorbot: ${a.length} Rohspiele`);for(let m of a){if(!['scheduled','pending','not_started'].includes(String(m.status||'').toLowerCase()))continue;let k=m.kickoff||m.kickoff_utc||m.start_time;if(!isUpcoming(k))continue;let q=m.probabilities||m.prediction||{},p1=Number(q.home),px=Number(q.draw),p2=Number(q.away),sum=p1+px+p2;if(!(p1>=0&&px>=0&&p2>=0&&sum>0))continue;for(let [s,label,pb] of [['1X','Heim oder Unentschieden',(p1+px)/sum],['X2','Unentschieden oder Auswärts',(px+p2)/sum]])if(pb>=.6)out.push({home:m.home||m.home_team,away:m.away||m.away_team,league:m.competition||m.league||'Unbekannte Liga',kickoff:k,pick:s+' · '+label,prob:pb*100,source:'Skorbot'})}diag.push(`Skorbot: ${out.length} X1/X2-Kandidaten`);return out}
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
      out.push({home:names[0],away:names[1],league:[tour,event.name,groupName,c.round?.displayName].filter(Boolean).join(' · '),kickoff:start,pick:'Spielplan – keine Tippempfehlung',prob:null,source:'ESPN Spielplan'});
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

function renderFixtures(arr){
  const el=$('tennisFixtures');
  el.className='cards'+(arr.length?'':' empty');
  if(!arr.length){el.textContent='ESPN meldet derzeit keine kommenden Einzelspiele für heute. Das ist keine Aussage über alle Challenger-/ITF-Turniere.';return}
  el.innerHTML=arr.map(x=>`<article class="tip"><div class="tiptop"><span class="league">${esc(x.league)}</span><span>${fmt(x.kickoff)} Uhr</span></div><div class="teams">${esc(x.home)} – ${esc(x.away)}</div><div class="meta">Spielplan-Eintrag · keine eigene Gewinnwahrscheinlichkeit</div><span class="source">${esc(x.source)}</span></article>`).join('');
}

function render(id,arr,empty){let el=$(id);el.className='cards'+(arr.length?'':' empty');if(!arr.length){el.textContent=empty;return}el.innerHTML=arr.map(x=>`<article class="tip"><div class="tiptop"><span class="league">${esc(x.league)}</span><span>${x.kickoff?fmt(x.kickoff)+' Uhr':'Beginn nicht angegeben'}</span></div><div class="teams">${esc(x.home)} – ${esc(x.away)}</div><div class="pickrow"><span class="pick">${esc(x.pick)}</span><span class="prob">${x.prob.toFixed(1)} %</span></div>${x.odds?`<div class="meta">Erfasste Quote: ${x.odds.toFixed(2)}</div>`:''}<span class="source">${esc(x.source)}</span></article>`).join('')}
function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function eligible(arr){return dedupe(arr).filter(x=>isUpcoming(x.kickoff)).slice(0,MAX)}
async function search(){
 let b=$('searchBtn');b.disabled=true;b.textContent='Suche läuft …';$('status').className='status';$('status').textContent='Datenquellen werden abgefragt …';
 let diag=[`Abruf: ${new Date().toLocaleString('de-AT',{timeZone:TZ})}`],main=[],dc=[],tennis=[];
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
    tennis=await fetchTennis(diag);
    render('tennisList',tennis,'Keine öffentlichen TIPERO-Tennistipps mit mindestens 60 % Modellvertrauen für heute.');
    $('tennisCount').textContent=tennis.length;
    diag.push(`Tennis-Tipps: ${tennis.length}/5 öffentliche TIPERO-Tipps mit mindestens 60 %`);
    $('status').textContent=`Suchlauf abgeschlossen: ${fm.length} Fußballtipps, ${fd.length} X1/X2-Tipps, ${tennis.length} Tennistipps und ${fixtures.length} Spielplan-Einträge.`;
  }catch(e){
    render('tennisList',[],'TIPERO-Tipps derzeit nicht abrufbar. Der Spielplan wird davon unabhängig angezeigt.');
    $('tennisCount').textContent='0';
    diag.push('TIPERO Fehler: '+e.message);
    $('status').textContent=`Fußballsuche abgeschlossen: ${fm.length} Fußballtipps, ${fd.length} X1/X2-Tipps und ${fixtures.length} Tennis-Spielplan-Einträge.`;
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
