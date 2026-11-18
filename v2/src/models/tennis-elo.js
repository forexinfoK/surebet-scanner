/**
 * Surebet Scanner 2.0 – independent tennis Elo baseline.
 * ATP and WTA are strictly isolated. Input matches must be completed
 * historical records available before the target start time.
 * This module uses no bookmaker odds and performs no network requests.
 */
const MODEL_NAME="tennis-elo-baseline";
const MODEL_VERSION="0.1.0";
const DEFAULTS={kFactor:32,surfaceKFactor:24,surfaceWeight:0.3,minSurfaceMatches:5,initialRating:1500};
function validDate(value){return typeof value==="string"&&Number.isFinite(Date.parse(value))&&/(Z|[+-]\d{2}:?\d{2})$/.test(value)}
function expectedScore(ratingA,ratingB){return 1/(1+Math.pow(10,(ratingB-ratingA)/400))}
function normalizeSurface(value){const s=String(value??"").trim().toLowerCase();if(["hard","clay","grass","carpet"].includes(s))return s;return null}
function validateTarget(target){
 if(!target||!["ATP","WTA"].includes(target.tour))throw new TypeError("tour must be ATP or WTA.");
 if(!target.playerAId||!target.playerBId||String(target.playerAId)===String(target.playerBId))throw new TypeError("Two different player IDs are required.");
 if(!validDate(target.startUtc))throw new TypeError("startUtc must be timezone-aware ISO date-time.");
}
function calculateTennisElo(matches,target,options={}){
 validateTarget(target);
 const cfg={...DEFAULTS,...options};
 for(const key of ["kFactor","surfaceKFactor","initialRating"])if(!Number.isFinite(cfg[key])||cfg[key]<=0)throw new RangeError(key+" must be positive.");
 if(!Number.isFinite(cfg.surfaceWeight)||cfg.surfaceWeight<0||cfg.surfaceWeight>1)throw new RangeError("surfaceWeight must be between 0 and 1.");
 if(!Number.isInteger(cfg.minSurfaceMatches)||cfg.minSurfaceMatches<1)throw new RangeError("minSurfaceMatches must be a positive integer.");
 if(!Array.isArray(matches))throw new TypeError("matches must be an array.");
 const cutoff=Date.parse(target.startUtc),surface=normalizeSurface(target.surface);
 const history=matches.filter(m=>m&&m.status==="completed"&&m.tour===target.tour&&validDate(m.dateUtc)&&Date.parse(m.dateUtc)<cutoff&&m.winnerId&&m.loserId&&String(m.winnerId)!==String(m.loserId));
 history.sort((a,b)=>Date.parse(a.dateUtc)-Date.parse(b.dateUtc));
 const overall=new Map(),surfaceRatings=new Map(),surfaceCounts=new Map();
 const get=(map,id)=>map.has(id)?map.get(id):cfg.initialRating;
 const update=(map,winner,loser,k)=>{
  const rw=get(map,winner),rl=get(map,loser),ew=expectedScore(rw,rl);
  map.set(winner,rw+k*(1-ew));map.set(loser,rl+k*(0-(1-ew)));
 };
 for(const m of history){
  const winner=String(m.winnerId),loser=String(m.loserId);
  update(overall,winner,loser,cfg.kFactor);
  const matchSurface=normalizeSurface(m.surface);
  if(matchSurface){const key=matchSurface+"|";update(new MapProxy(surfaceRatings,key),winner,loser,cfg.surfaceKFactor);surfaceCounts.set(winner+"|"+matchSurface,(surfaceCounts.get(winner+"|"+matchSurface)||0)+1);surfaceCounts.set(loser+"|"+matchSurface,(surfaceCounts.get(loser+"|"+matchSurface)||0)+1)}
 }
 const a=String(target.playerAId),b=String(target.playerBId);
 const overallA=get(overall,a),overallB=get(overall,b);
 const surfaceA=surface&&surfaceRatings.has(surface+"|"+a)?surfaceRatings.get(surface+"|"+a):cfg.initialRating;
 const surfaceB=surface&&surfaceRatings.has(surface+"|"+b)?surfaceRatings.get(surface+"|"+b):cfg.initialRating;
 const countA=surface?(surfaceCounts.get(a+"|"+surface)||0):0,countB=surface?(surfaceCounts.get(b+"|"+surface)||0):0;
 const useSurface=countA>=cfg.minSurfaceMatches&&countB>=cfg.minSurfaceMatches;
 const ratingA=useSurface?overallA*(1-cfg.surfaceWeight)+surfaceA*cfg.surfaceWeight:overallA;
 const ratingB=useSurface?overallB*(1-cfg.surfaceWeight)+surfaceB*cfg.surfaceWeight:overallB;
 const pA=expectedScore(ratingA,ratingB);
 return {model_name:MODEL_NAME,model_version:MODEL_VERSION,tour:target.tour,start_utc:target.startUtc,surface,probabilities:{player_a:pA,player_b:1-pA},ratings:{player_a:ratingA,player_b:ratingB,overall_a:overallA,overall_b:overallB,surface_a:surfaceA,surface_b:surfaceB},data_quality:{historical_matches:history.length,player_a_surface_matches:countA,player_b_surface_matches:countB,surface_component_used:useSurface},method:"sequential Elo; tour-isolated; surface component only with minimum player sample",odds_used:false};
}
// Surface ratings are stored under a namespaced key without changing the main Elo map.
class MapProxy{
 constructor(map,prefix){this.map=map;this.prefix=prefix}
 has(id){return this.map.has(this.prefix+id)}
 get(id){return this.map.get(this.prefix+id)}
 set(id,value){this.map.set(this.prefix+id,value)}
}
export {calculateTennisElo,expectedScore,normalizeSurface,MODEL_NAME,MODEL_VERSION};
